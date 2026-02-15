import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const NOTIFICATION_PREPROMPT_KEY = 'mc_notification_preprompt_shown';

/**
 * Hook to enable browser push notifications for new messages and scenarios.
 * Includes a pre-prompt flow to explain why notifications are needed
 * before triggering the system permission dialog (App Store compliance).
 */
export function usePushNotifications(
  role: 'agent' | 'client',
  reportIds: string[]
) {
  const permissionRef = useRef<NotificationPermission>('default');
  const [showPrePrompt, setShowPrePrompt] = useState(false);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return;
    }
    if (Notification.permission === 'denied') return;

    // Check if we've already shown the pre-prompt and user dismissed it
    const alreadyShown = localStorage.getItem(NOTIFICATION_PREPROMPT_KEY);
    if (alreadyShown === 'dismissed') return;

    // Show pre-prompt instead of immediately requesting
    setShowPrePrompt(true);
  }, []);

  const confirmPermission = useCallback(async () => {
    setShowPrePrompt(false);
    localStorage.setItem(NOTIFICATION_PREPROMPT_KEY, 'accepted');
    if ('Notification' in window && Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
    }
  }, []);

  const dismissPrePrompt = useCallback(() => {
    setShowPrePrompt(false);
    localStorage.setItem(NOTIFICATION_PREPROMPT_KEY, 'dismissed');
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if (permissionRef.current !== 'granted') return;
    if (document.visibilityState === 'visible') return;

    try {
      new Notification(title, {
        body,
        icon: '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
        tag: `mc-${Date.now()}`,
      });
    } catch {
      // Notification API may fail in some contexts
    }
  }, []);

  useEffect(() => {
    // Only auto-prompt after a short delay so the page loads first
    const timer = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        permissionRef.current = 'granted';
      } else {
        requestPermission();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [requestPermission]);

  useEffect(() => {
    if (reportIds.length === 0) return;

    const messagesChannel = supabase
      .channel(`push-messages-${role}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_messages',
        },
        (payload) => {
          const msg = payload.new as any;
          if (!reportIds.includes(msg.report_id)) return;

          if (role === 'agent' && msg.sender_role === 'client') {
            showNotification('New Client Message', msg.body?.substring(0, 100) || 'You have a new message');
          } else if (role === 'client' && msg.sender_role === 'agent') {
            showNotification('New Message from Agent', msg.body?.substring(0, 100) || 'Your agent sent you a message');
          }
        }
      )
      .subscribe();

    const scenariosChannel = supabase
      .channel(`push-scenarios-${role}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_scenarios',
        },
        (payload) => {
          const scenario = payload.new as any;
          if (!reportIds.includes(scenario.report_id)) return;

          if (role === 'agent' && scenario.created_by_role === 'client') {
            showNotification('New Scenario Submitted', scenario.title || 'A client submitted a new scenario for review');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(scenariosChannel);
    };
  }, [reportIds, role, showNotification]);

  return { requestPermission, showPrePrompt, confirmPermission, dismissPrePrompt };
}
