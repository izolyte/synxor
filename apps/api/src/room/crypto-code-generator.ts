import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ICodeGenerator } from './code-generator.interface';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
// floor(256 / 36) * 36 = 252 — bytes at or above this would skew the modulo
// toward the first 4 letters, so reject them.
const REJECTION_THRESHOLD = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
// Over-allocate so the ~1.6% rejection rate almost never forces a refill.
const BUFFER_SIZE = CODE_LENGTH * 2;

@Injectable()
export class CryptoCodeGenerator implements ICodeGenerator {
  generate(): string {
    let result = '';
    let buffer = randomBytes(BUFFER_SIZE);
    let i = 0;
    while (result.length < CODE_LENGTH) {
      if (i >= buffer.length) {
        buffer = randomBytes(BUFFER_SIZE);
        i = 0;
      }
      const byte = buffer[i++];
      if (byte < REJECTION_THRESHOLD) {
        result += ALPHABET[byte % ALPHABET.length];
      }
    }
    return result;
  }
}
