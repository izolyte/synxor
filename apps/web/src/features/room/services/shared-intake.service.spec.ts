import { afterEach, beforeEach, expect, suite, test } from "~test/kit";
import { drainSharedCache, sharedIntake } from "~/features/room/services/shared-intake.service";

// A fake CacheStorage holding exactly what the service worker writes for a share
// (public/sw.js): a JSON meta entry plus one Response per file. No jsdom, no real
// Cache — just the `caches` surface drainSharedCache touches.
function fakeCaches(entries: Map<string, Response>): CacheStorage {
  const cache = {
    match: (key: string) => Promise.resolve(entries.get(key)),
    delete: (key: string) => Promise.resolve(entries.delete(key)),
  };
  return { open: () => Promise.resolve(cache) } as unknown as CacheStorage;
}

function stash(id: string, meta: unknown, files: { index: number; file: File }[]): CacheStorage {
  const entries = new Map<string, Response>();
  entries.set(`/__share__/${id}/meta`, new Response(JSON.stringify(meta)));
  for (const { index, file } of files) {
    entries.set(`/__share__/${id}/file/${index}`, new Response(file));
  }
  return fakeCaches(entries);
}

const original = globalThis.caches;
afterEach(() => {
  Reflect.set(globalThis, "caches", original);
  sharedIntake.take(); // clear any slot a test left behind
});

suite("sharedIntake", () => {
  test("take reads and clears the slot — a share is consumed once", () => {
    const payload = { text: "hi", files: [] };
    sharedIntake.set(payload);
    expect(sharedIntake.take()).toBe(payload);
    expect(sharedIntake.take()).toBe(null);
  });
});

suite("drainSharedCache", () => {
  beforeEach(() => {
    // Each test installs its own fake; default to none so a miss is explicit.
    Reflect.set(globalThis, "caches", undefined);
  });

  test("folds text and a distinct url into one composer seed", async () => {
    Reflect.set(
      globalThis,
      "caches",
      stash("s1", { text: "look at this", url: "https://x.dev" }, []),
    );
    const payload = await drainSharedCache("s1");
    expect(payload).toEqual({ text: "look at this\nhttps://x.dev", files: [] });
  });

  test("drops a url that only repeats the text", async () => {
    Reflect.set(
      globalThis,
      "caches",
      stash("s2", { text: "https://x.dev", url: "https://x.dev" }, []),
    );
    const payload = await drainSharedCache("s2");
    expect(payload?.text).toBe("https://x.dev");
  });

  test("falls back to the title when there's no text or url", async () => {
    Reflect.set(globalThis, "caches", stash("s3", { title: "A page" }, []));
    const payload = await drainSharedCache("s3");
    expect(payload?.text).toBe("A page");
  });

  test("reconstructs shared files with their names and types", async () => {
    const meta = { text: "", files: [{ name: "doc.pdf", type: "application/pdf" }] };
    Reflect.set(
      globalThis,
      "caches",
      stash("s4", meta, [
        { index: 0, file: new File(["hi"], "doc.pdf", { type: "application/pdf" }) },
      ]),
    );
    const payload = await drainSharedCache("s4");
    expect(payload?.files.length).toBe(1);
    expect(payload?.files[0].name).toBe("doc.pdf");
    expect(payload?.files[0].type).toBe("application/pdf");
  });

  test("clears the stash so a reload can't replay the share", async () => {
    const entries = new Map<string, Response>();
    entries.set(`/__share__/s5/meta`, new Response(JSON.stringify({ text: "once" })));
    Reflect.set(globalThis, "caches", fakeCaches(entries));

    await drainSharedCache("s5");
    expect(entries.has(`/__share__/s5/meta`)).toBe(false);
  });

  test("returns null on a cache miss", async () => {
    Reflect.set(globalThis, "caches", fakeCaches(new Map()));
    expect(await drainSharedCache("missing")).toBe(null);
  });

  test("returns null when the Cache API is unavailable", async () => {
    Reflect.set(globalThis, "caches", undefined);
    expect(await drainSharedCache("s6")).toBe(null);
  });
});
