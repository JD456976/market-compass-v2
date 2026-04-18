import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export function PWAUpdateToast() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) {
        // Check every 5 minutes and on tab focus
        setInterval(() => { registration.update(); }, 5 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update();
        });
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast('A new version is available', {
        description: 'Tap to update Market Compass.',
        icon: <RefreshCw className="h-4 w-4 text-primary" />,
        duration: Infinity,
        action: {
          label: 'Update now',
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}

