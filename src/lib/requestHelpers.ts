/**
 * Utility helpers for resilient network requests.
 */

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * `ms` milliseconds, the returned promise rejects with a TimeoutError.
 *
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds (default: 15 000)
 */
export function withTimeout<T>(promise: Promise<T>, ms = 15_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`Request timed out after ${Math.round(ms / 1000)}s`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Maps raw Supabase / backend error messages to user-friendly strings.
 * Falls back to a generic message if no match is found.
 */
export function friendlyErrorMessage(raw: string | undefined | null): string {
  if (!raw) return 'Something went wrong. Please try again.';

  const msg = raw.toLowerCase();

  // Auth errors
  if (msg.includes('invalid login credentials')) return 'Invalid email or password. Please try again.';
  if (msg.includes('email not confirmed')) return 'Please verify your email address before signing in.';
  if (msg.includes('user already registered')) return 'An account with this email already exists.';
  if (msg.includes('jwt expired') || msg.includes('token is expired')) return 'Your session has expired. Please sign in again.';
  if (msg.includes('refresh_token_not_found')) return 'Your session has expired. Please sign in again.';
  if (msg.includes('invalid claim')) return 'Your session is no longer valid. Please sign in again.';
  if (msg.includes('email rate limit')) return 'Too many attempts. Please wait a few minutes and try again.';
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Too many requests. Please wait a moment and try again.';
  if (msg.includes('password') && msg.includes('at least')) return raw; // keep password requirements

  // DB errors
  if (msg.includes('duplicate key')) return 'This record already exists.';
  if (msg.includes('violates foreign key')) return 'This action references data that no longer exists.';
  if (msg.includes('permission denied') || msg.includes('rls')) return 'You don\'t have permission to perform this action.';
  if (msg.includes('pgrst')) return 'A data error occurred. Please try again.';

  // Network
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed'))
    return 'Network error. Please check your connection and try again.';
  if (msg.includes('timeout') || msg.includes('timed out'))
    return 'The request took too long. Please try again.';

  // Generic — truncate if very long
  if (raw.length > 120) return 'Something went wrong. Please try again.';

  return raw;
}
