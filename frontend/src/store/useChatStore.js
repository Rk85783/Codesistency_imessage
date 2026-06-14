import { create } from "zustand";
import { persist } from "zustand/middleware";

import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

const MESSAGES_PER_PAGE = 50;
const messageHandlers = new Map();

function getMessageHandler(userId) {
  if (!messageHandlers.has(userId)) {
    const handler = (newMessage) => {
      const state = useChatStore.getState();
      const isFromPeer = String(newMessage.senderId) === String(userId);
      const isToPeer = String(newMessage.receiverId) === String(userId);
      if (!isFromPeer && !isToPeer) return;
      if (state.messages.some((m) => String(m._id) === String(newMessage._id))) return;
      useChatStore.setState({ messages: [...state.messages, newMessage] });
      if (isFromPeer) {
        state.sendMarkAsRead();
        state.markMessagesAsRead(userId);
      }
    };
    messageHandlers.set(userId, handler);
  }
  return messageHandlers.get(userId);
}

export const useChatStore = create(
  persist(
    (set, get) => ({
      users: [],
      conversations: [],
      messages: [],
      selectedUser: null,
      isConversationsLoading: false,
      isUsersLoading: false,
      isMessagesLoading: false,
      isLoadingMore: false,
      hasMore: false,
      messagePage: 1,
      activeConversationId: null,
      searchQuery: "",
      sidebarTab: "chats",
      composerText: "",
      isSoundEnabled: true,
      isSendingMedia: false,
      isSendingMessage: false,
      replyToMessage: null,
      searchResults: null,
      isSearching: false,
      isPeerTyping: false,

      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set((state) => ({
            users: res.data,
            selectedUser:
              state.selectedUser && res.data.some((user) => user._id === state.selectedUser._id)
                ? state.selectedUser
                : null,
          }));
        } catch (error) {
          toast.error("Failed to load users");
        } finally {
          set({ isUsersLoading: false });
        }
      },

      getConversations: async () => {
        set({ isConversationsLoading: true });
        try {
          const res = await axiosInstance.get("/messages/conversations");
          set({ conversations: res.data });
        } catch (error) {
          toast.error("Failed to load conversations");
        } finally {
          set({ isConversationsLoading: false });
        }
      },

      getMessages: async (userId) => {
        if (!userId) return;
        set({ isMessagesLoading: true, messagePage: 1, hasMore: false });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`, {
            params: { page: 1, limit: MESSAGES_PER_PAGE },
          });
          set({
            messages: res.data.messages,
            hasMore: res.data.hasMore,
            messagePage: 1,
          });
          get().sendMarkAsRead();
          get().markMessagesAsRead(userId);
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      loadMoreMessages: async () => {
        const { activeConversationId, isLoadingMore, hasMore, messagePage } = get();
        if (!activeConversationId || isLoadingMore || !hasMore) return;

        set({ isLoadingMore: true });
        const nextPage = messagePage + 1;
        try {
          const res = await axiosInstance.get(`/messages/${activeConversationId}`, {
            params: { page: nextPage, limit: MESSAGES_PER_PAGE },
          });
          set((state) => ({
            messages: [...res.data.messages, ...state.messages],
            messagePage: nextPage,
            hasMore: res.data.hasMore,
          }));
        } catch (error) {
          toast.error("Failed to load older messages");
        } finally {
          set({ isLoadingMore: false });
        }
      },

      searchMessages: async (userId, query) => {
        if (!userId || !query.trim()) return;
        set({ isSearching: true });
        try {
          const res = await axiosInstance.get(`/messages/search/${userId}`, {
            params: { q: query.trim() },
          });
          set({ searchResults: res.data });
        } catch (error) {
          toast.error("Failed to search messages");
        } finally {
          set({ isSearching: false });
        }
      },

      clearSearchResults: () => {
        set({ searchResults: null });
      },

      sendMessage: async (messageData) => {
        const { selectedUser } = get();
        if (!selectedUser) return false;

        set({ isSendingMessage: true });
        try {
          const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
          set((state) => ({
            messages: [...state.messages, res.data],
            composerText: "",
            replyToMessage: null,
          }));
          get().getConversations();
          if (selectedUser) get().markMessagesAsRead(selectedUser._id);
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to send message");
          return false;
        } finally {
          set({ isSendingMessage: false });
        }
      },

      subscribeToMessages: (userId) => {
        if (!userId) return;

        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        const handler = getMessageHandler(userId);
        socket.off("newMessage", handler);
        socket.on("newMessage", handler);

        const typingHandler = (data) => {
          if (String(data.senderId) === String(userId)) {
            useChatStore.setState({ isPeerTyping: true });
          }
        };
        const stopTypingHandler = (data) => {
          if (String(data.senderId) === String(userId)) {
            useChatStore.setState({ isPeerTyping: false });
          }
        };
        socket.off("typing", typingHandler);
        socket.on("typing", typingHandler);
        socket.off("stopTyping", stopTypingHandler);
        socket.on("stopTyping", stopTypingHandler);

        const markAsReadHandler = (data) => {
          if (String(data.senderId) === String(userId)) {
            useChatStore.setState((state) => ({
              messages: state.messages.map((m) =>
                String(m.senderId) === String(data.senderId) ? { ...m, read: true } : m,
              ),
            }));
          }
        };
        socket.off("markAsRead", markAsReadHandler);
        socket.on("markAsRead", markAsReadHandler);
      },

      unsubscribeFromMessages: (userId) => {
        const socket = useAuthStore.getState().socket;
        if (!socket || !userId) return;
        const handler = messageHandlers.get(userId);
        if (handler) socket.off("newMessage", handler);
        socket.off("typing");
        socket.off("stopTyping");
        socket.off("markAsRead");
      },

      setSelectedUser: (selectedUser) => set({ selectedUser }),

      setActiveConversationId: (activeConversationId) => {
        set((state) => ({
          activeConversationId,
          selectedUser:
            state.users.find((user) => user._id === activeConversationId) ||
            state.conversations.find((user) => user._id === activeConversationId) ||
            null,
          messages: activeConversationId ? state.messages : [],
          replyToMessage: null,
          searchResults: null,
      isPeerTyping: false,
      mediaGallery: [],
      isMediaGalleryLoading: false,
          composerText: "",
        }));
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setComposerText: (composerText) => set({ composerText }),
      setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),
      setReplyToMessage: (replyToMessage) => set({ replyToMessage }),

      sendTypingStart: () => {
        const socket = useAuthStore.getState().socket;
        const { activeConversationId } = get();
        if (socket && activeConversationId) {
          socket.emit("typing:start", { receiverId: activeConversationId });
        }
      },

      sendTypingStop: () => {
        const socket = useAuthStore.getState().socket;
        const { activeConversationId } = get();
        if (socket && activeConversationId) {
          socket.emit("typing:stop", { receiverId: activeConversationId });
        }
      },

      sendMarkAsRead: () => {
        const socket = useAuthStore.getState().socket;
        const { activeConversationId } = get();
        if (socket && activeConversationId) {
          socket.emit("markAsRead", { conversationId: activeConversationId });
        }
      },

      markMessagesAsRead: async (userId) => {
        if (!userId) return;
        try {
          await axiosInstance.patch(`/messages/read/${userId}`);
          get().getConversations();
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      },

      sendTextMessage: async (conversationId) => {
        const messageText = get().composerText.trim();
        if (!conversationId || !messageText) return false;

        const replyTo = get().replyToMessage;
        const payload = replyTo
          ? { text: messageText, replyTo: replyTo.id }
          : { text: messageText };

        return get().sendMessage(payload);
      },

      sendMediaMessage: async ({ conversationId, file }) => {
        if (!conversationId || !file) return false;

        const formData = new FormData();
        formData.append("media", file);

        const replyTo = get().replyToMessage;
        if (replyTo) {
          formData.append("replyTo", replyTo.id);
        }

        set({ isSendingMedia: true });
        try {
          return await get().sendMessage(formData);
        } finally {
          set({ isSendingMedia: false });
        }
      },

      editMessage: async (messageId, text) => {
        if (!messageId || !text.trim()) return;
        try {
          const res = await axiosInstance.patch(`/messages/${messageId}`, { text });
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId) ? { ...m, ...res.data } : m,
            ),
          }));
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to edit message");
        }
      },

      deleteMessage: async (messageId) => {
        if (!messageId) return;
        try {
          await axiosInstance.delete(`/messages/${messageId}`);
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, isDeleted: true, text: "", image: null, video: null }
                : m,
            ),
          }));
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete message");
        }
      },

      updateProfile: async (fullName) => {
        if (!fullName.trim()) return;
        try {
          const res = await axiosInstance.put("/auth/profile", { fullName });
          useAuthStore.setState({ authUser: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update profile");
        }
      },

      blockUser: async (userId) => {
        if (!userId) return;
        try {
          await axiosInstance.post(`/messages/block/${userId}`);
          get().getConversations();
          toast.success("User blocked");
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to block user");
        }
      },

      unblockUser: async (userId) => {
        if (!userId) return;
        try {
          await axiosInstance.post(`/messages/unblock/${userId}`);
          get().getConversations();
          toast.success("User unblocked");
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to unblock user");
        }
      },

      toggleReaction: async (messageId, emoji) => {
        if (!messageId || !emoji) return;
        try {
          const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId) ? { ...m, reactions: res.data.reactions } : m,
            ),
          }));
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to toggle reaction");
        }
      },

      getMediaGallery: async (userId) => {
        if (!userId) return;
        set({ isMediaGalleryLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/media/${userId}`);
          set({ mediaGallery: res.data });
        } catch (error) {
          toast.error("Failed to load media gallery");
        } finally {
          set({ isMediaGalleryLoading: false });
        }
      },
    }),
    {
      name: "imessage-storage",
      partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled }),
    },
  ),
);
