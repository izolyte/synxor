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

  it("sends the room token as a Bearer header", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        okResponse({ transferId: "t1", receivedChunks: 1, totalChunks: 1, complete: true }),
      );
    await uploadFileInChunks({ file: fileOfSize(10), token: "tok", apiOrigin: "http://a", fetchFn });
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
