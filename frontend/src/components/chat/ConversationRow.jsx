import { Avatar } from "@heroui/react";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationRow({ user, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left ${
        selected ? "bg-accent-soft" : ""
      }`}
    >
      <AvatarWithOnlineIndicator isOnline={user.isOnline ?? false}>
        <Avatar className="size-12 shrink-0">
          <Avatar.Image alt={user.name} src={user.avatarUrl} />
          <Avatar.Fallback className="text-sm font-medium">{user.initials}</Avatar.Fallback>
        </Avatar>
      </AvatarWithOnlineIndicator>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className={`truncate text-[15px] ${user.unreadCount > 0 ? "font-bold" : "font-semibold"}`}>
            {user.name}
          </p>
          <div className="ml-2 flex shrink-0 items-center gap-2">
            {user.unreadCount > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                {user.unreadCount > 9 ? "9+" : user.unreadCount}
              </span>
            ) : null}
            {user.lastMessageAt ? (
              <span className="shrink-0 text-xs text-muted">{formatTimeAgo(user.lastMessageAt)}</span>
            ) : null}
          </div>
        </div>
        {user.lastMessage ? (
          <p className={`truncate text-sm ${user.unreadCount > 0 ? "font-medium text-foreground" : "text-muted"}`}>
            {user.lastMessage}
          </p>
        ) : null}
      </div>
    </button>
  );
}
