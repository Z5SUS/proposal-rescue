/**
 * Date utilities used across the extension.
 * All dates are stored as ISO strings in chrome.storage.sync.
 */

/** Add `days` calendar days to `from` (defaults to now) */
export function addDays(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** Return ISO string `days` days from now */
export function isoInDays(days: number): string {
  return addDays(days).toISOString();
}

/** Format an ISO string for display, e.g. "Jun 24" or "Jun 24, 2025" */
export function formatDate(iso: string, includeYear = false): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (includeYear) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

/** Return a human-readable "N days ago" / "today" / "in N days" label */
export function relativeDays(iso: string): string {
  const diff = Math.round(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `in ${diff} days`;
}

/** How many whole days since an ISO date */
export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}
