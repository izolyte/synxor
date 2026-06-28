// The synxor test-domain surface: specs import UI vocabulary from here, the tool
// from "~test/kit". Domain data types are deliberately absent — the single source
// of truth is the backend tRPC AppRouter, so tests infer from it rather than
// redeclaring types here.

export { selectors, copy } from "./vocabulary";
