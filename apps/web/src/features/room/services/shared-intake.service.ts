// The handoff for a Web Share into the PWA. The service worker stashes the shared
// text + files in the Cache and redirects to the /share route; that route drains
// the Cache into memory here, creates a Room, and navigates into it, where the
// Room view drains the memory slot to pre-fill the composer and queue the files.
//
// Two hops, two stores: the Cache survives the service-worker redirect (a fresh
// document load), the in-memory slot carries File objects across the client-side
// navigation into the Room without serialising them through history/URL.

export interface SharedPayload {
  /** Composer seed — the shared text and/or link, one per line. May be empty. */
  text: string;
  files: File[];
}

// Keep in step with the keys the service worker writes (public/sw.js).
const SHARE_CACHE = "synxor-share";
const metaKey = (id: string) => `/__share__/${id}/meta`;
const fileKey = (id: string, index: number) => `/__share__/${id}/file/${index}`;

interface ShareMeta {
  // Epoch ms the service worker stashed this share; it uses the value to expire
  // orphaned stashes (public/sw.js). The client drain ignores it.
  createdAt?: number;
  title?: string;
  text?: string;
  url?: string;
  files?: { name: string; type: string }[];
}

let pending: SharedPayload | null = null;

/** The in-memory handoff across the client nav from /share into the Room. */
export const sharedIntake = {
  set(payload: SharedPayload): void {
    pending = payload;
  },
  /** Reads and clears the slot — a share is consumed once. */
  take(): SharedPayload | null {
    const payload = pending;
    pending = null;
    return payload;
  },
};

/**
 * Reads a stashed share out of the Cache by id and clears it, so a reload of the
 * /share URL can't replay a share that's already been consumed. Returns null when
 * there's nothing to read (direct visit, expired stash, Cache unavailable).
 */
export async function drainSharedCache(id: string): Promise<SharedPayload | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const metaRes = await cache.match(metaKey(id));
    if (!metaRes) return null;

    const meta = (await metaRes.json()) as ShareMeta;
    const entries = meta.files ?? [];
    const files: File[] = [];
    for (let i = 0; i < entries.length; i++) {
      const res = await cache.match(fileKey(id, i));
      if (!res) continue;
      const blob = await res.blob();
      files.push(new File([blob], entries[i].name || `shared-${i}`, { type: entries[i].type }));
    }

    await cache.delete(metaKey(id));
    await Promise.all(entries.map((_, i) => cache.delete(fileKey(id, i))));

    return { text: composeText(meta), files };
  } catch {
    return null;
  }
}

/**
 * Folds a share's title/text/url into one composer seed. Text and a distinct link
 * stack on their own lines; the title is only a fallback when a share carries
 * neither (rare, but some sources send just a title).
 */
function composeText(meta: ShareMeta): string {
  const text = (meta.text ?? "").trim();
  const url = (meta.url ?? "").trim();
  const bits: string[] = [];
  if (text) bits.push(text);
  if (url && url !== text) bits.push(url);
  return bits.join("\n") || (meta.title ?? "").trim();
}
