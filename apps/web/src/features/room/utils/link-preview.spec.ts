import { describe, expect, it } from "vitest";
import { deriveLinkPreview } from "~/features/room/utils/link-preview";

describe("deriveLinkPreview", () => {
  it("extracts the domain and strips a leading www.", () => {
    expect(deriveLinkPreview("https://www.example.com/").domain).toBe("example.com");
  });

  it("derives a readable title from the last path segment", () => {
    const { title, domain } = deriveLinkPreview(
      "https://linear.app/blog/how-we-redesigned-the-ui",
    );
    expect(title).toBe("How we redesigned the ui");
    expect(domain).toBe("linear.app");
  });

  it("drops a trailing file extension from the title", () => {
    expect(deriveLinkPreview("https://host.dev/docs/setup.html").title).toBe("Setup");
  });

  it("falls back to the domain as the title when there's no meaningful path", () => {
    expect(deriveLinkPreview("https://example.com/?ref=x").title).toBe("example.com");
  });

  it("keeps the original url as the href to open", () => {
    const url = "https://example.com/a/b?q=1#frag";
    expect(deriveLinkPreview(url).href).toBe(url);
  });

  it("guards a malformed url instead of throwing the row", () => {
    const preview = deriveLinkPreview("not a url");
    expect(preview.href).toBe("not a url");
    expect(preview.domain).toBe("not a url");
  });
});
