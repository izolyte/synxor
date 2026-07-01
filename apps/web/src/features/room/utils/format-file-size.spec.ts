import { describe, expect, it } from "vitest";
import { formatFileSize } from "~/features/room/utils/format-file-size";

describe("formatFileSize", () => {
  it("reads a zero-byte file as Empty file", () => {
    expect(formatFileSize(0)).toBe("Empty file");
  });

  it("keeps bytes unitless-precise", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("strips a trailing .0", () => {
    expect(formatFileSize(10 * 1024 * 1024 * 1024)).toBe("10 GB");
  });

  it("keeps one decimal when it isn't zero", () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("scales up through KB/MB/GB/TB", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(1024 ** 4)).toBe("1 TB");
  });
});
