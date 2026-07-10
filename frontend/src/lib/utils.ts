/**
 * Utility functions for the AgriMind platform.
 */

/** Format a date string to a human-readable local date. */
export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

/** Format a date string as relative time (e.g. "2 hours ago"). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Convert confidence score to a label. */
export function confidenceLabel(score: number): string {
  if (score >= 85) return 'High';
  if (score >= 65) return 'Medium';
  return 'Low';
}

/** Return Tailwind color class for a risk level. */
export function riskColor(risk: string): string {
  const level = risk.toLowerCase();
  if (level === 'high') return 'text-terra-400';
  if (level === 'medium') return 'text-wheat-400';
  return 'text-moss-400';
}

/** Truncate text to a maximum length with ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Build a URLSearchParams string from a plain object. */
export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== '') q.set(key, String(val));
  }
  const str = q.toString();
  return str ? `?${str}` : '';
}

/** Capitalize the first letter of a string. */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Format a number as Indian currency string. */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
