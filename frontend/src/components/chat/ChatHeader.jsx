import { Avatar, Button, Dropdown, Input } from "@heroui/react";
import {
  ChevronLeftIcon,
  ImageIcon,
  MoreVerticalIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldOffIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppLogo } from "../AppLogo";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";
import { MediaGallery } from "./MediaGallery";

import { ThemePresetPicker } from "../ThemePresetPicker";

import { ThemeToggle } from "../ThemeToggle";
import { WallpaperPicker } from "../WallpaperPicker";

import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";

export function ChatHeader() {
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setSoundEnabled = useChatStore((state) => state.setSoundEnabled);
  const searchMessages = useChatStore((state) => state.searchMessages);
  const clearSearchResults = useChatStore((state) => state.clearSearchResults);
  const isSearching = useChatStore((state) => state.isSearching);
  const isPeerTyping = useChatStore((state) => state.isPeerTyping);
  const blockUser = useChatStore((state) => state.blockUser);
  const unblockUser = useChatStore((state) => state.unblockUser);

  const { activeConversation, isLargeScreen, activeConversationId } = useSelectedConversation();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    setShowSearch(false);
    setSearchQuery("");
    clearSearchResults();
  }, [activeConversationId, clearSearchResults]);

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.trim()) {
      searchDebounceRef.current = setTimeout(() => {
        searchMessages(activeConversationId, value);
      }, 300);
    } else {
      clearSearchResults();
    }
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
    clearSearchResults();
  };

  return (
    <header className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-1.5 py-1.5 sm:gap-2 sm:px-2 sm:py-2">
      {activeConversation && !isLargeScreen ? (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="shrink-0"
          onPress={() => setActiveConversationId(null)}
        >
          <ChevronLeftIcon className="size-6" strokeWidth={2.25} />
        </Button>
      ) : null}

      {showSearch ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            fullWidth
            variant="secondary"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="shrink-0"
            onPress={closeSearch}
          >
            <XIcon className="size-5" />
          </Button>
        </div>
      ) : activeConversation ? (
        <>
          <AvatarWithOnlineIndicator isOnline={activeConversation.peer.isOnline ?? false}>
            <Avatar className="size-9 shrink-0">
              <Avatar.Image
                alt={activeConversation.peer.name}
                src={activeConversation.peer.avatarUrl}
              />
              <Avatar.Fallback className="text-sm font-medium">
                {activeConversation.peer.initials}
              </Avatar.Fallback>
            </Avatar>
          </AvatarWithOnlineIndicator>

          <div className="flex-1 text-center sm:text-left">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {activeConversation.peer.name}
            </p>
            <p className="truncate text-xs text-muted">
              {isPeerTyping ? (
                <span className="font-medium italic text-accent">Typing...</span>
              ) : activeConversation.peer.isOnline ? (
                <span className="font-medium text-success">Online</span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center gap-2.5 sm:text-left">
          <AppLogo size={36} className="rounded-[9px]" />
          <div className="flex-1 text-center sm:text-left">
            <p className="truncate text-[13px] font-medium text-muted">Select a conversation</p>
          </div>
        </div>
      )}

      <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-0.5 sm:gap-1">
        <div className="hidden min-[400px]:contents">
          {activeConversation && !showSearch ? (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className="shrink-0"
              onPress={() => setShowSearch(true)}
            >
              <SearchIcon className="size-5" strokeWidth={2} />
            </Button>
          ) : null}
          {activeConversation ? (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className="shrink-0"
              aria-label="Media gallery"
              onPress={() => setShowMediaGallery(true)}
            >
              <ImageIcon className="size-5" strokeWidth={2} />
            </Button>
          ) : null}
          <WallpaperPicker />
          <ThemePresetPicker />
        </div>

        <ThemeToggle />

        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="shrink-0"
          aria-pressed={isSoundEnabled}
          onPress={() => setSoundEnabled(!isSoundEnabled)}
        >
          {isSoundEnabled ? (
            <Volume2Icon className="size-5.5" strokeWidth={2} aria-hidden />
          ) : (
            <VolumeXIcon className="size-5.5" strokeWidth={2} aria-hidden />
          )}
        </Button>

        {activeConversation && !showSearch ? (
          <>
            <Dropdown.Root>
              <Dropdown.Trigger>
                <Button
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  className="shrink-0"
                  aria-label="More options"
                >
                  <MoreVerticalIcon className="size-5.5" strokeWidth={2} />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu onAction={(key) => {
                  if (key === "block") {
                    blockUser(activeConversationId);
                  } else if (key === "unblock") {
                    unblockUser(activeConversationId);
                  }
                }}>
                  <Dropdown.Item id="block" textValue="Block User">
                    <ShieldAlertIcon className="size-4" />
                    Block User
                  </Dropdown.Item>
                  <Dropdown.Item id="unblock" textValue="Unblock User">
                    <ShieldOffIcon className="size-4" />
                    Unblock User
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.Root>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className="shrink-0"
              aria-label="Close chat"
              onPress={() => setActiveConversationId(null)}
            >
              <XIcon className="size-5.5" strokeWidth={2} aria-hidden />
            </Button>
          </>
        ) : null}
      </div>

      {activeConversation ? (
        <MediaGallery
          isOpen={showMediaGallery}
          onClose={() => setShowMediaGallery(false)}
          userId={activeConversationId}
        />
      ) : null}
    </header>
  );
}
