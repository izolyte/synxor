// Base for all domain-meaningful failures, so transports can map them uniformly
// (e.g. a tRPC error formatter) and tests can assert on a stable type.
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
