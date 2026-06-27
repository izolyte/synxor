export const CODE_GENERATOR = Symbol('CODE_GENERATOR');

export interface ICodeGenerator {
  generate(): string;
}
