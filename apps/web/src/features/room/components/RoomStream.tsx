import { useEffect, useRef } from "react";
import { MessageBubble } from "~/features/room/components/MessageBubble";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";

/**
 * The Room stream: every Transfer in the session — files, Text Snippets, Links —
 * as one chronological feed both Participants share. This client's own messages
 * align right, everyone else's left. Fills the height it's given and scrolls,
 * pinning to the newest message as the conversation grows.
 */
export function RoomStream({
  rows,
  onCopy,
}: {
  rows: TransferLogRow[];
  onCopy?: (value: string) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const count = rows.length;

  // Follow the conversation: jump to the newest message whenever one arrives.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  if (count === 0) {
    return (
      <section
        aria-label="Room stream"
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        <p className="text-muted-foreground text-sm text-pretty">
          No messages yet. Send text, a link, or a file to start.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Room stream" className="flex-1 overflow-y-auto">
      <ul role="list" className="flex flex-col gap-3 py-2">
        {rows.map((row) => (
          <MessageBubble key={row.id} row={row} onCopy={onCopy} />
        ))}
      </ul>
      <div ref={endRef} />
    </section>
  );
}
