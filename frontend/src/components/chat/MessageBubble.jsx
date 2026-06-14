import { useState } from "react";
import { Popover, TextArea } from "@heroui/react";
import { withTransform } from "../../lib/imagekit";
import { MessageVideo } from "./MessageVideo";
import { useAuthStore } from "../../store/useAuthStore";
import { EditIcon, ImageIcon, PlusIcon, Trash2Icon } from "lucide-react";

const IMAGE_TRANSFORM = "q-auto,w-640,f-auto";
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageBubble({ message, onReply, onEdit, onDelete, onReact }) {
  const authUser = useAuthStore((state) => state.authUser);
  const isOwnMessage = message.role === "me";
  const hasImage = Boolean(message.imageUrl);
  const hasVideo = Boolean(message.videoUrl);
  const hasReply = Boolean(message.replyTo);
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const isDeleted = message.isDeleted;

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await onEdit?.(message.id, editText);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.text || "");
    setIsEditing(false);
  };

  const handleReactionClick = (emoji) => {
    onReact?.(message.id, emoji);
  };

  if (isDeleted) {
    return (
      <div className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[min(90%,28rem)] rounded-2xl px-3 py-2 text-[15px] leading-snug sm:max-w-[min(75%,28rem)] sm:px-3.5 ${
            isOwnMessage
              ? "rounded-br-md bg-accent text-accent-foreground"
              : "rounded-bl-md bg-surface"
          }`}
        >
          <p className="italic opacity-60">(deleted)</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p
              className={`text-[11px] tabular-nums ${
                isOwnMessage ? "text-accent-foreground/75" : "text-muted"
              }`}
            >
              {message.time}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[min(90%,28rem)] rounded-2xl px-3 py-2 text-[15px] leading-snug sm:max-w-[min(75%,28rem)] sm:px-3.5 ${
          isOwnMessage
            ? "rounded-br-md bg-accent text-accent-foreground"
            : "rounded-bl-md bg-surface"
        }`}
      >
        {hasReply ? (
          <div
            className={`mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs ${
              isOwnMessage
                ? "border-accent-foreground/40 bg-accent-foreground/10"
                : "border-foreground/20 bg-foreground/5"
            }`}
          >
            {message.replyTo.image ? (
              <img
                src={withTransform(message.replyTo.image, "q-auto,w-120,h-80")}
                alt=""
                className="mb-1 max-h-16 rounded object-cover"
              />
            ) : null}
            <p className="line-clamp-2 italic opacity-75">{message.replyTo.text || "Shared media"}</p>
          </div>
        ) : null}
        {hasImage && !imageError ? (
          <img
            src={withTransform(message.imageUrl, IMAGE_TRANSFORM)}
            alt="Shared image"
            onError={() => setImageError(true)}
            className="mb-1.5 max-h-40 max-w-full rounded-lg object-cover sm:max-h-52 sm:rounded-xl"
          />
        ) : null}
        {hasImage && imageError ? (
          <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-foreground/5 px-3 py-2 text-sm text-muted">
            <ImageIcon className="size-4 shrink-0" />
            <span>Image failed to load</span>
          </div>
        ) : null}
        {hasVideo ? <MessageVideo src={message.videoUrl} /> : null}
        {isEditing ? (
          <div className="mb-1.5">
            <TextArea
              fullWidth
              variant="secondary"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              className="mb-1.5"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-md px-2 py-0.5 text-xs font-medium opacity-80 hover:opacity-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-md bg-accent-foreground px-2 py-0.5 text-xs font-medium text-accent hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        ) : message.text ? (
          <p className="whitespace-pre-wrap wrap-break-word">{message.text}</p>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={`text-[11px] tabular-nums ${
              isOwnMessage ? "text-accent-foreground/75" : "text-muted"
            }`}
          >
            {message.time}
            {message.editedAt ? (
              <span className="ml-1 text-[10px] opacity-60">edited</span>
            ) : null}
          </p>
          <div className="flex items-center gap-1">
            {isOwnMessage ? (
              <span
                className={`text-[10px] ${message.read ? "text-blue-400" : "text-accent-foreground/50"}`}
                aria-label={message.read ? "Read" : "Sent"}
              >
                {message.read ? "✓✓" : "✓"}
              </span>
            ) : null}
            {isOwnMessage ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditText(message.text || "");
                    setIsEditing(true);
                  }}
                  className="text-[10px] font-medium uppercase tracking-wide opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                  aria-label="Edit"
                >
                  <EditIcon className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(message.id)}
                  className="text-[10px] font-medium uppercase tracking-wide opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2Icon className="size-3" />
                </button>
              </>
            ) : null}
            {onReply && !isOwnMessage ? (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="text-[10px] font-medium uppercase tracking-wide opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                aria-label="Reply"
              >
                Reply
              </button>
            ) : null}
          </div>
        </div>
        {message.reactions?.length > 0 || onReact ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {message.reactions?.map((r, i) => {
              const myReaction = r.users
                ? r.users.includes(authUser?._id)
                : String(r.userId) === String(authUser?._id);
              const count = r.count || (r.users?.length || 0);
              return (
                <button
                  key={`${r.emoji}-${i}`}
                  type="button"
                  onClick={() => handleReactionClick(r.emoji)}
                  className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
                    myReaction
                      ? "bg-accent-foreground/20"
                      : "bg-foreground/10 hover:bg-foreground/20"
                  }`}
                >
                  <span>{r.emoji}</span>
                  {count > 1 ? <span className="text-[10px] opacity-70">{count}</span> : null}
                </button>
              );
            })}
            {onReact ? (
              <Popover.Root isOpen={showReactionPicker} onOpenChange={setShowReactionPicker} placement="top">
                <Popover.Trigger>
                  <button
                    type="button"
                    className="flex size-5 items-center justify-center rounded-full bg-foreground/10 text-xs opacity-0 transition-opacity hover:bg-foreground/20 group-hover:opacity-100"
                    aria-label="Add reaction"
                  >
                    <PlusIcon className="size-3" />
                  </button>
                </Popover.Trigger>
                <Popover.Content className="p-1">
                  <div className="flex gap-1">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          handleReactionClick(emoji);
                          setShowReactionPicker(false);
                        }}
                        className="rounded-md p-1 text-lg transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </Popover.Content>
              </Popover.Root>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
