import { useEffect, useRef } from 'react';
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
  // Keep latest references so unmount/debounce always use current values
  const buildSessionRef = useRef(buildSession);
  const shouldSaveRef = useRef(shouldSave);
  buildSessionRef.current = buildSession;
  shouldSaveRef.current = shouldSave;

  const doSave = () => {
    if (savingRef.current) return;
    if (!shouldSaveRef.current) return;
    savingRef.current = true;
    try {
      const session = buildSessionRef.current();
      upsertSessionAsync(session)
        .then(() => {})
        .catch(() => {})
        .finally(() => { savingRef.current = false; });
    } catch {
      savingRef.current = false;
    }
  };

  // Debounced save on input changes
  useEffect(() => {
    // Skip the initial mount to avoid saving defaults
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    if (!shouldSaveRef.current) return;

    // Clear previous timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Debounce: save 1.5s after last change
    timeoutRef.current = setTimeout(doSave, 1500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Save immediately on unmount (navigating away)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      doSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
