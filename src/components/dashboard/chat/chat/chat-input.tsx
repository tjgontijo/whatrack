"use client";

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => void;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isSending = false,
  disabled = false,
  placeholder = "Digite sua mensagem...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120 // max height in pixels
      )}px`;
    }
  }, [message]);

  const isDisabled = isSending || disabled;

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setMessage("");
  }, [message, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter without Shift
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex items-end gap-2 border-t p-4">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        className={cn(
          "min-h-[44px] max-h-[120px] resize-none overflow-hidden",
          isDisabled && "opacity-50"
        )}
        rows={1}
        data-testid="chat-textarea"
      />
      <Button
        onClick={handleSend}
        disabled={isDisabled || !message.trim()}
        size="icon"
        aria-label="Enviar"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" data-testid="sending-indicator" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
