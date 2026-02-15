import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Persistent banner shown when the device loses network connectivity.
 * Renders at the very top of the viewport above the global nav.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-destructive-foreground text-sm font-medium"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You're offline. Changes won't be saved until you reconnect.</span>
    </div>
  );
}
