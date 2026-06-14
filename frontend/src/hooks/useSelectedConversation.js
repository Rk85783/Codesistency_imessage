import { useMemo } from "react";
import { useMediaQuery } from "./useMediaQuery";
import { formatMessageTime } from "../lib/utils";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

export function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((namePart) => namePart[0])
    .join("");
}

function mapReplyTo(replyTo) {
  if (!replyTo) return null;
  return {
    id: replyTo._id,
    text: replyTo.text || "",
    senderId: replyTo.senderId,
    image: replyTo.image,
    video: replyTo.video,
  };
}

function mapUserToConversation({ user, messages, authUser, onlineUsers }) {
  const mappedMessages = messages.map((message) => ({
    id: message._id,
    role: String(message.senderId) === String(authUser?._id) ? "me" : "them",
    text: message.text || "",
    time: formatMessageTime(message.createdAt),
    createdAt: message.createdAt,
    imageUrl: message.image,
    videoUrl: message.video,
    senderId: message.senderId,
    replyTo: mapReplyTo(message.replyTo),
    read: message.read || false,
    isDeleted: message.isDeleted || false,
    editedAt: message.editedAt || null,
    reactions: message.reactions || [],
  }));

  return {
    id: user._id,
    peer: {
      name: user.fullName,
      subtitle: user.email,
      isOnline: onlineUsers.includes(user._id),
      avatarUrl: user.profilePic,
      initials: getInitials(user.fullName),
    },
    messages: mappedMessages,
  };
}

export function useSelectedConversation() {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const users = useChatStore((state) => state.users);
  const messages = useChatStore((state) => state.messages);

  const authUser = useAuthStore((state) => state.authUser);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);

  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const selectedUser = useMemo(
    () =>
      activeConversationId
        ? users.find((user) => user._id === activeConversationId) ||
          conversations.find((user) => user._id === activeConversationId)
        : null,
    [activeConversationId, users, conversations],
  );

  const activeConversation = useMemo(
    () =>
      selectedUser
        ? mapUserToConversation({ user: selectedUser, messages, authUser, onlineUsers })
        : null,
    [selectedUser, messages, authUser, onlineUsers],
  );

  return {
    activeConversation,
    activeConversationId,
    isLargeScreen,
  };
}
