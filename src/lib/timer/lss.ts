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

export const ATTEMPT_IN_PROGRESS_MESSAGE = 'Reset the current attempt before loading other splits.';

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

/**
 * Removes one attempt from .lss text: its `<Attempt id>` from the attempt history, its
 * `<Time id>` from every segment history, and one from the attempt count. livesplit-core
 * has no call for this (only `clearHistory`), so the .lss is edited instead. Meant for the
 * core's own output (`saveAsLss`), whose layout is fixed. The personal best and the best
 * segments stay as they are (like in LiveSplit, they aren't derived from the history).
 * Returns `null` if the attempt isn't in the history.
 */
export function removeAttemptFromLss(lss: string, index: number): string | null {
  if (!Number.isSafeInteger(index)) return null;
  // Self-closing first (`/>` is matched before a lone `>`), else up to the closing tag.
  const element = (tag: string) =>
    new RegExp(`\\s*<${tag} id="${index}"(?=[\\s/>])[^>]*?(?:/>|>[\\s\\S]*?</${tag}>)`, 'g');
  let found = false;
  let text = lss.replace(/<AttemptHistory>[\s\S]*?<\/AttemptHistory>/, (block) =>
    block.replace(element('Attempt'), () => {
      found = true;
      return '';
    }),
  );
  if (!found) return null;
  text = text.replace(/<SegmentHistory>[\s\S]*?<\/SegmentHistory>/g, (block) =>
    block.replace(element('Time'), ''),
  );
  return text.replace(
    /<AttemptCount>(\d+)<\/AttemptCount>/,
    (_, count: string) => `<AttemptCount>${Math.max(0, Number(count) - 1)}</AttemptCount>`,
  );
}

/** Segment names from a text field: one per line, trimmed, empty lines skipped. */
export function parseSegmentNames(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
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
