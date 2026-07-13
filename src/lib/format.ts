export function classList(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-purple-500 to-indigo-500",
  "from-fuchsia-500 to-pink-500",
  "from-indigo-500 to-violet-500",
  "from-violet-600 to-purple-600",
  "from-pink-500 to-rose-500",
];

export function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateDivider(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  if (diff < 7) return d.toLocaleDateString("ru-RU", { weekday: "long" });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function formatLastSeen(iso: string | null) {
  if (!iso) return "был(а) давно";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "был(а) только что";
  if (diff < 3600) return `был(а) ${Math.floor(diff / 60)} мин назад`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (dayDiff === 0)
    return `был(а) в ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  if (dayDiff === 1) return "был(а) вчера";
  if (dayDiff < 7) return `был(а) ${dayDiff} дн. назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/i.test(username);
}

export function isAudioMime(mime: string | null) {
  return Boolean(mime && mime.startsWith("audio/"));
}

export function isImageMime(mime: string | null) {
  return Boolean(mime && mime.startsWith("image/"));
}

export function isVideoMime(mime: string | null) {
  return Boolean(mime && mime.startsWith("video/"));
}

export function displayName(profile: { display_name: string; is_blocked?: boolean; is_scam?: boolean } | null | undefined): string {
  if (!profile) return "Пользователь";
  if (profile.is_scam) return "СКАЗ · заблокирован";
  if (profile.is_blocked) return "Аккаунт заблокирован";
  return profile.display_name;
}

export function blockStatus(profile: { is_blocked?: boolean; is_scam?: boolean; block_reason?: string | null; scam_reason?: string | null } | null | undefined): { type: "scam" | "blocked" | null; reason: string | null } {
  if (!profile) return { type: null, reason: null };
  if (profile.is_scam) return { type: "scam", reason: profile.scam_reason };
  if (profile.is_blocked) return { type: "blocked", reason: profile.block_reason };
  return { type: null, reason: null };
}
