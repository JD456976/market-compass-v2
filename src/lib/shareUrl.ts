/**
 * Build the public share URL for a report.
 * Uses the published domain so recipients don't need a Lovable account.
 * Falls back to window.location.origin for local dev.
 */

const PUBLISHED_ORIGIN = 'https://market-compass-v2.lovable.app';

export function getShareUrl(shareTokenOrId: string): string {
  // Always use the published origin so share links work for recipients
  // without requiring a Lovable account login
  return `${PUBLISHED_ORIGIN}/share/${shareTokenOrId}`;
}
