// synxor's service worker exists for one reason: the Web Share Target. A share
// target that accepts files must be handled here — the browser POSTs the shared
// payload straight to the worker, with no server round-trip. We stash the shared
// text + files in the Cache and 303-redirect to the client /share route, which
// drains the stash into a fresh Room (see shared-intake.service.ts).
//
// Deliberately not a caching worker: every request other than the share POST
// falls through to the network untouched, so this can't stale the app or fight
// the dev server.

const SHARE_CACHE = "synxor-share";
// A stash is drained within seconds of the redirect. Anything still around after
// this was orphaned (cancelled redirect, client failure) — purge it so shared
// content, which can be sensitive, never lingers in the Cache. Matches synxor's
// ephemeral ethos and caps storage growth.
const SHARE_TTL_MS = 5 * 60 * 1000;
// Upper bound on files per share, used to sweep file entries when the count isn't
// known (a mid-write failure, or unreadable meta). Share sheets carry a handful.
const MAX_SHARE_FILES = 32;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(Promise.all([self.clients.claim(), purgeExpiredShares()])),
);

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === "/share") {
    event.respondWith(handleShare(event.request));
  }
  // No respondWith otherwise → default browser networking.
});

async function handleShare(request) {
  const cache = await caches.open(SHARE_CACHE);
  // Sweep orphaned stashes before adding one, so a stream of failed shares can't
  // accumulate.
  await purgeExpiredShares(cache);

  const id = crypto.randomUUID();
  try {
    const form = await request.formData();
    // Keep every real file, including a valid zero-byte one; drop only the empty,
    // nameless part browsers include when a text-only share carries no files.
    const files = form.getAll("files").filter((f) => f instanceof File && f.name);

    const meta = {
      createdAt: Date.now(),
      title: form.get("title") || "",
      text: form.get("text") || "",
      url: form.get("url") || "",
      files: files.map((file) => ({ name: file.name, type: file.type })),
    };

    await Promise.all(
      files.map((file, i) =>
        cache.put(
          fileKey(id, i),
          new Response(file, {
            headers: { "content-type": file.type || "application/octet-stream" },
          }),
        ),
      ),
    );
    await cache.put(
      metaKey(id),
      new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }),
    );

    return Response.redirect(`/share?share-id=${id}`, 303);
  } catch {
    // A partial write leaves half a stash behind — clear this id's entries, then
    // drop the user onto the landing anyway.
    await deleteShare(cache, id, MAX_SHARE_FILES);
    return Response.redirect("/", 303);
  }
}

async function purgeExpiredShares(existingCache) {
  const cache = existingCache || (await caches.open(SHARE_CACHE));
  const now = Date.now();
  const keys = await cache.keys();
  await Promise.all(
    keys.map(async (request) => {
      if (!request.url.endsWith("/meta")) return;
      try {
        const res = await cache.match(request);
        const meta = res ? await res.json() : null;
        if (!meta || now - (meta.createdAt || 0) > SHARE_TTL_MS) {
          const id = idFromMetaUrl(request.url);
          await deleteShare(cache, id, (meta && meta.files ? meta.files.length : 0) || MAX_SHARE_FILES);
        }
      } catch {
        await cache.delete(request);
      }
    }),
  );
}

async function deleteShare(cache, id, fileCount) {
  await cache.delete(metaKey(id));
  const deletes = [];
  for (let i = 0; i < fileCount; i++) deletes.push(cache.delete(fileKey(id, i)));
  await Promise.all(deletes);
}

function idFromMetaUrl(url) {
  const match = url.match(/\/__share__\/([^/]+)\/meta$/);
  return match ? match[1] : "";
}

function metaKey(id) {
  return `/__share__/${id}/meta`;
}
function fileKey(id, index) {
  return `/__share__/${id}/file/${index}`;
}
