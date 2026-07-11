"use client";

import { useEffect, useState } from "react";
import { useRealtime } from "@/hooks/impulse/use-realtime";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/impulse/sidebar";
import { ChatArea } from "@/components/impulse/chat/chat-area";
import { SettingsModal } from "@/components/impulse/settings/settings-modal";
import { NewChatModal } from "@/components/impulse/sidebar/new-chat-modal";
import { CallOverlay } from "@/components/impulse/calls/call-overlay";
import { EmptyChatState } from "@/components/impulse/chat/empty-state";
import { Menu, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Avatar } from "@/components/impulse/avatar";
import { ImpulseLogo } from "@/components/impulse/auth/auth-screen";
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
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const activeChatId = useChatsStore((s) => s.activeChatId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeChatId) setMobileSidebar(false);
  }, [activeChatId]);

  useEffect(() => {
    const handler = () => setMobileSidebar(true);
    window.addEventListener("impulse:open-sidebar", handler);
    return () => window.removeEventListener("impulse:open-sidebar", handler);
  }, []);

  if (!profile) return null;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div
        className={`${
          mobileSidebar ? "flex" : "hidden"
        } md:flex md:w-[340px] lg:w-[380px] shrink-0 flex-col border-r border-border bg-sidebar`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-primary/30">
              <ImpulseLogo className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-semibold leading-tight">Импульс</div>
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
              <Menu className="h-5 w-5 rotate-90" />
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

      <div className="flex min-w-0 flex-1 flex-col">
        {activeChatId ? (
          <ChatArea />
        ) : (
          <EmptyChatState onOpenSidebar={() => setMobileSidebar(true)} />
        )}
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NewChatModal open={newChatOpen} onOpenChange={setNewChatOpen} />
      <CallOverlay />
    </div>
  );
}
