/** Collapse all whitespace runs (incl. newlines) to single spaces and trim. */
export const normalizeHeader = (h: unknown): string =>
  String(h ?? '').replace(/\s+/g, ' ').trim()

/** Stable id from a header: lowercase, non-alphanumerics to dashes. */
export const slugify = (h: string): string =>
  normalizeHeader(h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Index of the first header matching any pattern (tested against normalized text), or -1. */
export const findColumn = (headers: string[], ...patterns: RegExp[]): number =>
  headers.findIndex((h) => patterns.some((p) => p.test(normalizeHeader(h))))
