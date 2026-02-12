/**
 * Build the public share URL for a report.
 * Uses the published domain so recipients don't need a Lovable account.
 * Falls back to window.location.origin for local dev.
 */

const PUBLISHED_ORIGIN = 'https://market-compass-v2.lovable.app';

export function getShareUrl(shareTokenOrId: string): string {
  // In production (published app), always use the published origin
  // In dev/preview, fall back to current origin
  const origin = import.meta.env.PROD ? PUBLISHED_ORIGIN : window.location.origin;
  return `${origin}/share/${shareTokenOrId}`;
}
