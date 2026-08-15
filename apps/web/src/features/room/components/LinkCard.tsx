import { deriveLinkPreview } from "~/features/room/utils/link-preview";

/**
 * A Link Transfer as a preview card: a decorative token band, a title derived
 * from the URL, and the domain in mono. We never fetch the target (see
 * link-preview.ts) — the card is the URL parsed client-side. The whole card is
 * one anchor that opens the link in a new tab; alignment (own right, others left)
 * and the author caption stay on the row scaffolding around it.
 */
export function LinkCard({ url }: { url: string }) {
  const { href, title, domain } = deriveLinkPreview(url);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${url}`}
      className="block max-w-[15.5rem] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] no-underline shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-border-strong)]"
    >
      {/* Decorative accent band — a token gradient, not a fetched thumbnail. */}
      <div
        aria-hidden="true"
        className="h-16 opacity-90"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
        }}
      />
      <div className="px-3 py-2">
        <div dir="auto" className="line-clamp-2 text-xs font-medium leading-snug break-words">
          {title}
        </div>
        <div className="mt-0.5 truncate font-mono text-[0.6rem] text-[var(--color-ink-subtle)]">
          {domain}
        </div>
      </div>
    </a>
  );
}
