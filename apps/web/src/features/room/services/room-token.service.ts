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

// sessionStorage in the browser (per-tab, cleared on close); an in-memory map on
// the server (SSR has no window) so the singleton is always usable.
function defaultStorage(): RoomTokenStorage {
  if (typeof window !== "undefined") return window.sessionStorage;
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
  };
}

// App-wide instance; tests construct their own with a fake storage.
export const roomTokenService = new RoomTokenService(defaultStorage());
