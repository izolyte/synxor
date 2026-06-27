import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ICodeGenerator } from './code-generator.interface';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
// Rejection threshold: floor(256 / 36) * 36 = 252 — eliminates modulo bias
const REJECTION_THRESHOLD = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

@Injectable()
export class CryptoCodeGenerator implements ICodeGenerator {
  generate(): string {
    let result = '';
    while (result.length < CODE_LENGTH) {
      const byte = randomBytes(1)[0];
      if (byte < REJECTION_THRESHOLD) {
        result += ALPHABET[byte % ALPHABET.length];
      }
    }
    return result;
  }
}
