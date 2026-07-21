"use client";

import { useEffect, useState } from "react";
import { useRealtime } from "@/hooks/impulse/use-realtime";
import { useOfflineMode } from "@/hooks/impulse/use-offline";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/impulse/sidebar";
import { ChatArea } from "@/components/impulse/chat/chat-area";
import { SettingsModal } from "@/components/impulse/settings/settings-modal";
import { NewChatModal } from "@/components/impulse/sidebar/new-chat-modal";
import { CallOverlay } from "@/components/impulse/calls/call-overlay";
import { EmptyChatState } from "@/components/impulse/chat/empty-state";
import { AdminPanel } from "@/components/impulse/admin/admin-panel";
import { Menu, Settings as SettingsIcon, LogOut, Shield, X, Gamepad2, WifiOff } from "lucide-react";
import { Avatar } from "@/components/impulse/avatar";
import { GamesModal } from "@/components/impulse/games/games-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Messenger() {
  useRealtime();
  const { online, queueCount } = useOfflineMode();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const activeChatId = useChatsStore((s) => s.activeChatId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useEffect(() => {
    
    if (activeChatId) setMobileSidebar(false);
  }, [activeChatId]);

  useEffect(() => {
    const handler = () => setMobileSidebar(true);
    window.addEventListener("impulse:open-sidebar", handler);
    return () => window.removeEventListener("impulse:open-sidebar", handler);
  }, []);

  if (!profile) return null;

  const isAdmin = profile.is_admin || profile.username.toLowerCase() === "vanya";

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background flex-col">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-orange-500/90 px-4 py-1.5 text-sm font-medium text-white">
          <WifiOff className="h-4 w-4" />
          Нет подключения к интернету
          {queueCount > 0 && <span className="opacity-80">· {queueCount} в очереди</span>}
        </div>
      )}
      {online && queueCount > 0 && (
        <div className="flex items-center justify-center gap-2 bg-primary/90 px-4 py-1.5 text-sm font-medium text-primary-foreground">
          Отправка {queueCount} сообщений из очереди…
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
      <div
        className={`${
          mobileSidebar ? "flex" : "hidden"
        } md:flex md:w-[340px] lg:w-[380px] shrink-0 flex-col border-r border-border bg-sidebar fixed md:relative inset-0 z-30 md:z-auto`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div>
              <div className="text-lg font-bold leading-tight tracking-tight">Импульс</div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                онлайн
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setMobileSidebar(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full transition-opacity hover:opacity-80">
                  <Avatar profile={profile} size="sm" online />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-medium">{profile.display_name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    @{profile.username}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => setAdminOpen(true)}>
                    <Shield className="mr-2 h-4 w-4" />
                    Админ-панель
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setGamesOpen(true)}>
                  <Gamepad2 className="mr-2 h-4 w-4" />
                  Игры
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Sidebar onNewChat={() => setNewChatOpen(true)} />
      </div>

      {mobileSidebar && (
        <button
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {activeChatId ? (
          <ChatArea />
        ) : (
          <EmptyChatState onOpenSidebar={() => setMobileSidebar(true)} />
        )}
      </div>

      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NewChatModal open={newChatOpen} onOpenChange={setNewChatOpen} />
      {isAdmin && <AdminPanel open={adminOpen} onOpenChange={setAdminOpen} />}
      <GamesModal open={gamesOpen} onOpenChange={setGamesOpen} />
      <CallOverlay />
    </div>
  );
}

void Menu;
