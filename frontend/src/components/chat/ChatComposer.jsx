import { Button, Popover, TextArea } from "@heroui/react";
import { ImageIcon, LoaderIcon, SendHorizontalIcon, SmileIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import useKeyboardSound from "../../hooks/useKeyboardSound";
import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";

export function ChatComposer() {
  const composerText = useChatStore((state) => state.composerText);
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const sendMediaMessage = useChatStore((state) => state.sendMediaMessage);
  const isSendingMedia = useChatStore((state) => state.isSendingMedia);
  const isSendingMessage = useChatStore((state) => state.isSendingMessage);
  const sendTextMessage = useChatStore((state) => state.sendTextMessage);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const replyToMessage = useChatStore((state) => state.replyToMessage);
  const setReplyToMessage = useChatStore((state) => state.setReplyToMessage);
  const { activeConversationId } = useSelectedConversation();
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const mediaInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const sendTypingStart = useChatStore((state) => state.sendTypingStart);
  const sendTypingStop = useChatStore((state) => state.sendTypingStop);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (composerText.trim()) {
      sendTypingStart();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStop();
      }, 2000);
    } else {
      sendTypingStop();
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [composerText, sendTypingStart, sendTypingStop]);

  const playSoundIfEnabled = () => {
    if (isSoundEnabled) playRandomKeyStrokeSound();
  };

  const handleSend = async () => {
    sendTypingStop();
    const didSendMessage = await sendTextMessage(activeConversationId);
    if (didSendMessage) playSoundIfEnabled();
    textAreaRef.current?.focus();
  };

  const handleComposerTextChange = (event) => {
    setComposerText(event.target.value);
    playSoundIfEnabled();
  };

  const handleMediaPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File exceeds 25MB limit");
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Only images and videos are supported");
      return;
    }

    const didSendMessage = await sendMediaMessage({
      conversationId: activeConversationId,
      file,
    });

    if (didSendMessage) playSoundIfEnabled();
  };

  const handleEmojiSelect = (emoji) => {
    setComposerText(composerText + emoji.emoji);
    playSoundIfEnabled();
    textAreaRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyToMessage(null);
  };

  return (
    <footer className="shrink-0 border-t border-border px-1.5 pb-2 pt-2 sm:px-2">
      {replyToMessage ? (
        <div className="mx-auto mb-2 flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-accent">Replying</p>
            <p className="truncate text-sm text-muted">
              {replyToMessage.text || "Shared media"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="size-6 shrink-0"
            onPress={cancelReply}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ) : null}

      {isSendingMedia ? (
        <div className="mx-auto mb-2 flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
          <LoaderIcon
            className="size-4 shrink-0 animate-spin text-accent"
            strokeWidth={2}
            aria-hidden
          />
          <span className="truncate">Uploading media...</span>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-full items-end gap-1.5 px-0.5 sm:gap-2 sm:px-1">
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          disabled={isSendingMedia}
          tabIndex={-1}
          aria-hidden
          onChange={handleMediaPick}
        />

        <Button
          variant="ghost"
          isIconOnly
          isDisabled={isSendingMedia}
          className="size-9 shrink-0 touch-manipulation self-end text-accent"
          onPress={() => mediaInputRef.current?.click()}
        >
          <ImageIcon className="size-5 sm:size-6" strokeWidth={2} />
        </Button>

        <Popover.Root isOpen={showEmojiPicker} onOpenChange={setShowEmojiPicker} placement="top">
          <Popover.Trigger>
            <Button
              variant="ghost"
              isIconOnly
              className="size-9 shrink-0 self-end text-accent"
            >
              <SmileIcon className="size-5 sm:size-6" strokeWidth={2} />
            </Button>
          </Popover.Trigger>
          <Popover.Content className="p-0">
            <EmojiPicker onEmojiClick={handleEmojiSelect} />
          </Popover.Content>
        </Popover.Root>

        <TextArea
          ref={textAreaRef}
          fullWidth
          variant="secondary"
          placeholder="iMessage"
          rows={1}
          value={composerText}
          onChange={handleComposerTextChange}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 rounded-full"
        />

        <Button variant="primary" isIconOnly isDisabled={!composerText.trim() || isSendingMessage} onPress={handleSend}>
          <SendHorizontalIcon className="size-5" />
        </Button>
      </div>
    </footer>
  );
}
