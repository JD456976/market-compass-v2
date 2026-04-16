// Admin allowlist — emails that can access /admin and have full platform access
// Primary account: craig219@comcast.net

export const ADMIN_EMAILS = [
  'craig219@comcast.net',
  'jason.craig@chinattirealty.com', // legacy — transitioning to comcast email
  'jdog45@gmail.com',
] as const;

export function isAllowedAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(a => a.toLowerCase() === email.toLowerCase());
}
