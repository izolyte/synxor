import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TransferRow, type TransferRowData } from "~/features/room/components/TransferRow";
import {
  TRANSFER_LOG_MAX_HEIGHT,
  TRANSFER_LOG_ROW_HEIGHT,
  TRANSFER_LOG_VIRTUALIZE_THRESHOLD,
} from "~/features/room/constants/transfer";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";

// The value the "C on focused row" shortcut copies: a link's URL, a snippet's
// text, nothing for a file (docs/design/09-focus-keyboard.md).
function copyableValue(row: TransferRowData): string | undefined {
  if (row.kind === "snippet") return row.value;
  if (row.kind === "link") return row.href;
  return undefined;
}

/**
 * The Transfer Log: every Transfer in the Room session, persistent history first
 * then live rows, shown to both Sender and Receiver. Reuses the presentational
 * TransferRow and adds the list behaviours — roving arrow-key focus, a timestamp
 * column, and windowed rendering past ~100 rows (docs/design/10-components.md,
 * 09-focus-keyboard.md). Data comes pre-merged from useTransferLog.
 */
export function TransferLog({
  rows,
  onCopy,
}: {
  rows: TransferLogRow[];
  onCopy?: (value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Set on a keyboard move; an effect focuses the row once it's in the DOM (the
  // virtualizer may need to scroll it into range first).
  const pendingFocus = useRef<number | null>(null);

  const virtualize = rows.length > TRANSFER_LOG_VIRTUALIZE_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TRANSFER_LOG_ROW_HEIGHT,
    overscan: 8,
    // Seed a viewport before the scroll element is measured so the first paint
    // (and SSR) renders a full window rather than nothing; the real rect takes
    // over once mounted. Matches the max-height the container caps at.
    initialRect: { width: 0, height: TRANSFER_LOG_MAX_HEIGHT },
  });

  // Clamp the roving index if the list shrinks (a Room can't drop Transfers
  // today, but don't let a stale index point past the end).
  const clampedActive = rows.length === 0 ? 0 : Math.min(activeIndex, rows.length - 1);

  // Runs before paint (no flash) and short-circuits unless a keyboard move armed
  // pendingFocus. It stays unconditional on purpose: the virtualizer may need a
  // follow-up commit to scroll the target row into range, and we retry each
  // commit until it's in the DOM to focus.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-index="${target}"]`);
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  });

  if (rows.length === 0) {
    return (
      <section aria-label="Transfer Log" className="flex flex-col gap-2">
        <TransferLogHeading />
        <p className="text-muted-foreground text-sm">
          Completed Transfers appear here after Delivery.
        </p>
      </section>
    );
  }

  const moveTo = (next: number) => {
    const clamped = Math.max(0, Math.min(rows.length - 1, next));
    setActiveIndex(clamped);
    pendingFocus.current = clamped;
    if (virtualize) virtualizer.scrollToIndex(clamped);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveTo(clampedActive + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(clampedActive - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(rows.length - 1);
        break;
      case "c":
      case "C": {
        // Leave native Ctrl/Cmd+C (copy selection) alone; this is the bare-key
        // shortcut for the focused row.
        if (event.ctrlKey || event.metaKey) return;
        const value = copyableValue(rows[clampedActive]);
        if (value !== undefined) {
          event.preventDefault();
          onCopy?.(value);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <section aria-label="Transfer Log" className="flex flex-col gap-2">
      <TransferLogHeading />
      <div
        ref={scrollRef}
        onKeyDown={onKeyDown}
        style={{ maxHeight: TRANSFER_LOG_MAX_HEIGHT }}
        className="overflow-y-auto rounded-[var(--radius-md)]"
      >
        {virtualize ? (
          <ul
            role="list"
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index];
              return (
                <TransferRow
                  key={row.id}
                  transfer={row}
                  onCopy={onCopy}
                  receivedAt={row.receivedAt}
                  index={item.index}
                  tabIndex={item.index === clampedActive ? 0 : -1}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${item.start}px)`,
                  }}
                />
              );
            })}
          </ul>
        ) : (
          <ul role="list" className="flex flex-col">
            {rows.map((row, index) => (
              <TransferRow
                key={row.id}
                transfer={row}
                onCopy={onCopy}
                receivedAt={row.receivedAt}
                index={index}
                tabIndex={index === clampedActive ? 0 : -1}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TransferLogHeading() {
  return (
    <h2 className="text-foreground text-sm font-medium tracking-[var(--tracking-wide)]">Transfers</h2>
  );
}
