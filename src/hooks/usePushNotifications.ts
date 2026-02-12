import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to enable browser push notifications for new messages and scenarios.
 * Listens to Supabase realtime changes on report_messages and report_scenarios.
 */
export function usePushNotifications(
  role: 'agent' | 'client',
  reportIds: string[]
) {
  const permissionRef = useRef<NotificationPermission>('default');

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return;
    }
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
    }
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if (permissionRef.current !== 'granted') return;
    if (document.visibilityState === 'visible') return; // Don't notify if app is focused

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
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (reportIds.length === 0) return;

    // Listen for new messages
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

          // Only notify if the message is from the OTHER role
          if (role === 'agent' && msg.sender_role === 'client') {
            showNotification('New Client Message', msg.body?.substring(0, 100) || 'You have a new message');
          } else if (role === 'client' && msg.sender_role === 'agent') {
            showNotification('New Message from Agent', msg.body?.substring(0, 100) || 'Your agent sent you a message');
          }
        }
      )
      .subscribe();

    // Listen for scenario submissions
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

  return { requestPermission };
}
