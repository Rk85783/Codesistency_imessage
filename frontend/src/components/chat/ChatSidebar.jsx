import { useMemo, useState } from "react";
import { getInitials, useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { APP_NAME, AppLogo } from "../AppLogo";
import { UserButton } from "@clerk/react";

import { Button, Input, Modal, SearchField, Tabs } from "@heroui/react";
import { LoaderIcon, MessageSquareIcon, PencilIcon, UsersIcon } from "lucide-react";
import { ConversationRow } from "./ConversationRow";

function mapUserForList(user, onlineUsers) {
  return {
    conversationId: user._id,
    id: user._id,
    name: user.fullName,
    avatarUrl: user.profilePic,
    initials: getInitials(user.fullName),
    isOnline: onlineUsers.includes(user._id),
    lastMessage: user.lastMessage,
    lastMessageAt: user.lastMessageAt,
    unreadCount: user.unreadCount || 0,
    peer: {
      name: user.fullName,
      avatarUrl: user.profilePic,
      initials: getInitials(user.fullName),
      isOnline: onlineUsers.includes(user._id),
    },
  };
}

function ChatSidebar() {
  const conversations = useChatStore((state) => state.conversations);
  const users = useChatStore((state) => state.users);
  const isConversationsLoading = useChatStore((state) => state.isConversationsLoading);
  const isUsersLoading = useChatStore((state) => state.isUsersLoading);

  const searchQuery = useChatStore((state) => state.searchQuery);
  const setSearchQuery = useChatStore((state) => state.setSearchQuery);

  const sidebarTab = useChatStore((state) => state.sidebarTab);
  const setSidebarTab = useChatStore((state) => state.setSidebarTab);

  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const updateProfile = useChatStore((state) => state.updateProfile);

  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const authUser = useAuthStore((state) => state.authUser);

  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState("");

  const { activeConversationId, isLargeScreen } = useSelectedConversation();

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const conversationUsers = useMemo(
    () => conversations.map((user) => mapUserForList(user, onlineUsers)),
    [conversations, onlineUsers],
  );
  const allUsers = useMemo(
    () => users.map((user) => mapUserForList(user, onlineUsers)),
    [users, onlineUsers],
  );

  const filteredConversations = useMemo(
    () =>
      normalizedSearchQuery
        ? conversationUsers.filter((conversation) =>
            conversation.peer.name.toLowerCase().includes(normalizedSearchQuery),
          )
        : conversationUsers,
    [conversationUsers, normalizedSearchQuery],
  );

  const filteredUsers = useMemo(
    () =>
      normalizedSearchQuery
        ? allUsers.filter((user) => user.name.toLowerCase().includes(normalizedSearchQuery))
        : allUsers,
    [allUsers, normalizedSearchQuery],
  );

  return (
    <aside
      className={`w-full shrink-0 flex-col overflow-hidden border-r border-border lg:w-72 ${
        !isLargeScreen && activeConversationId ? "hidden lg:flex" : "flex"
      }`}
    >
      <div className="shrink-0 border-b border-border px-2 pb-2 pt-2.5 sm:px-3 sm:pt-3">
        <div className="flex items-center gap-2 px-0.5 sm:gap-2.5 sm:px-1">
          <AppLogo size={32} className="size-8 shrink-0 rounded-[9px] sm:size-8.5" alt="" />
          <p className="flex-1 truncate text-lg font-bold tracking-tight sm:text-[22px]">
            {APP_NAME}
          </p>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
          <button
            type="button"
            onClick={() => {
              setProfileName(authUser?.fullName || "");
              setShowProfileEdit(true);
            }}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:text-foreground"
            aria-label="Edit profile"
          >
            <PencilIcon className="size-4" />
          </button>
        </div>
      </div>

      <Tabs
        selectedKey={sidebarTab}
        onSelectionChange={(key) => setSidebarTab(String(key))}
        variant="secondary"
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="shrink-0 border-b border-border px-3 pb-2 pt-2">
          <SearchField
            fullWidth
            variant="secondary"
            className="w-full"
            value={searchQuery}
            onChange={setSearchQuery}
          >
            <SearchField.Group className="rounded-xl">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search" />
              {searchQuery ? <SearchField.ClearButton /> : null}
            </SearchField.Group>
          </SearchField>
        </div>

        <Tabs.ListContainer className="shrink-0 border-b border-border px-2 pb-2 pt-1">
          <Tabs.List className="w-full gap-0.5">
            <Tabs.Tab id="chats" className="flex-1 justify-center gap-1.5">
              <MessageSquareIcon className="size-3.5 opacity-80" aria-hidden />
              Chats
            </Tabs.Tab>
            <Tabs.Tab id="users" className="flex-1 justify-center gap-1.5">
              <UsersIcon className="size-3.5 opacity-80" aria-hidden />
              Users
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          id="chats"
          className="flex-1 overflow-x-hidden overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {isConversationsLoading ? (
            <div className="flex justify-center py-8">
              <LoaderIcon className="size-6 animate-spin text-muted" />
            </div>
          ) : filteredConversations.length === 0 && normalizedSearchQuery ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No conversations match your search.
            </p>
          ) : filteredConversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No conversations yet.
            </p>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                user={conversation}
                selected={conversation.id === activeConversationId}
                onSelect={() => setActiveConversationId(conversation.id)}
              />
            ))
          )}
        </Tabs.Panel>

        <Tabs.Panel
          id="users"
          className="flex-1 overflow-x-hidden overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {isUsersLoading ? (
            <div className="flex justify-center py-8">
              <LoaderIcon className="size-6 animate-spin text-muted" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No people match your search.</p>
          ) : (
            filteredUsers.map((user) => (
              <ConversationRow
                key={user.conversationId}
                user={user}
                selected={user.conversationId === activeConversationId}
                onSelect={() => setActiveConversationId(user.conversationId)}
              />
            ))
          )}
        </Tabs.Panel>
      </Tabs>

      <Modal.Root isOpen={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <Modal.Container className="max-w-sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="text-lg font-semibold">Edit Profile</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Input
                fullWidth
                variant="secondary"
                label="Full Name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                autoFocus
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={() => setShowProfileEdit(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isDisabled={!profileName.trim()}
                onPress={async () => {
                  await updateProfile(profileName);
                  setShowProfileEdit(false);
                }}
              >
                Save
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Root>
    </aside>
  );
}
export default ChatSidebar;
