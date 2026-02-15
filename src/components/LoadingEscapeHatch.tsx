import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

interface LoadingEscapeHatchProps {
  /** Whether the parent is in a loading/processing state */
  isLoading: boolean;
  /** Seconds to wait before showing the escape hatch (default: 10) */
  delaySeconds?: number;
  /** Called when user clicks "Try Again" */
  onRetry?: () => void;
  /** Called when user clicks "Cancel" */
  onCancel?: () => void;
  /** Custom message */
  message?: string;
}

/**
 * Shows a "taking too long?" UI after a configurable delay.
 * Renders nothing until the timer fires while isLoading is true.
 */
export function LoadingEscapeHatch({
  isLoading,
  delaySeconds = 10,
  onRetry,
  onCancel,
  message = 'This is taking longer than expected.',
}: LoadingEscapeHatchProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      timerRef.current = setTimeout(() => setShow(true), delaySeconds * 1000);
    } else {
      setShow(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, delaySeconds]);

  if (!isLoading || !show) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border text-sm animate-fade-up">
      <span className="text-muted-foreground flex-1">{message}</span>
      <div className="flex gap-1.5 shrink-0">
        {onRetry && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
        {onCancel && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
