// Admin allowlist configuration
// Only these emails can access the /admin route

export const ADMIN_EMAILS = [
  'jason.craig@chinattirealty.com',
  'jdog45@gmail.com', // temporary development admin
] as const;

export function isAllowedAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase() as typeof ADMIN_EMAILS[number]);
}
