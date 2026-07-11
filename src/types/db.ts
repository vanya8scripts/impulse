export type ChatType = "direct" | "group";

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "voice"
  | "system"
  | "call";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "accepted" | "declined" | "ended" | "missed";

export type ThemeName = "violet" | "aurora" | "midnight" | "rose" | "emerald";
export type ColorMode = "light" | "dark";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  theme: ThemeName;
  color_mode: ColorMode;
  chat_wallpaper: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string | null;
}

export interface ChatMember {
  chat_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  muted: boolean;
  pinned: boolean;
}

export interface ChatWithDetails extends Chat {
  members: ChatMember[];
  last_message: Message | null;
  unread_count: number;
  peer?: Profile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  type: MessageType;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_mime: string | null;
  duration: number | null;
  reply_to: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  status: MessageStatus;
  sender?: Profile;
  reply_to_message?: Message;
}

export interface Call {
  id: string;
  chat_id: string;
  caller_id: string;
  type: CallType;
  status: CallStatus;
  started_at: string;
  ended_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; username: string };
        Update: Partial<Profile>;
      };
      chats: {
        Row: Chat;
        Insert: Partial<Chat> & { type: ChatType; created_by: string };
        Update: Partial<Chat>;
      };
      chat_members: {
        Row: ChatMember;
        Insert: Partial<ChatMember> & { chat_id: string; user_id: string };
        Update: Partial<ChatMember>;
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & {
          chat_id: string;
          sender_id: string;
          type: MessageType;
        };
        Update: Partial<Message>;
      };
      calls: {
        Row: Call;
        Insert: Partial<Call> & {
          chat_id: string;
          caller_id: string;
          type: CallType;
        };
        Update: Partial<Call>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      chat_type: ChatType;
      message_type: MessageType;
      call_type: CallType;
      call_status: CallStatus;
    };
  };
}
