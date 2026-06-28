// The Room Token authorizes the sender's actions inside a Room. The service holds
// it keyed by Room Code behind an injected storage backend, so it depends on the
// small RoomTokenStorage abstraction rather than a concrete Web Storage — loose
// coupling that also makes it trivially fakeable in tests.

export interface RoomTokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class RoomTokenService {
  constructor(private readonly storage: RoomTokenStorage) {}

  private keyFor(roomCode: string): string {
    return `synxor.room.${roomCode}.token`;
  }

  /** Persists a Room Token against its Room Code. */
  store(roomCode: string, token: string): void {
    this.storage.setItem(this.keyFor(roomCode), token);
  }

  /** Reads the stored Room Token for a Room Code, or null if none is held. */
  get(roomCode: string): string | null {
    return this.storage.getItem(this.keyFor(roomCode));
  }
}

function memoryStorage(): RoomTokenStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
  };
}

// sessionStorage in the browser (per-tab, cleared on close); an in-memory fallback
// on the server (no window) and whenever Web Storage throws (private mode, disabled
// storage) so token access never crashes the create flow.
function defaultStorage(): RoomTokenStorage {
  const fallback = memoryStorage();
  if (typeof window === "undefined") return fallback;

  try {
    const storage = window.sessionStorage;
    return {
      getItem: (key) => {
        try {
          return storage.getItem(key);
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
export const roomTokenService = new RoomTokenService(defaultStorage());
