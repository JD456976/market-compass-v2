import { useRegisterSW } from 'virtual:pwa-register/react';

// Silent auto-updater — applies new deploys in the background.
// No toast shown; the service worker installs and activates on next navigation.
export function PWAUpdateToast() {
  useRegisterSW({
    immediate: true,
    onNeedRefresh() {
      // Auto-skip waiting so the new SW activates without user interaction
    },
    onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) {
        // Poll every 5 minutes for new builds
        setInterval(() => { registration.update(); }, 5 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update();
        });
      }
    },
  });

  return null;
}

