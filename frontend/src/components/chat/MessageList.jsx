import { Fragment, useCallback, useRef } from "react";
import { LoaderIcon, MessageSquareOffIcon, SearchIcon } from "lucide-react";
import useScrollToBottom from "../../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { NoConversationPlaceholder } from "./NoConversationPlaceholder";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { formatMessageTime } from "../../lib/utils";

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

function formatDateLabel(date) {
  const now = new Date();
  const msgDate = new Date(date);
  const diffDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return msgDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function getDateKey(date) {
  return new Date(date).toDateString();
}

function SearchResults({ results, onReply, onEdit, onDelete, onReact }) {
  const authUser = useAuthStore((state) => state.authUser);
  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3 sm:px-3 sm:py-4">
      <p className="mb-2 text-center text-xs text-muted">
        Found {results.length} message{results.length !== 1 ? "s" : ""}
      </p>
      {results.map((message) => {
        const mapped = {
          id: message._id,
          role: String(message.senderId) === String(authUser?._id) ? "me" : "them",
          text: message.text || "",
          time: formatMessageTime(message.createdAt),
          createdAt: message.createdAt,
          imageUrl: message.image,
          videoUrl: message.video,
          replyTo: mapReplyTo(message.replyTo),
          isDeleted: message.isDeleted || false,
          editedAt: message.editedAt || null,
          reactions: message.reactions || [],
        };
        return (
          <div key={message._id} className="group">
            <MessageBubble message={mapped} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onReact={onReact} />
          </div>
        );
      })}
    </div>
  );
}

export function MessageList() {
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);
  const isMessagesLoading = useChatStore((state) => state.isMessagesLoading);
  const isLoadingMore = useChatStore((state) => state.isLoadingMore);
  const hasMore = useChatStore((state) => state.hasMore);
  const setReplyToMessage = useChatStore((state) => state.setReplyToMessage);
  const searchResults = useChatStore((state) => state.searchResults);
  const isSearching = useChatStore((state) => state.isSearching);
  const editMessage = useChatStore((state) => state.editMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const toggleReaction = useChatStore((state) => state.toggleReaction);

  const lastMessageId = activeConversation?.messages.at(-1)?.id;
  const messagesScrollRef = useScrollToBottom(activeConversationId, lastMessageId);
  const scrollContainerRef = useRef(null);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasMore || isLoadingMore) return;
    if (el.scrollTop < 100) {
      loadMoreMessages();
    }
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  const dateGroups = activeConversation
    ? activeConversation.messages.reduce((groups, message) => {
        const key = getDateKey(message.createdAt);
        if (!groups.length || groups[groups.length - 1].key !== key) {
          groups.push({ key, date: formatDateLabel(message.createdAt), messages: [] });
        }
        groups[groups.length - 1].messages.push(message);
        return groups;
      }, [])
    : [];

  const handleReply = (message) => {
    setReplyToMessage(message);
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {activeConversation && isMessagesLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoaderIcon className="size-6 animate-spin text-muted" />
        </div>
      ) : activeConversation && searchResults !== null ? (
        isSearching ? (
          <div className="flex flex-1 items-center justify-center">
            <LoaderIcon className="size-6 animate-spin text-muted" />
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
            <SearchIcon className="size-8 opacity-50" />
            <p className="text-sm">No messages found</p>
          </div>
        ) : (
          <SearchResults results={searchResults} onReply={handleReply} onEdit={editMessage} onDelete={deleteMessage} onReact={toggleReaction} />
        )
      ) : activeConversation ? (
        <div
          ref={(node) => {
            messagesScrollRef.current = node;
            scrollContainerRef.current = node;
          }}
          onScroll={handleScroll}
          className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-3 sm:px-3 sm:py-4"
        >
          {isLoadingMore ? (
            <div className="flex justify-center py-2">
              <LoaderIcon className="size-5 animate-spin text-muted" />
            </div>
          ) : null}
          {dateGroups.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
              <MessageSquareOffIcon className="size-8 opacity-50" />
              <p className="text-sm">No messages yet. Send a message to start the conversation.</p>
            </div>
          ) : null}
          {dateGroups.map((group) => (
            <Fragment key={group.key}>
              <p className="mb-1 mt-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted first:mt-0">
                {group.date}
              </p>
              {group.messages.map((message) => (
                <div key={message.id} className="group">
                  <MessageBubble message={message} onReply={handleReply} onEdit={editMessage} onDelete={deleteMessage} onReact={toggleReaction} />
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      ) : (
        <NoConversationPlaceholder />
      )}
    </div>
  );
}
