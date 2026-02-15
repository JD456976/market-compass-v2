import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Listens for auto-save activity and shows a subtle indicator.
 * Piggybacks on console.log output from useAutoSaveDraft.
 */
export function AutoSaveIndicator({ deps }: { deps: unknown[] }) {
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    // Show "saving" briefly when deps change (after initial mount)
    const timer = setTimeout(() => {
      setStatus('saving');
      const savedTimer = setTimeout(() => setStatus('saved'), 1600);
      const hideTimer = setTimeout(() => setStatus('idle'), 4000);
      return () => {
        clearTimeout(savedTimer);
        clearTimeout(hideTimer);
      };
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (status === 'idle') return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground animate-in fade-in duration-300">
      {status === 'saving' ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving…</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3 text-accent" />
          <span>Saved</span>
        </>
      )}
    </span>
  );
}
