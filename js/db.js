const sb = window.supabase.createClient(window.IMPULSE_CONFIG.supabaseUrl, window.IMPULSE_CONFIG.supabaseAnonKey);

const DB = {

  async signUp(username, name, password) {
    const fakeEmail = `${username.toLowerCase()}@impulse.local`;
    const { data, error } = await sb.auth.signUp({ email: fakeEmail, password });
    if (error) throw error;
    const userId = data.user.id;
    const { error: profileError } = await sb.from('profiles').insert({
      id: userId,
      username: username.toLowerCase(),
      display_name: name,
      bio: '',
      theme: 'violet'
    });
    if (profileError) throw profileError;
    return userId;
  },

  async signIn(username, password) {
    const fakeEmail = `${username.toLowerCase()}@impulse.local`;
    const { data, error } = await sb.auth.signInWithPassword({ email: fakeEmail, password });
    if (error) throw error;
    return data.user.id;
  },

  async signOut() {
    await sb.auth.signOut();
  },

  async getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
  },

  async getProfile(userId) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  },

  async getProfileByUsername(username) {
    const { data } = await sb.from('profiles').select('*').eq('username', username.toLowerCase()).maybeSingle();
    return data;
  },

  async searchUsers(query, excludeId) {
    const { data, error } = await sb.from('profiles')
      .select('*')
      .ilike('username', `%${query.toLowerCase()}%`)
      .neq('id', excludeId)
      .limit(12);
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, patch) {
    const { error } = await sb.from('profiles').update(patch).eq('id', userId);
    if (error) throw error;
  },

  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar_${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = sb.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadAttachment(userId, file) {
    const ext = file.name.split('.').pop();
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
    const path = `${userId}/${safeName}`;
    const { error } = await sb.storage.from('attachments').upload(path, file);
    if (error) throw error;
    const { data } = sb.storage.from('attachments').getPublicUrl(path);
    return data.publicUrl;
  },

  async getOrCreateConversation(userA, userB) {
    const [a, b] = [userA, userB].sort();
    const { data: existing } = await sb.from('conversations')
      .select('*')
      .eq('user_a', a)
      .eq('user_b', b)
      .maybeSingle();
    if (existing) return existing;
    const { data, error } = await sb.from('conversations').insert({ user_a: a, user_b: b }).select().single();
    if (error) throw error;
    return data;
  },

  async getConversationsForUser(userId) {
    const { data, error } = await sb.from('conversations')
      .select('*')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);
    if (error) throw error;
    return data;
  },

  async getMessages(conversationId, limit = 80) {
    const { data, error } = await sb.from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getLastMessage(conversationId) {
    const { data } = await sb.from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },

  async sendMessage(msg) {
    const { data, error } = await sb.from('messages').insert(msg).select().single();
    if (error) throw error;
    return data;
  },

  async markSeen(conversationId, userId) {
    await sb.from('messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('seen_at', null);
  },

  async getUnreadCount(conversationId, userId) {
    const { count } = await sb.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('seen_at', null);
    return count || 0;
  },

  subscribeToMessages(conversationId, callback) {
    return sb.channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, callback)
      .subscribe();
  },

  subscribeToConversations(userId, callback) {
    return sb.channel(`conv-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, callback)
      .subscribe();
  },

  subscribeToPresence(userId, onSync, onJoin, onLeave) {
    const channel = sb.channel('online-users', { config: { presence: { key: userId } } });
    channel.on('presence', { event: 'sync' }, onSync);
    if (onJoin) channel.on('presence', { event: 'join' }, onJoin);
    if (onLeave) channel.on('presence', { event: 'leave' }, onLeave);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });
    return channel;
  },

  subscribeToCalls(userId, callback) {
    return sb.channel(`calls-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls', filter: `callee_id=eq.${userId}` }, callback)
      .subscribe();
  },

  subscribeToOwnCalls(userId, callback) {
    return sb.channel(`calls-out-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls', filter: `caller_id=eq.${userId}` }, callback)
      .subscribe();
  },

  async createCall(callerId, calleeId, kind, peerId) {
    const { data, error } = await sb.from('calls').insert({ caller_id: callerId, callee_id: calleeId, kind, peer_id: peerId }).select().single();
    if (error) throw error;
    return data;
  },

  async updateCall(callId, patch) {
    await sb.from('calls').update(patch).eq('id', callId);
  }
};
