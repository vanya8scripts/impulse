const EMOJI_LIST = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','🙄','😴','😭','😡','🥳','👍','👎','👏','🙏','💜','🔥','✨','🎉','💯','😅','🤝','🫡','😏','🥲','😱','🤯','🫶','👋','💀','🤡','😇','🤤','🫠','🤨','😤','🥺'];

const state = {
  session: null,
  profile: null,
  activeConversation: null,
  activePeer: null,
  conversations: new Map(),
  profileCache: new Map(),
  onlineUsers: new Set(),
  msgChannel: null,
  presenceChannel: null,
  callChannel: null,
  ownCallChannel: null,
  peer: null,
  currentCall: null,
  callConnection: null,
  localStream: null,
  activeCallRow: null,
  typingTimeout: null
};

const root = document.getElementById('screen-root');
const bootIcon = document.querySelector('#boot-loading .icn');
if (bootIcon) bootIcon.innerHTML = ICONS.spinner;

const ICON_TAG_MAP = {
  ICON_SETTINGS: 'settings',
  ICON_SEARCH: 'search',
  ICON_PULSE: 'pulse',
  ICON_BACK: 'back',
  ICON_PHONE: 'phone',
  ICON_VIDEO: 'video',
  ICON_ATTACH: 'attach',
  ICON_SMILE: 'smile',
  ICON_MIC: 'mic',
  ICON_SEND: 'send',
  ICON_CAMERA: 'camera',
  ICON_CAMERA_SMALL: 'camera'
};

function fillIcons(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const targets = [];
  let node;
  while ((node = walker.nextNode())) {
    const txt = node.textContent.trim();
    if (txt === 'SPINNER' || ICON_TAG_MAP[txt]) targets.push({ node, txt });
  }
  targets.forEach(({ node, txt }) => {
    const parent = node.parentElement;
    if (!parent) return;
    parent.innerHTML = txt === 'SPINNER' ? ICONS.spinner : (ICONS[ICON_TAG_MAP[txt]] || '');
  });
}

function renderAvatar(el, profile, size) {
  if (profile && profile.avatar_url) {
    el.innerHTML = `<img src="${profile.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  } else {
    const name = profile ? (profile.display_name || profile.username || '?') : '?';
    el.textContent = name.trim().slice(0, 1).toUpperCase();
  }
  el.classList.add('avatar');
  if (size) { el.style.width = size + 'px'; el.style.height = size + 'px'; }
}

function showToast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

async function boot() {
  const session = await DB.getSession();
  if (session) {
    state.session = session;
    try {
      state.profile = await DB.getProfile(session.user.id);
      applyTheme(state.profile.theme);
      renderAppScreen();
      initRealtime();
    } catch (e) {
      renderAuthScreen();
    }
  } else {
    renderAuthScreen();
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'violet');
}

function renderAuthScreen() {
  root.innerHTML = '';
  const tpl = document.getElementById('tpl-auth').content.cloneNode(true);
  root.appendChild(tpl);
  fillIcons(root);
  document.getElementById('brand-icon').innerHTML = ICONS.pulse;

  const loginPreview = document.getElementById('register-avatar-preview');
  loginPreview.innerHTML = ICONS.camera;
  document.querySelector('#register-avatar-wrap .avatar-upload-badge').innerHTML = ICONS.camera;

  const tabs = root.querySelectorAll('.auth-tab');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'login') {
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
      } else {
        formLogin.classList.add('hidden');
        formRegister.classList.remove('hidden');
      }
    });
  });

  let avatarFile = null;
  const avatarWrap = document.getElementById('register-avatar-wrap');
  const avatarInput = document.getElementById('register-avatar-input');
  avatarWrap.addEventListener('click', (e) => { e.preventDefault(); avatarInput.click(); });
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];
    if (!file) return;
    avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      const preview = document.getElementById('register-avatar-preview');
      preview.innerHTML = `<img src="${reader.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
      avatarWrap.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    const btn = document.getElementById('login-submit');
    errBox.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Входим...';
    try {
      const userId = await DB.signIn(username, password);
      state.session = await DB.getSession();
      state.profile = await DB.getProfile(userId);
      applyTheme(state.profile.theme);
      renderAppScreen();
      initRealtime();
    } catch (err) {
      console.error(err);
      errBox.textContent = 'Неверный юзернейм или пароль';
      btn.disabled = false;
      btn.textContent = 'Войти';
    }
  });

  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const username = document.getElementById('register-username').value.trim().toLowerCase();
    const password = document.getElementById('register-password').value;
    const errBox = document.getElementById('register-error');
    const btn = document.getElementById('register-submit');
    errBox.textContent = '';

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errBox.textContent = 'Юзернейм может содержать только латиницу, цифры и подчёркивание';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Создаём аккаунт...';
    try {
      const existing = await DB.getProfileByUsername(username);
      if (existing) {
        errBox.textContent = 'Этот юзернейм уже занят';
        btn.disabled = false;
        btn.textContent = 'Создать аккаунт';
        return;
      }
      const userId = await DB.signUp(username, name, password);
      if (avatarFile) {
        const url = await DB.uploadAvatar(userId, avatarFile);
        await DB.updateProfile(userId, { avatar_url: url });
      }
      state.session = await DB.getSession();
      state.profile = await DB.getProfile(userId);
      applyTheme(state.profile.theme);
      renderAppScreen();
      initRealtime();
      showToast('Добро пожаловать в Импульс');
    } catch (err) {
      console.error(err);
      if (err.message === 'EMAIL_CONFIRMATION_REQUIRED') {
        errBox.textContent = 'В проекте Supabase включено подтверждение почты. Откройте Authentication → Providers → Email и выключите Confirm email, затем попробуйте снова.';
      } else if (err.message === 'User already registered') {
        errBox.textContent = 'Этот юзернейм уже занят';
      } else if (err.message && err.message.toLowerCase().includes('row-level security')) {
        errBox.textContent = 'Профиль не сохранился из-за настроек доступа. Проверьте, что schema.sql выполнен полностью.';
      } else {
        errBox.textContent = err.message || 'Не получилось создать аккаунт, попробуйте ещё раз';
      }
      btn.disabled = false;
      btn.textContent = 'Создать аккаунт';
    }
  });
}

function renderAppScreen() {
  root.innerHTML = '';
  const tpl = document.getElementById('tpl-app').content.cloneNode(true);
  root.appendChild(tpl);
  fillIcons(root);
  document.getElementById('app-brand-icon').innerHTML = ICONS.pulse;
  document.getElementById('chat-empty').querySelector('.icn').innerHTML = ICONS.pulse;

  document.getElementById('btn-open-settings').addEventListener('click', openSettingsModal);

  const searchInput = document.getElementById('user-search');
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if (!q) {
      document.getElementById('search-results').classList.add('hidden');
      return;
    }
    searchTimer = setTimeout(() => runUserSearch(q), 250);
  });

  document.getElementById('btn-attach').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input').addEventListener('change', handleFileSelected);

  document.getElementById('btn-send').addEventListener('click', sendTextMessage);
  const messageInput = document.getElementById('message-input');
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  });
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
  });

  document.getElementById('btn-emoji').addEventListener('click', toggleEmojiPanel);
  document.getElementById('btn-voice').addEventListener('mousedown', startVoiceRecording);
  document.getElementById('btn-voice').addEventListener('mouseup', stopVoiceRecording);
  document.getElementById('btn-voice').addEventListener('mouseleave', cancelVoiceIfRecording);
  document.getElementById('btn-voice').addEventListener('touchstart', (e) => { e.preventDefault(); startVoiceRecording(); });
  document.getElementById('btn-voice').addEventListener('touchend', (e) => { e.preventDefault(); stopVoiceRecording(); });

  document.getElementById('btn-chat-back').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('away');
    document.getElementById('chat-panel').classList.remove('active');
  });

  document.getElementById('btn-call-audio').addEventListener('click', () => startOutgoingCall('audio'));
  document.getElementById('btn-call-video').addEventListener('click', () => startOutgoingCall('video'));

  loadConversationList();
}

async function runUserSearch(query) {
  const results = await DB.searchUsers(query, state.profile.id);
  const box = document.getElementById('search-results');
  if (!results.length) {
    box.innerHTML = `<div class="search-result-row"><div class="search-result-info"><div class="search-result-username">Никого не нашлось</div></div></div>`;
    box.classList.remove('hidden');
    return;
  }
  box.innerHTML = '';
  results.forEach(p => {
    const row = document.createElement('div');
    row.className = 'search-result-row';
    const av = document.createElement('div');
    renderAvatar(av, p);
    row.appendChild(av);
    const info = document.createElement('div');
    info.className = 'search-result-info';
    info.innerHTML = `<div class="search-result-name">${escapeHtml(p.display_name)}</div><div class="search-result-username">@${escapeHtml(p.username)}</div>`;
    row.appendChild(info);
    const add = document.createElement('div');
    add.className = 'search-result-add';
    add.innerHTML = ICONS.send;
    row.appendChild(add);
    row.addEventListener('click', async () => {
      document.getElementById('user-search').value = '';
      box.classList.add('hidden');
      const conv = await DB.getOrCreateConversation(state.profile.id, p.id);
      state.profileCache.set(p.id, p);
      await openConversation(conv, p.id);
      loadConversationList();
    });
    box.appendChild(row);
  });
  box.classList.remove('hidden');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

async function loadConversationList() {
  const convs = await DB.getConversationsForUser(state.profile.id);
  const list = document.getElementById('chat-list');
  list.innerHTML = '';

  const rows = [];
  for (const conv of convs) {
    const otherId = conv.user_a === state.profile.id ? conv.user_b : conv.user_a;
    let otherProfile = state.profileCache.get(otherId);
    if (!otherProfile) {
      otherProfile = await DB.getProfile(otherId);
      state.profileCache.set(otherId, otherProfile);
    }
    const lastMsg = await DB.getLastMessage(conv.id);
    const unread = await DB.getUnreadCount(conv.id, state.profile.id);
    rows.push({ conv, otherProfile, lastMsg, unread });
    state.conversations.set(conv.id, { conv, otherProfile });
  }

  rows.sort((a, b) => {
    const ta = a.lastMsg ? new Date(a.lastMsg.created_at) : new Date(a.conv.created_at);
    const tb = b.lastMsg ? new Date(b.lastMsg.created_at) : new Date(b.conv.created_at);
    return tb - ta;
  });

  if (!rows.length) {
    list.innerHTML = `<div class="empty-state" style="padding:30px 20px"><span class="icn" style="width:34px;height:34px;opacity:.4">${ICONS.user}</span><div class="empty-state-sub">Пока нет ни одного чата. Найдите собеседника по юзернейму выше.</div></div>`;
    return;
  }

  rows.forEach(({ conv, otherProfile, lastMsg, unread }) => {
    const row = document.createElement('div');
    row.className = 'chat-row';
    if (state.activeConversation && state.activeConversation.conv.id === conv.id) row.classList.add('active');
    const av = document.createElement('div');
    renderAvatar(av, otherProfile);
    row.appendChild(av);

    const body = document.createElement('div');
    body.className = 'chat-row-body';
    const top = document.createElement('div');
    top.className = 'chat-row-top';
    top.innerHTML = `<div class="chat-row-name">${escapeHtml(otherProfile.display_name)}</div><div class="chat-row-time">${lastMsg ? formatTime(lastMsg.created_at) : ''}</div>`;
    body.appendChild(top);

    const preview = document.createElement('div');
    preview.className = 'chat-row-preview';
    preview.innerHTML = previewForMessage(lastMsg);
    body.appendChild(preview);

    row.appendChild(body);

    if (unread > 0) {
      const badge = document.createElement('div');
      badge.className = 'unread-badge';
      badge.textContent = unread;
      row.appendChild(badge);
    }

    row.addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('away');
      document.getElementById('chat-panel').classList.add('active');
      openConversation(conv, otherProfile.id);
    });

    list.appendChild(row);
  });
}

function previewForMessage(msg) {
  if (!msg) return '<span>Начните переписку</span>';
  const mine = msg.sender_id === state.profile.id;
  const prefix = mine ? 'Вы: ' : '';
  switch (msg.type) {
    case 'image': return `${ICONS.image}<span>${prefix}Фото</span>`;
    case 'video': return `${ICONS.video}<span>${prefix}Видео</span>`;
    case 'file': return `${ICONS.file}<span>${prefix}${escapeHtml(msg.file_name || 'Файл')}</span>`;
    case 'voice': return `${ICONS.mic}<span>${prefix}Голосовое сообщение</span>`;
    default: return `<span>${prefix}${escapeHtml(msg.content || '')}</span>`;
  }
}

async function openConversation(conv, otherId) {
  let otherProfile = state.profileCache.get(otherId);
  if (!otherProfile) {
    otherProfile = await DB.getProfile(otherId);
    state.profileCache.set(otherId, otherProfile);
  }

  state.activeConversation = { conv, otherProfile };

  document.getElementById('chat-empty').style.display = 'none';
  const wrap = document.getElementById('chat-active-wrap');
  wrap.classList.remove('hidden');
  wrap.style.display = 'contents';

  renderAvatar(document.getElementById('chat-header-avatar'), otherProfile);
  document.getElementById('chat-header-name').textContent = otherProfile.display_name;
  updatePresenceUI(otherId);

  const messages = await DB.getMessages(conv.id);
  renderMessages(messages);
  await DB.markSeen(conv.id, state.profile.id);
  loadConversationList();

  if (state.msgChannel) state.msgChannel.unsubscribe();
  state.msgChannel = DB.subscribeToMessages(conv.id, async (payload) => {
    if (payload.eventType === 'INSERT') {
      const messages = await DB.getMessages(conv.id);
      renderMessages(messages);
      if (payload.new.sender_id !== state.profile.id) {
        await DB.markSeen(conv.id, state.profile.id);
      }
    } else {
      const messages = await DB.getMessages(conv.id);
      renderMessages(messages);
    }
    loadConversationList();
  });
}

function updatePresenceUI(userId) {
  const online = state.onlineUsers.has(userId);
  document.getElementById('chat-header-dot').classList.toggle('online', online);
  document.getElementById('chat-header-status-text').textContent = online ? 'в сети' : 'не в сети';
}

function renderMessages(messages) {
  const box = document.getElementById('messages');
  box.innerHTML = '';
  let lastDay = null;

  messages.forEach(msg => {
    const day = formatDay(msg.created_at);
    if (day !== lastDay) {
      const div = document.createElement('div');
      div.className = 'day-divider';
      div.textContent = day;
      box.appendChild(div);
      lastDay = day;
    }

    const row = document.createElement('div');
    row.className = 'msg-row' + (msg.sender_id === state.profile.id ? ' own' : '');

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = bubbleContent(msg);
    row.appendChild(bubble);
    box.appendChild(row);
  });

  box.querySelectorAll('.voice-play').forEach(btn => {
    btn.addEventListener('click', () => toggleVoicePlayback(btn));
  });
  box.querySelectorAll('.bubble-image').forEach(img => {
    img.addEventListener('click', () => window.open(img.src, '_blank'));
  });

  box.scrollTop = box.scrollHeight;
}

function bubbleContent(msg) {
  const mine = msg.sender_id === state.profile.id;
  const meta = `<div class="bubble-meta"><span>${formatTime(msg.created_at)}</span>${mine ? `<span class="icn">${msg.seen_at ? ICONS.checkDouble : ICONS.check}</span>` : ''}</div>`;

  if (msg.type === 'image') {
    return `<img class="bubble-image" src="${msg.file_url}">${meta}`;
  }
  if (msg.type === 'video') {
    return `<video class="bubble-video" src="${msg.file_url}" controls></video>${meta}`;
  }
  if (msg.type === 'file') {
    return `<div class="bubble-file"><div class="bubble-file-icon">${ICONS.file}</div><div class="bubble-file-info"><div class="bubble-file-name">${escapeHtml(msg.file_name)}</div><div class="bubble-file-size">${formatBytes(msg.file_size || 0)}</div></div><a class="bubble-file-dl" href="${msg.file_url}" download="${escapeHtml(msg.file_name)}">${ICONS.download}</a></div>${meta}`;
  }
  if (msg.type === 'voice') {
    const bars = Array.from({ length: 24 }, () => Math.floor(Math.random() * 18 + 6));
    const wave = bars.map(h => `<i style="height:${h}px"></i>`).join('');
    return `<div class="bubble-voice" data-src="${msg.file_url}"><button class="voice-play">${ICONS.play}</button><div class="voice-wave">${wave}</div><div class="voice-duration">${Math.round(msg.duration || 0)}с</div></div>${meta}`;
  }
  return `<div>${escapeHtml(msg.content)}</div>${meta}`;
}

let activeAudioEl = null;
let activeAudioBtn = null;

function toggleVoicePlayback(btn) {
  const wrap = btn.closest('.bubble-voice');
  const src = wrap.dataset.src;

  if (activeAudioEl && activeAudioBtn === btn) {
    if (activeAudioEl.paused) {
      activeAudioEl.play();
      btn.innerHTML = ICONS.pause;
    } else {
      activeAudioEl.pause();
      btn.innerHTML = ICONS.play;
    }
    return;
  }

  if (activeAudioEl) {
    activeAudioEl.pause();
    if (activeAudioBtn) activeAudioBtn.innerHTML = ICONS.play;
  }

  activeAudioEl = new Audio(src);
  activeAudioBtn = btn;
  activeAudioEl.play();
  btn.innerHTML = ICONS.pause;
  activeAudioEl.addEventListener('ended', () => { btn.innerHTML = ICONS.play; });
}

async function sendTextMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text || !state.activeConversation) return;
  input.value = '';
  input.style.height = 'auto';
  try {
    await DB.sendMessage({
      conversation_id: state.activeConversation.conv.id,
      sender_id: state.profile.id,
      type: 'text',
      content: text
    });
  } catch (e) {
    showToast('Не удалось отправить сообщение');
  }
}

async function handleFileSelected() {
  const input = document.getElementById('file-input');
  const file = input.files[0];
  if (!file || !state.activeConversation) return;
  input.value = '';

  showToast('Загружаем файл...');
  try {
    const url = await DB.uploadAttachment(state.profile.id, file);
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';

    await DB.sendMessage({
      conversation_id: state.activeConversation.conv.id,
      sender_id: state.profile.id,
      type,
      file_url: url,
      file_name: file.name,
      file_size: file.size
    });
  } catch (e) {
    showToast('Не получилось отправить файл');
  }
}

let mediaRecorder = null;
let recordedChunks = [];
let recordStartTime = null;
let recordCancelled = false;

async function startVoiceRecording() {
  if (!state.activeConversation) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    recordCancelled = false;
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      if (recordCancelled) return;
      const duration = (Date.now() - recordStartTime) / 1000;
      if (duration < 0.6) return;
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      showToast('Отправляем голосовое...');
      try {
        const url = await DB.uploadAttachment(state.profile.id, file);
        await DB.sendMessage({
          conversation_id: state.activeConversation.conv.id,
          sender_id: state.profile.id,
          type: 'voice',
          file_url: url,
          duration
        });
      } catch (e) {
        showToast('Не получилось отправить голосовое');
      }
    };
    mediaRecorder.start();
    recordStartTime = Date.now();
    document.getElementById('composer-inner').style.borderColor = 'var(--danger)';
  } catch (e) {
    showToast('Нет доступа к микрофону');
  }
}

function stopVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  document.getElementById('composer-inner').style.borderColor = '';
}

function cancelVoiceIfRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    recordCancelled = true;
    mediaRecorder.stop();
    document.getElementById('composer-inner').style.borderColor = '';
  }
}

function toggleEmojiPanel() {
  const panel = document.getElementById('emoji-panel');
  if (!panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
    return;
  }
  panel.innerHTML = '';
  EMOJI_LIST.forEach(e => {
    const btn = document.createElement('button');
    btn.textContent = e;
    btn.addEventListener('click', () => {
      const input = document.getElementById('message-input');
      input.value += e;
      input.focus();
    });
    panel.appendChild(btn);
  });
  panel.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  const panel = document.getElementById('emoji-panel');
  const btn = document.getElementById('btn-emoji');
  if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== btn) {
    panel.classList.add('hidden');
  }
  const results = document.getElementById('search-results');
  const searchInput = document.getElementById('user-search');
  if (results && !results.classList.contains('hidden') && !results.contains(e.target) && e.target !== searchInput) {
    results.classList.add('hidden');
  }
});

function openSettingsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <div class="modal-title">Настройки</div>
        <button class="icon-btn" id="settings-close">${ICONS.close}</button>
      </div>

      <div class="settings-avatar-row">
        <label class="avatar-upload" id="settings-avatar-wrap">
          <div class="avatar" id="settings-avatar-preview"></div>
          <input type="file" accept="image/*" id="settings-avatar-input" class="hidden">
          <div class="avatar-upload-badge">${ICONS.camera}</div>
        </label>
        <div class="settings-avatar-hint">Нажмите на аватар, чтобы сменить фото</div>
      </div>

      <div class="field">
        <label>Имя</label>
        <input type="text" id="settings-name" value="${escapeHtml(state.profile.display_name)}" maxlength="40">
      </div>
      <div class="field">
        <label>О себе</label>
        <textarea id="settings-bio" rows="3" maxlength="140" placeholder="Пара слов о себе">${escapeHtml(state.profile.bio || '')}</textarea>
      </div>
      <div class="field">
        <label>Юзернейм</label>
        <input type="text" value="@${escapeHtml(state.profile.username)}" disabled style="opacity:.6">
      </div>

      <div class="section-label">Тема оформления</div>
      <div class="theme-grid" id="theme-grid"></div>

      <button class="btn-primary" id="settings-save" style="margin-top:22px">Сохранить</button>
      <button class="settings-logout" id="settings-logout">${ICONS.logout}Выйти из аккаунта</button>
    </div>
  `;
  document.body.appendChild(overlay);

  renderAvatar(document.getElementById('settings-avatar-preview'), state.profile);

  const themes = [
    { id: 'violet', grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
    { id: 'midnight', grad: 'linear-gradient(135deg,#7c3aed,#3730a3)' },
    { id: 'orchid', grad: 'linear-gradient(135deg,#d946ef,#a21caf)' },
    { id: 'ultraviolet', grad: 'linear-gradient(135deg,#6366f1,#4338ca)' },
    { id: 'light', grad: 'linear-gradient(135deg,#c4b5fd,#f3f0fb)' }
  ];
  const grid = document.getElementById('theme-grid');
  let selectedTheme = state.profile.theme || 'violet';
  themes.forEach(t => {
    const sw = document.createElement('div');
    sw.className = 'theme-swatch' + (selectedTheme === t.id ? ' active' : '');
    sw.style.background = t.grad;
    sw.innerHTML = selectedTheme === t.id ? ICONS.check : '';
    sw.addEventListener('click', () => {
      selectedTheme = t.id;
      applyTheme(t.id);
      grid.querySelectorAll('.theme-swatch').forEach(s => { s.classList.remove('active'); s.innerHTML = ''; });
      sw.classList.add('active');
      sw.innerHTML = ICONS.check;
    });
    grid.appendChild(sw);
  });

  let newAvatarFile = null;
  const avatarWrap = document.getElementById('settings-avatar-wrap');
  const avatarInput = document.getElementById('settings-avatar-input');
  avatarWrap.addEventListener('click', (e) => { e.preventDefault(); avatarInput.click(); });
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];
    if (!file) return;
    newAvatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('settings-avatar-preview').innerHTML = `<img src="${reader.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('settings-close').addEventListener('click', () => {
    applyTheme(state.profile.theme);
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { applyTheme(state.profile.theme); overlay.remove(); } });

  document.getElementById('settings-save').addEventListener('click', async () => {
    const btn = document.getElementById('settings-save');
    btn.disabled = true;
    btn.textContent = 'Сохраняем...';
    try {
      const patch = {
        display_name: document.getElementById('settings-name').value.trim() || state.profile.display_name,
        bio: document.getElementById('settings-bio').value.trim(),
        theme: selectedTheme
      };
      if (newAvatarFile) {
        patch.avatar_url = await DB.uploadAvatar(state.profile.id, newAvatarFile);
      }
      await DB.updateProfile(state.profile.id, patch);
      state.profile = { ...state.profile, ...patch };
      applyTheme(state.profile.theme);
      overlay.remove();
      showToast('Настройки сохранены');
      loadConversationList();
      if (state.activeConversation) {
        renderAvatar(document.getElementById('chat-header-avatar'), state.activeConversation.otherProfile);
      }
    } catch (e) {
      showToast('Не получилось сохранить настройки');
      btn.disabled = false;
      btn.textContent = 'Сохранить';
    }
  });

  document.getElementById('settings-logout').addEventListener('click', async () => {
    await DB.signOut();
    teardownRealtime();
    location.reload();
  });
}

function initRealtime() {
  state.presenceChannel = DB.subscribeToPresence(
    state.profile.id,
    () => {
      const presenceState = state.presenceChannel.presenceState();
      state.onlineUsers = new Set(Object.keys(presenceState));
      if (state.activeConversation) updatePresenceUI(state.activeConversation.otherProfile.id);
    }
  );

  state.callChannel = DB.subscribeToCalls(state.profile.id, (payload) => {
    if (payload.eventType === 'INSERT' && payload.new.status === 'ringing') {
      handleIncomingCall(payload.new);
    }
    if (payload.eventType === 'UPDATE' && payload.new.status === 'ended') {
      if (state.currentCall && state.currentCall.id === payload.new.id) endCallUI();
    }
    if (payload.eventType === 'UPDATE' && payload.new.status === 'declined') {
      if (state.currentCall && state.currentCall.id === payload.new.id) {
        showToast('Звонок отклонён');
        endCallUI();
      }
    }
  });

  state.ownCallChannel = DB.subscribeToOwnCalls(state.profile.id, (payload) => {
    if (payload.eventType === 'UPDATE' && payload.new.status === 'accepted') {
      if (state.currentCall && state.currentCall.id === payload.new.id) connectOutgoingCall(payload.new);
    }
    if (payload.eventType === 'UPDATE' && (payload.new.status === 'ended' || payload.new.status === 'declined')) {
      if (state.currentCall && state.currentCall.id === payload.new.id) endCallUI();
    }
  });

  state.peer = new Peer(undefined, { debug: 0 });
}

function teardownRealtime() {
  if (state.msgChannel) state.msgChannel.unsubscribe();
  if (state.presenceChannel) state.presenceChannel.unsubscribe();
  if (state.callChannel) state.callChannel.unsubscribe();
  if (state.ownCallChannel) state.ownCallChannel.unsubscribe();
  if (state.peer) state.peer.destroy();
}

function ensurePeerReady() {
  return new Promise((resolve) => {
    if (state.peer && state.peer.id) return resolve(state.peer.id);
    state.peer.on('open', (id) => resolve(id));
  });
}

async function startOutgoingCall(kind) {
  if (!state.activeConversation) return;
  const peerId = await ensurePeerReady();
  const otherProfile = state.activeConversation.otherProfile;

  const call = await DB.createCall(state.profile.id, otherProfile.id, kind, peerId);
  state.currentCall = call;
  showCallOverlay(otherProfile, kind, 'Вызов...', true);
}

function handleIncomingCall(callRow) {
  if (state.currentCall) {
    DB.updateCall(callRow.id, { status: 'declined' });
    return;
  }
  state.activeCallRow = callRow;
  showIncomingToast(callRow);
}

async function showIncomingToast(callRow) {
  let profile = state.profileCache.get(callRow.caller_id);
  if (!profile) {
    profile = await DB.getProfile(callRow.caller_id);
    state.profileCache.set(callRow.caller_id, profile);
  }
  const toast = document.createElement('div');
  toast.className = 'incoming-call-toast';
  toast.id = 'incoming-toast';
  const av = document.createElement('div');
  renderAvatar(av, profile);
  av.style.width = '46px'; av.style.height = '46px';
  toast.appendChild(av);
  const info = document.createElement('div');
  info.style.flex = '1';
  info.innerHTML = `<div style="font-weight:650">${escapeHtml(profile.display_name)}</div><div style="font-size:12.5px;color:var(--text-faint)">${callRow.kind === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}</div>`;
  toast.appendChild(info);
  const actions = document.createElement('div');
  actions.className = 'incoming-call-actions';
  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'call-btn';
  acceptBtn.style.background = 'var(--success)';
  acceptBtn.innerHTML = ICONS.phone;
  const declineBtn = document.createElement('button');
  declineBtn.className = 'call-btn danger';
  declineBtn.innerHTML = ICONS.hangup;
  actions.appendChild(acceptBtn);
  actions.appendChild(declineBtn);
  toast.appendChild(actions);
  document.body.appendChild(toast);

  acceptBtn.addEventListener('click', async () => {
    toast.remove();
    await acceptIncomingCall(callRow, profile);
  });
  declineBtn.addEventListener('click', async () => {
    toast.remove();
    await DB.updateCall(callRow.id, { status: 'declined' });
    state.activeCallRow = null;
  });

  setTimeout(() => { if (document.getElementById('incoming-toast')) { toast.remove(); DB.updateCall(callRow.id, { status: 'declined' }); } }, 30000);
}

async function acceptIncomingCall(callRow, profile) {
  state.currentCall = callRow;
  await DB.updateCall(callRow.id, { status: 'accepted' });
  showCallOverlay(profile, callRow.kind, 'Соединение...', false);

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callRow.kind === 'video' });
  state.localStream = stream;
  const localVideo = document.getElementById('call-video-local');
  if (localVideo) localVideo.srcObject = stream;

  const call = state.peer.call(callRow.peer_id, stream);
  state.callConnection = call;
  call.on('stream', (remoteStream) => {
    document.getElementById('call-status').textContent = 'На связи';
    const remoteVideo = document.getElementById('call-video-remote');
    if (remoteVideo) remoteVideo.srcObject = remoteStream;
  });
  call.on('close', () => endCallUI());
}

async function connectOutgoingCall(callRow) {
  document.getElementById('call-status').textContent = 'Соединение...';
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callRow.kind === 'video' });
  state.localStream = stream;
  const localVideo = document.getElementById('call-video-local');
  if (localVideo) localVideo.srcObject = stream;

  state.peer.once('call', (incoming) => {
    incoming.answer(stream);
    state.callConnection = incoming;
    incoming.on('stream', (remoteStream) => {
      document.getElementById('call-status').textContent = 'На связи';
      const remoteVideo = document.getElementById('call-video-remote');
      if (remoteVideo) remoteVideo.srcObject = remoteStream;
    });
    incoming.on('close', () => endCallUI());
  });
}

function showCallOverlay(profile, kind, status, isCaller) {
  const overlay = document.createElement('div');
  overlay.className = 'call-overlay';
  overlay.id = 'call-overlay';

  overlay.innerHTML = `
    <div class="call-videos">
      <video class="call-video-remote" id="call-video-remote" autoplay playsinline></video>
      <video class="call-video-local" id="call-video-local" autoplay playsinline muted></video>
    </div>
    <div class="call-info">
      <div class="avatar" id="call-avatar"></div>
      <div class="call-name">${escapeHtml(profile.display_name)}</div>
      <div class="call-status" id="call-status">${status}</div>
    </div>
    <div class="call-controls">
      <button class="call-btn" id="call-toggle-mic">${ICONS.mic}</button>
      ${kind === 'video' ? `<button class="call-btn" id="call-toggle-video">${ICONS.video}</button>` : ''}
      <button class="call-btn danger" id="call-hangup">${ICONS.hangup}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  renderAvatar(document.getElementById('call-avatar'), profile, 110);

  if (kind !== 'video') {
    document.getElementById('call-video-local').style.display = 'none';
    document.getElementById('call-video-remote').style.display = 'none';
  }

  let micOn = true;
  let camOn = true;

  document.getElementById('call-toggle-mic').addEventListener('click', () => {
    micOn = !micOn;
    if (state.localStream) state.localStream.getAudioTracks().forEach(t => t.enabled = micOn);
    document.getElementById('call-toggle-mic').classList.toggle('active-off', !micOn);
    document.getElementById('call-toggle-mic').innerHTML = micOn ? ICONS.mic : ICONS.micOff;
  });

  const videoBtn = document.getElementById('call-toggle-video');
  if (videoBtn) {
    videoBtn.addEventListener('click', () => {
      camOn = !camOn;
      if (state.localStream) state.localStream.getVideoTracks().forEach(t => t.enabled = camOn);
      videoBtn.classList.toggle('active-off', !camOn);
      videoBtn.innerHTML = camOn ? ICONS.video : ICONS.videoOff;
    });
  }

  document.getElementById('call-hangup').addEventListener('click', async () => {
    if (state.currentCall) await DB.updateCall(state.currentCall.id, { status: 'ended', ended_at: new Date().toISOString() });
    endCallUI();
  });
}

function endCallUI() {
  if (state.localStream) {
    state.localStream.getTracks().forEach(t => t.stop());
    state.localStream = null;
  }
  if (state.callConnection) {
    state.callConnection.close();
    state.callConnection = null;
  }
  const overlay = document.getElementById('call-overlay');
  if (overlay) overlay.remove();
  const toast = document.getElementById('incoming-toast');
  if (toast) toast.remove();
  state.currentCall = null;
  state.activeCallRow = null;
}

boot();
