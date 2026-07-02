import { describe, expect, it, vi } from "vitest";
import { CHUNK_SIZE_BYTES } from "~/features/room/constants/transfer";
import {
  downloadUrl,
  uploadFileInChunks,
  UploadError,
} from "~/features/room/services/chunk-upload.service";

function fileOfSize(bytes: number, name = "video.mp4"): File {
  return new File([new Uint8Array(bytes)], name, { type: "video/mp4" });
}

function okResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 201 });
}

describe("uploadFileInChunks", () => {
  it("uploads a multi-chunk file sequentially, threading the transferId", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        okResponse({ transferId: "t1", receivedChunks: 1, totalChunks: 2, complete: false }),
      )
      .mockResolvedValueOnce(
        okResponse({ transferId: "t1", receivedChunks: 2, totalChunks: 2, complete: true }),
      );
    const progress: number[] = [];

    const result = await uploadFileInChunks({
      file: fileOfSize(CHUNK_SIZE_BYTES + 100),
      token: "tok",
      apiOrigin: "http://api.test",
      onProgress: (p) => progress.push(p),
      fetchFn,
    });

    expect(result.complete).toBe(true);
    expect(progress).toEqual([50, 100]);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const firstBody = fetchFn.mock.calls[0][1]?.body as FormData;
    expect(firstBody.get("transferId")).toBeNull();
    expect(firstBody.get("chunkIndex")).toBe("0");
    const secondBody = fetchFn.mock.calls[1][1]?.body as FormData;
    expect(secondBody.get("transferId")).toBe("t1");
    expect((secondBody.get("chunk") as Blob).size).toBe(100);
  });

  it("treats a zero-byte file as one chunk", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        okResponse({ transferId: "t1", receivedChunks: 1, totalChunks: 1, complete: true }),
      );
    const result = await uploadFileInChunks({
      file: fileOfSize(0),
      token: "tok",
      apiOrigin: "http://api.test",
      fetchFn,
    });
    expect(result.complete).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("maps HTTP failures to user-facing messages", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 409 }));
    await expect(
      uploadFileInChunks({ file: fileOfSize(10), token: "tok", apiOrigin: "http://a", fetchFn }),
    ).rejects.toThrow(UploadError);
    await expect(
      uploadFileInChunks({ file: fileOfSize(10), token: "tok", apiOrigin: "http://a", fetchFn }),
    ).rejects.toThrow(/10 Transfers in flight/);
  });

  // One case per branch of the status→message map (mirrors the API's
  // transfer-error.filter); the copy is what the row shows the user.
  it.each([
    [413, /exceeds the size limit/],
    [401, /no longer valid/],
    [500, /Check your connection/],
  ])("status %d reads as its own user-facing message", async (status, message) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
    await expect(
      uploadFileInChunks({ file: fileOfSize(10), token: "tok", apiOrigin: "http://a", fetchFn }),
    ).rejects.toThrow(message);
  });

  it("carries the status on the thrown UploadError", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 413 }));
    const attempt = uploadFileInChunks({
      file: fileOfSize(10),
      token: "tok",
      apiOrigin: "http://a",
      fetchFn,
    });
    await expect(attempt).rejects.toMatchObject({ name: "UploadError", status: 413 });
  });

  it("sends the file's declared MIME type and metadata with each chunk", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        okResponse({ transferId: "t1", receivedChunks: 1, totalChunks: 1, complete: true }),
      );
    await uploadFileInChunks({
      file: fileOfSize(10, "video.mp4"),
      token: "tok",
      apiOrigin: "http://a",
      fetchFn,
    });

    const body = fetchFn.mock.calls[0][1]?.body as FormData;
    expect(body.get("mimeType")).toBe("video/mp4");
    expect(body.get("fileName")).toBe("video.mp4");
    expect(body.get("fileSizeBytes")).toBe("10");
    expect(body.get("totalChunks")).toBe("1");
  });

  it("falls back to application/octet-stream when the browser reports no type", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        okResponse({ transferId: "t1", receivedChunks: 1, totalChunks: 1, complete: true }),
      );
    const typeless = new File([new Uint8Array(10)], "mystery.bin", { type: "" });
    await uploadFileInChunks({ file: typeless, token: "tok", apiOrigin: "http://a", fetchFn });

    const body = fetchFn.mock.calls[0][1]?.body as FormData;
    expect(body.get("mimeType")).toBe("application/octet-stream");
  });

  it("sends the room token as a Bearer header", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        okResponse({ transferId: "t1", receivedChunks: 1, totalChunks: 1, complete: true }),
      );
    await uploadFileInChunks({
      file: fileOfSize(10),
      token: "tok",
      apiOrigin: "http://a",
      fetchFn,
    });
    expect(fetchFn.mock.calls[0][1]?.headers).toEqual({ Authorization: "Bearer tok" });
  });
});

describe("downloadUrl", () => {
  it("URL-encodes the transferId and token", () => {
    expect(downloadUrl("http://a", "id/1", "tok&x")).toBe(
      "http://a/transfer/id%2F1/download?token=tok%26x",
    );
  });
});
