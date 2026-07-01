// UI-side mirror of the server's MAX_FILE_SIZE_BYTES default (docs/PRD.md, CONTEXT.md)
// so an oversized file rejects at the Drop Zone instead of after an upload starts.
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024;

// OS artefacts that ride along with a folder/multi-file drag; never worth queueing.
export const IGNORED_FILENAMES = new Set([".DS_Store", "Thumbs.db"]);
