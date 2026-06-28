/// <reference types="vite/client" />

interface ImportMetaEnv {
  // api host the tRPC client targets; defaults to localhost:3000 when unset.
  readonly VITE_API_URL?: string;
}

declare module "@fontsource-variable/geist/*";
declare module "@fontsource-variable/geist-mono/*";
