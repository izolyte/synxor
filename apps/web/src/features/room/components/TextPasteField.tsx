import { useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { FieldError } from "~/shared/components/FieldError";
import { cn } from "~/shared/utils/cn";
import { MAX_TEXT_PAYLOAD_CHARS } from "~/features/room/constants/transfer";

/**
 * The Room composer, pinned to the bottom of the stream and shown to every
 * Participant: one rounded bar holding an attach button, the text field, and a
 * round send. Enter sends and clears the field; Shift+Enter inserts a newline. The
 * server classifies text vs link and delivers it, so this only guards the character
 * limit — over it, the send is blocked with an inline error.
 *
 * `disabled` seals the composer once the Room is past its Expiry: while an in-flight
 * Transfer holds the Room open to land, nothing new can be typed or sent into a Room
 * that's already gone.
 */
export function TextPasteField({
  onSend,
  onAttach,
  disabled = false,
  placeholder = "Message, paste a link, or drop a file…",
  initialText = "",
  onComposing,
  onComposingStop,
}: {
  onSend: (text: string) => void;
  /** Opens the file picker (wired to the Drop Zone). Absent → no attach button. */
  onAttach?: () => void;
  disabled?: boolean;
  /** Prompt text; the waiting room swaps in an invite-flavoured line. */
  placeholder?: string;
  /** Seeds the field on mount — a PWA share opens the composer pre-filled. */
  initialText?: string;
  /** Called on each edit, to drive the ephemeral typing signal. */
  onComposing?: () => void;
  /** Called on send, to retract the typing signal at once. */
  onComposingStop?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const tooLong = text.length > MAX_TEXT_PAYLOAD_CHARS;
  const canSend = !disabled && text.trim().length > 0 && !tooLong;
  const errorId = "text-paste-error";

  function submit() {
    if (!canSend) return;
    onSend(text);
    setText("");
    // The message is on its way — stop composing now rather than waiting for the
    // idle timeout to lapse.
    onComposingStop?.();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <div
        className={cn(
          "flex items-end gap-1.5 rounded-[var(--radius-lg)] border border-[var(--input)] bg-[var(--card)] py-1.5 pr-1.5 pl-2 transition-colors",
          "focus-within:border-[var(--color-border-focus)]",
          disabled && "opacity-60",
        )}
      >
        {onAttach && (
          <button
            type="button"
            onClick={onAttach}
            disabled={disabled}
            aria-label="Attach a file"
            className="focus-ring grid size-8 shrink-0 place-items-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-50"
          >
            <Paperclip aria-hidden="true" size={18} />
          </button>
        )}

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // Only signal real composing — a disabled field can still fire change
            // on a programmatic reset, which isn't the Participant typing.
            if (!disabled) onComposing?.();
          }}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter (and IME composition) fall through to a newline.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Text or link to send"
          aria-invalid={tooLong || undefined}
          aria-describedby={tooLong ? errorId : undefined}
          className={cn(
            "max-h-40 min-h-[2rem] flex-1 resize-none bg-transparent py-1 text-sm",
            "placeholder:text-[var(--color-ink-subtle)] focus-visible:outline-none",
          )}
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className="focus-ring grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-ink-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowUp aria-hidden="true" size={16} />
        </button>
      </div>

      {/* Machine keyboard hints in the mono face — the composer's fine print. */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 font-mono text-[0.625rem] text-[var(--color-ink-subtle)]">
        <span>
          <kbd className="rounded-[var(--radius-xs)] bg-[var(--color-bg-subtle)] px-1">↵</kbd> send
        </span>
        <span>
          <kbd className="rounded-[var(--radius-xs)] bg-[var(--color-bg-subtle)] px-1">⇧↵</kbd> newline
        </span>
        {onAttach && <span>drop to attach</span>}
      </div>

      {tooLong && (
        <FieldError id={errorId}>
          Text is over the {MAX_TEXT_PAYLOAD_CHARS.toLocaleString()} character limit.
        </FieldError>
      )}
    </form>
  );
}
