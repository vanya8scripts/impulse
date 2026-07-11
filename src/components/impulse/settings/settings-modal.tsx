"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";
import { useTheme } from "@/components/impulse/theme-provider";
import { updateProfile, uploadAvatar } from "@/lib/impulse";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/impulse/avatar";
import {
  Camera,
  Check,
  Loader2,
  Moon,
  Sun,
  User,
  AtSign,
  Info,
  Palette,
  Shield,
  LogOut,
  X,
} from "lucide-react";
import type { ColorMode, ThemeName } from "@/types/db";
import { isValidUsername, cn } from "@/lib/format";
import { toast } from "sonner";

type Tab = "profile" | "appearance" | "security";

const THEMES: { id: ThemeName; name: string; from: string; to: string }[] = [
  { id: "violet", name: "Аметист", from: "from-violet-500", to: "to-fuchsia-500" },
  { id: "aurora", name: "Аврора", from: "from-fuchsia-500", to: "to-pink-500" },
  { id: "midnight", name: "Полночь", from: "from-indigo-500", to: "to-violet-600" },
  { id: "rose", name: "Закат", from: "from-rose-500", to: "to-orange-500" },
  { id: "emerald", name: "Изумруд", from: "from-emerald-500", to: "to-teal-500" },
];

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const { theme, mode, setTheme, setMode } = useTheme();
  const [tab, setTab] = useState<Tab>("profile");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.display_name);
      setUsername(profile.username);
      setBio(profile.bio || "");
      setAvatarPreview(profile.avatar_url);
      setAvatarFile(null);
      if (profile.theme) setTheme(profile.theme);
      if (profile.color_mode) setMode(profile.color_mode);
    }
  }, [open, profile, setTheme, setMode]);

  if (!profile) return null;

  const onAvatarPick = () => fileRef.current?.click();
  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Выберите изображение");
    if (file.size > 5 * 1024 * 1024) return toast.error("До 5 МБ");
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearAvatar = async () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const saveProfile = async () => {
    if (!displayName.trim()) return toast.error("Введите имя");
    if (!isValidUsername(username)) return toast.error("Некорректный юзернейм");
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(profile.id, avatarFile);
      } else if (!avatarPreview) {
        avatarUrl = null;
      }
      const updated = await updateProfile(profile.id, {
        display_name: displayName.trim(),
        username: username.toLowerCase(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        theme,
        color_mode: mode,
      });
      setProfile(updated);
      toast.success("Профиль обновлён");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      if (msg.toLowerCase().includes("username") || msg.toLowerCase().includes("unique"))
        toast.error("Этот юзернейм занят");
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) return toast.error("Минимум 6 символов");
    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      toast.success("Пароль изменён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Настройки</DialogTitle>
        <div className="flex h-[560px] max-h-[85vh]">
          <div className="hidden w-48 shrink-0 flex-col border-r border-border bg-sidebar/50 p-2 sm:flex">
            <div className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Настройки
            </div>
            <TabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={<User className="h-4 w-4" />}>
              Профиль
            </TabButton>
            <TabButton active={tab === "appearance"} onClick={() => setTab("appearance")} icon={<Palette className="h-4 w-4" />}>
              Оформление
            </TabButton>
            <TabButton active={tab === "security"} onClick={() => setTab("security")} icon={<Shield className="h-4 w-4" />}>
              Безопасность
            </TabButton>
            <div className="mt-auto">
              <TabButton active={false} onClick={() => signOut()} icon={<LogOut className="h-4 w-4" />}>
                Выйти
              </TabButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <div className="flex items-center gap-1 border-b border-border p-2 sm:hidden">
              <TabPill active={tab === "profile"} onClick={() => setTab("profile")}>Профиль</TabPill>
              <TabPill active={tab === "appearance"} onClick={() => setTab("appearance")}>Оформление</TabPill>
              <TabPill active={tab === "security"} onClick={() => setTab("security")}>Безопасность</TabPill>
            </div>

            <div className="p-5 sm:p-6">
              {tab === "profile" && (
                <div className="space-y-5">
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={onAvatarPick}
                      className="group relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-primary/30"
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Аватар" className="h-full w-full object-cover" />
                      ) : (
                        <Avatar name={displayName} seed={username} size="xl" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onAvatarPick}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Сменить фото
                      </button>
                      {avatarPreview && (
                        <button
                          onClick={clearAvatar}
                          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={onAvatarChange}
                      className="hidden"
                    />
                  </div>

                  <Field label="Имя" icon={<User className="h-4 w-4" />} value={displayName} onChange={setDisplayName} maxLength={40} />
                  <Field
                    label="Юзернейм"
                    icon={<AtSign className="h-4 w-4" />}
                    value={username}
                    onChange={(v) => setUsername(v.replace(/\s/g, "").toLowerCase())}
                    maxLength={20}
                    hint="Латиница, цифры, подчёркивание. 3–20 символов."
                  />
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      О себе
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={140}
                      rows={3}
                      placeholder="Расскажи о себе"
                      className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                    <div className="text-right text-xs text-muted-foreground">{bio.length}/140</div>
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Сохранить
                  </button>
                </div>
              )}

              {tab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-sm font-medium">Режим</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <ModeCard active={mode === "light"} onClick={() => setMode("light")} icon={<Sun className="h-5 w-5" />} label="Светлый" />
                      <ModeCard active={mode === "dark"} onClick={() => setMode("dark")} icon={<Moon className="h-5 w-5" />} label="Тёмный" />
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-medium">Акцентный цвет</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-xl border-2 p-3 transition-all",
                            theme === t.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          <span className={cn("h-8 w-8 rounded-lg bg-gradient-to-br", t.from, t.to)} />
                          <span className="text-sm font-medium">{t.name}</span>
                          {theme === t.id && (
                            <Check className="ml-auto h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Тема применяется мгновенно и сохраняется в твоём профиле —
                    на всех устройствах, где ты войдёшь.
                  </div>
                </div>
              )}

              {tab === "security" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-1 text-sm font-medium">Смена пароля</h3>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Пароль используется для входа по юзернейму.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Новый пароль"
                        className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <button
                        onClick={changePassword}
                        disabled={changingPass || newPassword.length < 6}
                        className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        {changingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        Изменить
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="mb-2 text-sm font-medium">Сессия</div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div>ID: <span className="font-mono">{profile.id.slice(0, 8)}…</span></div>
                      <div>Юзернейм: @{profile.username}</div>
                      <div>
                        В Импульсе с{" "}
                        {new Date(profile.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      signOut();
                      onOpenChange(false);
                    }}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти из аккаунта
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors",
        active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  maxLength,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 p-3 transition-all",
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      )}
    >
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
      {active && <Check className="ml-auto h-4 w-4 text-primary" />}
    </button>
  );
}
