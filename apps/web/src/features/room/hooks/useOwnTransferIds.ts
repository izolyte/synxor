import { useCallback, useState } from "react";

// Per-tab record of the transferIds this client has sent, so its own messages
// stay attributed to it across a reload — the socket only broadcasts to *other*
// Participants, so on reload nothing else marks a hydrated history row as "yours".
// Keyed per Room and held in sessionStorage: a Room is only viewable in the tab
// that created or joined it, which is the same tab this set lives in.

const keyFor = (roomCode: string) => `synxor.room.${roomCode}.sent`;

function read(roomCode: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(keyFor(roomCode));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function persist(roomCode: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(keyFor(roomCode), JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode, disabled) — own attribution just won't
    // survive a reload; the live session still tags outgoing messages correctly.
  }
}

export interface OwnTransferIds {
  ids: ReadonlySet<string>;
  add: (id: string) => void;
}

export function useOwnTransferIds(roomCode: string): OwnTransferIds {
  const [ids, setIds] = useState<Set<string>>(() => new Set(read(roomCode)));

  const add = useCallback(
    (id: string) => {
      setIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        persist(roomCode, [...next]);
        return next;
      });
    },
    [roomCode],
  );

  return { ids, add };
}
