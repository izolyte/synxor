import { Copy, ExternalLink, Link as LinkIcon, Type } from "lucide-react";
import { useClipboard } from "~/features/room/hooks/useClipboard";
import type { TransferTextPayload } from "~/features/room/constants/transfer";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

/**
 * Receiver's view of one incoming Text Snippet or Link. A Link opens in a new
 * tab; a Snippet copies to the clipboard, with an inline fallback line prompting
 * a manual copy when the clipboard API is unavailable or denied.
 */
export function IncomingTextRow({ payload }: { payload: TransferTextPayload }) {
  const isLink = payload.payloadType === "LINK";
  const Icon = isLink ? LinkIcon : Type;

  return (
    <li className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm motion-safe:animate-[message-in_var(--duration-normal)_var(--ease-out)]">
      <Icon aria-hidden="true" size={20} className="shrink-0 text-[var(--color-ink-muted)]" />
      <span dir="auto" title={payload.content} className="min-w-0 flex-1 truncate">
        {payload.content}
      </span>
      {isLink ? (
        <a
          href={payload.content}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${payload.content}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          <ExternalLink aria-hidden="true" size={16} />
          Open
        </a>
      ) : (
        <SnippetCopy value={payload.content} />
      )}
    </li>
  );
}

function SnippetCopy({ value }: { value: string }) {
  const { status, copy } = useClipboard();

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        aria-label="Copy snippet"
        onClick={() => copy(value)}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Copy aria-hidden="true" size={16} />
        {status === "copied" ? "Copied" : "Copy"}
      </button>
      <span
        role="status"
        aria-live="polite"
        data-state={status}
        className="min-h-[1rem] text-xs text-[var(--color-ink-muted)] data-[state=error]:text-[var(--color-error-text)]"
      >
        {status === "error" && "Couldn't copy — select the text and copy it manually."}
      </span>
    </div>
  );
}
