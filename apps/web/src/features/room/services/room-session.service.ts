// What the client holds about a Room it's in: the Room Token that authorizes its
// actions, plus the Sender's expiry (drives the share-view countdown). Kept behind
// an injected storage backend, so it depends on the small RoomSessionStorage
// abstraction rather than a concrete Web Storage — loose coupling that also makes
// it trivially fakeable in tests.

export interface RoomSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RoomSession {
  token: string;
  // ISO 8601, Sender only — the Receiver's join response carries no expiry. Absent
  // means no countdown source.
  expiresAt?: string;
}

export class RoomSessionService {
  constructor(private readonly storage: RoomSessionStorage) {}

  private keyFor(roomCode: string): string {
    return `synxor.room.${roomCode}.session`;
  }

  /** Persists a Room session against its Room Code. */
  store(roomCode: string, session: RoomSession): void {
    this.storage.setItem(this.keyFor(roomCode), JSON.stringify(session));
  }

  /** Reads the stored Room session for a Room Code, or null if none is held. */
  get(roomCode: string): RoomSession | null {
    const raw = this.storage.getItem(this.keyFor(roomCode));
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      // Tolerate anything stale or hand-tampered in storage: only a shape with a
      // token string is a session; everything else reads as "none held".
      const p = parsed as Record<string, unknown>;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof p.token === "string" &&
        (p.expiresAt === undefined || typeof p.expiresAt === "string")
      ) {
        return parsed as RoomSession;
      }
      return null;
    } catch {
      return null;
    }
  }
}

function memoryStorage(): RoomSessionStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
  };
}

// sessionStorage in the browser (per-tab, cleared on close); an in-memory fallback
// on the server (no window) and whenever Web Storage throws (private mode, disabled
// storage) so session access never crashes the create/join flows.
function defaultStorage(): RoomSessionStorage {
  const fallback = memoryStorage();
  if (typeof window === "undefined") return fallback;

  try {
    const storage = window.sessionStorage;
    return {
      getItem: (key) => {
        try {
          return storage.getItem(key) ?? fallback.getItem(key);
        } catch {
          return fallback.getItem(key);
        }
      },
      setItem: (key, value) => {
        try {
          storage.setItem(key, value);
        } catch {
          fallback.setItem(key, value);
        }
      },
    };
  } catch {
    return fallback;
  }
}

// App-wide instance; tests construct their own with a fake storage.
export const roomSessionService = new RoomSessionService(defaultStorage());
