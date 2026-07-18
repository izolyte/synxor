import { useState } from "react";
import { FieldError } from "~/shared/components/FieldError";
import { Button } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";
import { MAX_TEXT_PAYLOAD_CHARS } from "~/features/room/constants/transfer";

/**
 * Sender's Text Snippet / Link composer. Sends on submit (or ⌘/Ctrl+Enter),
 * clearing the field. The server classifies text vs link and delivers it, so
 * this only guards the character limit — over it, the send is blocked with an
 * inline error.
 */
export function TextPasteField({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const tooLong = text.length > MAX_TEXT_PAYLOAD_CHARS;
  const canSend = text.trim().length > 0 && !tooLong;
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
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        placeholder="Paste text or a link to send"
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
