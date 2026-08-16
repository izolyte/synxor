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

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === "/share") {
    event.respondWith(handleShare(event.request));
  }
  // No respondWith otherwise → default browser networking.
});

async function handleShare(request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((f) => f instanceof File && f.size > 0);
    const id = crypto.randomUUID();
    const cache = await caches.open(SHARE_CACHE);

    const meta = {
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
    // Nothing salvageable from the share — drop them onto the landing anyway.
    return Response.redirect("/", 303);
  }
}

function metaKey(id) {
  return `/__share__/${id}/meta`;
}
function fileKey(id, index) {
  return `/__share__/${id}/file/${index}`;
}
