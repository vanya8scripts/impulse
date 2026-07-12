"use client";

import { useCallback, useRef, useState } from "react";
import { registerUser, signInUser } from "@/lib/impulse";
import { isValidUsername, avatarGradient, initialsFrom } from "@/lib/format";
import { toast } from "sonner";
import {
  Camera,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Sparkles,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "login" | "register";

export function AuthScreen() {
  const [tab, setTab] = useState<Tab>("register");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickAvatar = useCallback(() => fileRef.current?.click(), []);

  const onAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Выберите изображение");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Размер фото — до 5 МБ");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    []
  );

  const clearAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const reset = () => {
    setDisplayName("");
    setUsername("");
    setPassword("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowPass(false);
  };

  const handleRegister = async () => {
    if (!displayName.trim()) return toast.error("Введите имя");
    if (!isValidUsername(username)) return toast.error("Юзернейм: 3–20 символов, латиница, цифры, _");
    if (password.length < 6) return toast.error("Пароль минимум 6 символов");
    setBusy(true);
    try {
      const email = `${username.toLowerCase()}@impulse.local`;
      await registerUser({
        email,
        password,
        username: username.toLowerCase(),
        display_name: displayName.trim(),
        avatarFile,
      });
      toast.success("Аккаунт создан. Добро пожаловать в Импульс!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка регистрации";
      if (msg.toLowerCase().includes("already")) {
        toast.error("Такой юзернейм уже занят");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    if (!isValidUsername(username)) return toast.error("Введите корректный юзернейм");
    if (!password) return toast.error("Введите пароль");
    setBusy(true);
    try {
      const email = `${username.toLowerCase()}@impulse.local`;
      await signInUser(email, password);
      toast.success("С возвращением!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка входа";
      toast.error("Неверный юзернейм или пароль");
      void msg;
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (tab === "register") handleRegister();
    else handleLogin();
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    reset();
  };

  const gradient = avatarPreview ? null : avatarGradient(username || displayName || "Импульс");

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-fuchsia-500/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 h-[360px] w-[360px] rounded-full bg-violet-500/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center p-4">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-2xl backdrop-blur-2xl lg:grid-cols-2">
          <div className="relative hidden flex-col justify-between p-10 lg:flex">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
            <div className="relative z-10 flex items-center gap-3 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <span className="text-xl font-bold tracking-tight">И</span>
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight">Импульс</div>
                <div className="text-sm text-white/80">мессенджер нового поколения</div>
              </div>
            </div>

            <div className="relative z-10 space-y-5 text-white">
              <h2 className="text-3xl font-semibold leading-tight">
                Общайся<br />без границ
              </h2>
              <p className="text-white/85 leading-relaxed max-w-sm">
                Сообщения в реальном времени, звонки, файлы и голосовые.
                Найди друзей по юзернейму за секунду.
              </p>
              <ul className="space-y-3 text-sm text-white/90">
                <FeatureRow text="Мгновенные сообщения и звонки" />
                <FeatureRow text="Файлы, фото, видео и голосовые" />
                <FeatureRow text="Поиск людей по юзернейму" />
                <FeatureRow text="Темы оформления на твой вкус" />
              </ul>
            </div>

            <div className="relative z-10 text-xs text-white/60">
              © {new Date().getFullYear()} Импульс
            </div>
          </div>

          <div className="p-7 sm:p-10">
            <div className="mb-7 flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                <span className="text-lg font-bold">И</span>
              </div>
              <span className="text-xl font-semibold">Импульс</span>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => switchTab("register")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
                  tab === "register"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserPlus className="h-4 w-4" />
                Регистрация
              </button>
              <button
                type="button"
                onClick={() => switchTab("login")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
                  tab === "login"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LogIn className="h-4 w-4" />
                Вход
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {tab === "register" && (
                <div className="flex flex-col items-center gap-3 pb-1">
                  <button
                    type="button"
                    onClick={onPickAvatar}
                    className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-all hover:border-primary"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Аватар"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "flex h-full w-full items-center justify-center bg-gradient-to-br text-white",
                          gradient
                        )}
                      >
                        <span className="text-2xl font-semibold">
                          {initialsFrom(displayName || username || "?")}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {avatarFile ? "Фото выбрано" : "Загрузить фото"}
                    </span>
                    {avatarFile && (
                      <button
                        type="button"
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
              )}

              {tab === "register" && (
                <Field
                  label="Имя"
                  icon={<User className="h-4 w-4" />}
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="Как тебя зовут"
                  maxLength={40}
                />
              )}

              <Field
                label="Юзернейм"
                icon={<Sparkles className="h-4 w-4" />}
                value={username}
                onChange={(v) => setUsername(v.replace(/\s/g, ""))}
                placeholder="username"
                autoCapitalize="none"
                autoCorrect="off"
                maxLength={20}
                hint={tab === "register" ? "Латиница, цифры, подчёркивание. 3–20 символов." : undefined}
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Пароль</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : tab === "register" ? (
                  <UserPlus className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {tab === "register" ? "Создать аккаунт" : "Войти"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {tab === "register" ? "Уже есть аккаунт? " : "Нет аккаунта? "}
              <button
                type="button"
                onClick={() => switchTab(tab === "register" ? "login" : "register")}
                className="font-medium text-primary hover:underline"
              >
                {tab === "register" ? "Войти" : "Зарегистрироваться"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
  autoCapitalize,
  autoCorrect,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  autoCapitalize?: string;
  autoCorrect?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize as React.HTMLInputModeAttribute | undefined}
          autoCorrect={autoCorrect}
          className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {text}
    </li>
  );
}
