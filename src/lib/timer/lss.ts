// .lss import/export helpers: reading a picked/dropped file, readable import errors,
// the export file name and the download. Parsing and saving themselves are done by
// livesplit-core (core.ts / the timer store).

import { EmptyRunError, RunParseError } from './core';

/** Larger files are refused before parsing (an .lss with many icons is a few MB at most). */
export const MAX_SPLITS_FILE_BYTES = 50 * 1024 * 1024;

export class SplitsFileTooLargeError extends Error {
  constructor() {
    super('The file is too large to be a splits file.');
    this.name = 'SplitsFileTooLargeError';
  }
}

/**
 * Reads a picked or dropped file as bytes. livesplit-core's `parseArray` detects the text
 * encoding itself (UTF-8/UTF-16, BOM), so the file isn't decoded here.
 */
export async function readSplitsFile(file: Blob): Promise<Uint8Array> {
  if (file.size > MAX_SPLITS_FILE_BYTES) throw new SplitsFileTooLargeError();
  return new Uint8Array(await file.arrayBuffer());
}

/** A message for the user explaining why `fileName` couldn't be imported. */
export function importErrorMessage(error: unknown, fileName: string): string {
  const name = fileName ? `"${fileName}"` : 'The file';
  if (error instanceof RunParseError) {
    return `${name} could not be read as a splits file. Use a LiveSplit .lss file (or another split format livesplit-core supports).`;
  }
  if (error instanceof EmptyRunError) return `${name} has no segments.`;
  if (error instanceof SplitsFileTooLargeError) return `${name} is too large to be a splits file.`;
  const detail = error instanceof Error ? error.message : String(error);
  return `${name} could not be imported: ${detail}`;
}

/** What `importSplitsFile` needs from the timer store. */
export interface SplitsTarget {
  readonly phase: string;
  /** Parses and loads the run; throws `RunParseError` / `EmptyRunError`. */
  loadSplits(input: Uint8Array): void;
}

export const ATTEMPT_IN_PROGRESS_MESSAGE =
  'Reset the current attempt before importing another run.';

/**
 * Reads, parses and loads a splits file into the store. Returns `null` on success or a
 * readable error message. Refuses while an attempt is in progress (running, paused or
 * finished but not reset), so an attempt is never thrown away by a stray drop.
 */
export async function importSplitsFile(
  target: SplitsTarget,
  file: Blob & { readonly name?: string },
): Promise<string | null> {
  const fileName = file.name ?? '';
  if (target.phase !== 'NotRunning') return ATTEMPT_IN_PROGRESS_MESSAGE;
  try {
    const bytes = await readSplitsFile(file);
    // Checked again: the phase may have changed while the file was read.
    if (target.phase !== 'NotRunning') return ATTEMPT_IN_PROGRESS_MESSAGE;
    target.loadSplits(bytes);
    return null;
  } catch (error) {
    return importErrorMessage(error, fileName);
  }
}

// Characters that are invalid in file names on Windows/macOS/Linux, and control characters.
const invalidFileNameChars = /[<>:"/\\|?*\u0000-\u001f]+/g;

/** `Game - Category.lss`, made safe for file systems; `splits.lss` if both are empty. */
export function lssFileName(game: string, category: string): string {
  const base = [game, category]
    .map((part) => part.replace(invalidFileNameChars, ' ').replace(/\s+/g, ' ').trim())
    .filter((part) => part !== '')
    .join(' - ')
    // Trailing dots/spaces are stripped by Windows; keep names reasonably short.
    .slice(0, 120)
    .replace(/[. ]+$/, '');
  return `${base || 'splits'}.lss`;
}

/** Offers `text` as a file download (Blob + `<a download>`). Browser only. */
export function downloadText(text: string, fileName: string): void {
  // octet-stream, so browsers (Safari) don't append `.xml`/`.txt` to the name.
  const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke later: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
