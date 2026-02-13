import { useEffect, useRef, useCallback } from 'react';
import { Session } from '@/types';
import { upsertSessionAsync } from '@/lib/storage';

/**
 * Debounced auto-save hook for intake flows.
 * Saves the session to Supabase after a short debounce (1.5s) on any input change.
 * Uses the session's `id` as the versioning key — same draft ID = update, not duplicate.
 */
export function useAutoSaveDraft(
  buildSession: () => Session,
  /** At least one meaningful field must be filled before saving */
  shouldSave: boolean,
  deps: unknown[],
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);
  const savingRef = useRef(false);

  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const session = buildSession();
      await upsertSessionAsync(session);
      console.log('Auto-saved draft:', session.id);
    } catch {
      // Silent fail
    } finally {
      savingRef.current = false;
    }
  }, [buildSession]);

  useEffect(() => {
    // Skip the initial mount to avoid saving defaults
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    if (!shouldSave) return;

    // Clear previous timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Debounce: save 1.5s after last change
    timeoutRef.current = setTimeout(() => {
      save();
    }, 1500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Also save immediately on unmount (navigating away)
  useEffect(() => {
    return () => {
      if (shouldSave) {
        // Fire-and-forget save on unmount
        try {
          const session = buildSession();
          upsertSessionAsync(session).catch(() => {});
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSave]);

  return { saveNow: save };
}
