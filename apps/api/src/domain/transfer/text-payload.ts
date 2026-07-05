import type { PayloadType } from './transfer.entity';

// A Text Snippet or Link is delivered over the socket, never stored — so it caps
// at a size that's comfortable to hold in a socket frame and a clipboard.
export const MAX_TEXT_PAYLOAD_CHARS = 100_000;

export type TextPayloadType = Extract<PayloadType, 'TEXT_SNIPPET' | 'LINK'>;

export interface ClassifiedText {
  payloadType: TextPayloadType;
  content: string;
}

/**
 * Classifies pasted text by trying to parse it as a URL: a browser-openable
 * (http/https) URL is a Link, everything else a Text Snippet. Links carry the
 * trimmed URL so the Receiver's open action gets a clean href; snippets keep the
 * text verbatim.
 */
export function classifyTextPayload(text: string): ClassifiedText {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return { payloadType: 'LINK', content: trimmed };
    }
  } catch {
    // Not a URL — falls through to Text Snippet.
  }
  return { payloadType: 'TEXT_SNIPPET', content: text };
}
