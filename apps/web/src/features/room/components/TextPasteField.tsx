import { useState } from "react";
import { FieldError } from "~/shared/components/FieldError";
import { Button } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";
import { MAX_TEXT_PAYLOAD_CHARS } from "~/features/room/constants/transfer";

/**
 * The Room composer, pinned to the bottom of the stream and shown to every
 * Participant. Enter sends and clears the field; Shift+Enter inserts a newline.
 * The server classifies text vs link and delivers it, so this only guards the
 * character limit — over it, the send is blocked with an inline error.
 *
 * `disabled` seals the composer once the Room is past its Expiry: while an
 * in-flight Transfer holds the Room open to land, nothing new can be typed or sent
 * into a Room that's already gone.
 */
export function TextPasteField({
  onSend,
  disabled = false,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const tooLong = text.length > MAX_TEXT_PAYLOAD_CHARS;
  const canSend = !disabled && text.trim().length > 0 && !tooLong;
  const errorId = "text-paste-error";

  function submit() {
    if (!canSend) return;
    onSend(text);
    setText("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter (and IME composition) fall through to a newline.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        disabled={disabled}
        placeholder="Type a message, paste text, or a link"
        aria-label="Text or link to send"
        aria-invalid={tooLong || undefined}
        aria-describedby={tooLong ? errorId : undefined}
        className={cn(
          "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm",
          "placeholder:text-[var(--color-ink-muted)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "aria-[invalid=true]:border-[var(--color-error-border)]",
        )}
      />
      <div className="flex items-center justify-end">
        <Button type="submit" size="sm" disabled={!canSend}>
          Send
        </Button>
      </div>
      {tooLong && (
        <FieldError id={errorId}>
          Text is over the {MAX_TEXT_PAYLOAD_CHARS.toLocaleString()} character limit.
        </FieldError>
      )}
    </form>
  );
}
