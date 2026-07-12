"use client";

import { supabase } from "@/lib/supabase";
import type {
  CallType,
  Chat,
  ChatMember,
  ChatWithDetails,
  Message,
  MessageType,
  Profile,
} from "@/types/db";
import { avatarGradient, cn } from "@/lib/format";

const AVATAR_BUCKET = "avatars";
const ATTACHMENT_BUCKET = "attachments";

const MAX_DATAURL_BYTES = 600 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

async function isBucketAvailable(name: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.from(name).list("", { limit: 1 });
    if (error) return false;
    void data;
    return true;
  } catch {
    return false;
  }
}

export async function uploadAvatar(userId: string, file: File) {
  void userId;
  const bucketOk = await isBucketAvailable(AVATAR_BUCKET);
  if (bucketOk) {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (!error) {
        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        return data.publicUrl;
      }
    } catch {
      /* fallback ниже */
    }
  }
  return fileToDataUrl(file);
}

export async function uploadAttachment(
  userId: string,
  file: File,
  folder = "media"
) {
  const bucketOk = await isBucketAvailable(ATTACHMENT_BUCKET);
  if (bucketOk) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${folder}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, { cacheControl: "3600", contentType: file.type });
      if (!error) {
        const { data } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);
        return { url: data.publicUrl, path };
      }
    } catch {
      /* fallback ниже */
    }
  }
  if (file.size > MAX_DATAURL_BYTES) {
    throw new Error("storage-not-configured");
  }
  const url = await fileToDataUrl(file);
  return { url, path: null };
}

export async function registerUser(input: {
  email: string;
  password: string;
  username: string;
  display_name: string;
  avatarFile?: File | null;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username.toLowerCase(),
        display_name: input.display_name,
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Не удалось создать аккаунт");

  const profileId = data.user.id;
  let avatarUrl: string | null = null;
  if (input.avatarFile) {
    try {
      avatarUrl = await uploadAvatar(profileId, input.avatarFile);
    } catch {
      /* продолжаем без аватара */
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: profileId,
    username: input.username.toLowerCase(),
    display_name: input.display_name,
    avatar_url: avatarUrl,
  });
  if (profileError) throw profileError;

  return data;
}

export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function searchProfilesByUsername(query: string, exceptId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `%${query.toLowerCase()}%`)
    .neq("id", exceptId)
    .limit(10);
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function findOrCreateDirectChat(
  meId: string,
  peerId: string
): Promise<string> {
  // Пытаемся через серверную RPC-функцию (security definer, обходит RLS)
  const { data: rpcId, error: rpcErr } = await supabase.rpc("create_direct_chat", {
    peer_id: peerId,
  });
  if (!rpcErr && rpcId) {
    return rpcId as string;
  }

  // Fallback: клиентская логика
  const { data: memberships, error: mErr } = await supabase
    .from("chat_members")
    .select("chat_id")
    .eq("user_id", meId);
  if (mErr) throw mErr;

  const myChatIds = (memberships || []).map((m) => (m as { chat_id: string }).chat_id);
  if (myChatIds.length) {
    const { data: peerMemberships, error: pErr } = await supabase
      .from("chat_members")
      .select("chat_id, chat:chats(id, type)")
      .in("chat_id", myChatIds)
      .eq("user_id", peerId);
    if (pErr) throw pErr;
    const existing = (peerMemberships || [])
      .map((row) => row as { chat_id: string; chat: { id: string; type: string } | null })
      .find((row) => row.chat && row.chat.type === "direct");
    if (existing) return existing.chat_id;
  }

  const { data: chatRow, error: cErr } = await supabase
    .from("chats")
    .insert({ type: "direct", created_by: meId })
    .select()
    .single();
  if (cErr) throw cErr;
  const chat = chatRow as Chat;

  const members: ChatMember[] = [
    { chat_id: chat.id, user_id: meId, role: "owner", joined_at: new Date().toISOString(), muted: false, pinned: false },
    { chat_id: chat.id, user_id: peerId, role: "member", joined_at: new Date().toISOString(), muted: false, pinned: false },
  ];
  const { error: memberErr } = await supabase.from("chat_members").insert(members);
  if (memberErr) throw memberErr;
  return chat.id;
}

export async function fetchChatsForUser(userId: string): Promise<ChatWithDetails[]> {
  const { data: memberships, error: mErr } = await supabase
    .from("chat_members")
    .select(
      "chat_id, role, joined_at, muted, pinned, last_read_at, chat:chats(*)"
    )
    .eq("user_id", userId);
  if (mErr) throw mErr;

  const rows = (memberships || []) as Array<{
    chat_id: string;
    role: string;
    joined_at: string;
    muted: boolean;
    pinned: boolean;
    last_read_at: string | null;
    chat: Chat;
  }>;

  if (rows.length === 0) return [];

  const chatIds = rows.map((r) => r.chat_id);

  const { data: allMembers } = await supabase
    .from("chat_members")
    .select("chat_id, user_id")
    .in("chat_id", chatIds);
  const memberRows = (allMembers || []) as ChatMember[];

  const peerIds = Array.from(
    new Set(
      memberRows
        .filter((m) => m.user_id !== userId)
        .map((m) => m.user_id)
    )
  );
  const { data: peers } = await supabase
    .from("profiles")
    .select("*")
    .in("id", peerIds);
  const peerMap = new Map<string, Profile>(
    ((peers || []) as Profile[]).map((p) => [p.id, p])
  );

  const { data: lastMessages } = await supabase
    .from("messages")
    .select("*")
    .in("chat_id", chatIds)
    .order("created_at", { ascending: false })
    .limit(1, { foreignTable: "messages" });
  void lastMessages;

  const result: ChatWithDetails[] = [];
  for (const row of rows) {
    const chatMembers = memberRows.filter((m) => m.chat_id === row.chat_id);
    let peer: Profile | undefined;
    if (row.chat.type === "direct") {
      const peerMember = chatMembers.find((m) => m.user_id !== userId);
      if (peerMember) peer = peerMap.get(peerMember.user_id);
    }

    const { data: lastMsg } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", row.chat_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let unreadQuery = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("chat_id", row.chat_id)
      .neq("sender_id", userId);
    if (row.last_read_at) {
      unreadQuery = unreadQuery.gt("created_at", row.last_read_at);
    }
    const { count } = await unreadQuery;

    result.push({
      ...row.chat,
      members: chatMembers,
      last_message: (lastMsg as Message) || null,
      unread_count: count || 0,
      peer,
      pinned: row.pinned,
      muted: row.muted,
    } as ChatWithDetails);
  }

  result.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const aTime = a.last_message_at || a.created_at;
    const bTime = b.last_message_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return result;
}

export async function fetchMessages(chatId: string, limit = 100) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Message[];
}

export async function fetchProfilesByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function sendMessage(input: {
  chatId: string;
  senderId: string;
  content?: string | null;
  type: MessageType;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentMime?: string | null;
  duration?: number | null;
  replyTo?: string | null;
}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_id: input.chatId,
      sender_id: input.senderId,
      content: input.content ?? null,
      type: input.type,
      attachment_url: input.attachmentUrl ?? null,
      attachment_name: input.attachmentName ?? null,
      attachment_size: input.attachmentSize ?? null,
      attachment_mime: input.attachmentMime ?? null,
      duration: input.duration ?? null,
      reply_to: input.replyTo ?? null,
      status: "sent",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function editMessage(messageId: string, content: string) {
  const { data, error } = await supabase
    .from("messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), content: null, attachment_url: null })
    .eq("id", messageId);
  if (error) throw error;
}

export async function markChatRead(chatId: string, userId: string) {
  const now = new Date().toISOString();
  await supabase
    .from("chat_members")
    .update({ last_read_at: now })
    .eq("chat_id", chatId)
    .eq("user_id", userId);

  await supabase
    .from("messages")
    .update({ status: "read" })
    .eq("chat_id", chatId)
    .neq("sender_id", userId)
    .neq("status", "read");
}

export async function fetchUnreadCount(chatId: string, userId: string, lastReadAt: string | null) {
  let query = supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("chat_id", chatId)
    .neq("sender_id", userId);
  if (lastReadAt) {
    query = query.gt("created_at", lastReadAt);
  }
  const { count } = await query;
  return count || 0;
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateLastSeen(userId: string) {
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function createCallRecord(chatId: string, callerId: string, type: CallType) {
  const { data, error } = await supabase
    .from("calls")
    .insert({ chat_id: chatId, caller_id: callerId, type, status: "ringing" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCallStatus(callId: string, status: "accepted" | "declined" | "ended" | "missed") {
  const patch: Record<string, unknown> = { status };
  if (status === "ended" || status === "missed")
    patch.ended_at = new Date().toISOString();
  const { error } = await supabase.from("calls").update(patch).eq("id", callId);
  if (error) throw error;
}

export async function toggleChatPinned(chatId: string, userId: string, pinned: boolean) {
  await supabase
    .from("chat_members")
    .update({ pinned })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
}

export async function toggleChatMuted(chatId: string, userId: string, muted: boolean) {
  await supabase
    .from("chat_members")
    .update({ muted })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
}

export async function createChannel(title: string, description?: string, avatarUrl?: string) {
  const { data, error } = await supabase.rpc("create_channel", {
    p_title: title,
    p_description: description || null,
    p_avatar_url: avatarUrl || null,
  });
  if (error) throw error;
  return data as string;
}

export async function createGroup(title: string, description?: string, avatarUrl?: string) {
  const { data, error } = await supabase.rpc("create_group", {
    p_title: title,
    p_description: description || null,
    p_avatar_url: avatarUrl || null,
  });
  if (error) throw error;
  return data as string;
}

export async function subscribeToChat(chatId: string) {
  const { error } = await supabase.rpc("subscribe_to_chat", { p_chat_id: chatId });
  if (error) throw error;
  return true;
}

export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function adminBlockUser(userId: string, reason: string) {
  const { error } = await supabase.rpc("admin_block_user", {
    p_user_id: userId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function adminUnblockUser(userId: string) {
  const { error } = await supabase.rpc("admin_unblock_user", { p_user_id: userId });
  if (error) throw error;
}

export async function adminMuteUser(userId: string, reason: string, hours: number) {
  const { error } = await supabase.rpc("admin_mute_user", {
    p_user_id: userId,
    p_reason: reason,
    p_hours: hours,
  });
  if (error) throw error;
}

export async function adminUnmuteUser(userId: string) {
  const { error } = await supabase.rpc("admin_unmute_user", { p_user_id: userId });
  if (error) throw error;
}

export async function adminSetVerified(userId: string, verified: boolean) {
  const { error } = await supabase.rpc("admin_set_verified", {
    p_user_id: userId,
    p_verified: verified,
  });
  if (error) throw error;
}

export async function changePasswordWithCurrent(
  currentPassword: string,
  newPassword: string
) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) throw new Error("Нет данных пользователя");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  });
  if (signInError) throw new Error("Неверный текущий пароль");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOutAllOtherSessions() {
  await supabase.auth.signOut({ scope: "others" });
}

export async function fetchActiveSessions() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export { avatarGradient, cn };
