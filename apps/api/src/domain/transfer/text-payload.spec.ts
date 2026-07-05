import { classifyTextPayload } from './text-payload';

describe('classifyTextPayload', () => {
  it('classifies an http(s) URL as a Link and trims it', () => {
    expect(classifyTextPayload('  https://example.com/path?q=1  ')).toEqual({
      payloadType: 'LINK',
      content: 'https://example.com/path?q=1',
    });
    expect(classifyTextPayload('http://localhost:3000')).toEqual({
      payloadType: 'LINK',
      content: 'http://localhost:3000',
    });
  });

  it('treats non-http(s) URL schemes as a Text Snippet', () => {
    // Parseable URLs, but not something the Receiver should "open" in a browser.
    expect(classifyTextPayload('mailto:a@b.com').payloadType).toBe('TEXT_SNIPPET');
    expect(classifyTextPayload('ftp://host/file').payloadType).toBe('TEXT_SNIPPET');
  });

  it('classifies plain text as a Text Snippet, verbatim', () => {
    const text = '  meeting notes:\n  - ship #18  ';
    expect(classifyTextPayload(text)).toEqual({ payloadType: 'TEXT_SNIPPET', content: text });
  });

  it('classifies a bare word (not a URL) as a Text Snippet', () => {
    expect(classifyTextPayload('example.com').payloadType).toBe('TEXT_SNIPPET');
  });
});
