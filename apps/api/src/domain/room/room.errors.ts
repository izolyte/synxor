import { DomainError } from '../shared/domain-error';

export class RoomCodeCollisionError extends DomainError {
  constructor(code: string) {
    super(`Room Code already in use: ${code}`);
  }
}

export class RoomCodeExhaustionError extends DomainError {
  constructor(attempts: number) {
    super(`Failed to generate a unique Room Code after ${attempts} attempts`);
  }
}

export class InvalidExpiryError extends DomainError {
  constructor(value: string) {
    super(`Unknown Expiry: ${value}`);
  }
}

export class RoomNotFoundError extends DomainError {
  constructor(code: string) {
    super(`No Room found for Room Code: ${code}`);
  }
}

export class RoomExpiredError extends DomainError {
  constructor(code: string) {
    super(`Room is no longer available: ${code}`);
  }
}
