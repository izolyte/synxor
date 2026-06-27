import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CodeGenerator } from '../../domain/security/code-generator';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../../domain/room/room-code';

const BYTE_VALUE_COUNT = 256;
// Largest multiple of the alphabet size that fits in a byte; values at or above
// it would skew the modulo toward the first few characters, so reject them.
const REJECTION_THRESHOLD =
  Math.floor(BYTE_VALUE_COUNT / ROOM_CODE_ALPHABET.length) * ROOM_CODE_ALPHABET.length;
// Draw extra bytes per batch so the ~1.6% rejection rate rarely forces a refill.
const SAMPLE_BATCH_SIZE = ROOM_CODE_LENGTH * 2;

@Injectable()
export class CryptoCodeGenerator implements CodeGenerator {
  generate(): string {
    let code = '';
    let bytes = randomBytes(SAMPLE_BATCH_SIZE);
    let cursor = 0;
    while (code.length < ROOM_CODE_LENGTH) {
      if (cursor >= bytes.length) {
        bytes = randomBytes(SAMPLE_BATCH_SIZE);
        cursor = 0;
      }
      const byte = bytes[cursor++];
      if (byte < REJECTION_THRESHOLD) {
        code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
      }
    }
    return code;
  }
}
