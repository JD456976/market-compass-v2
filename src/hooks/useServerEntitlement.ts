/**
 * Server-side entitlement check via get_user_entitlements() RPC.
 * This is the single source of truth for access control.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ServerEntitlement {
  allowed: boolean;
  reason: 'beta_access' | 'trial' | 'subscription' | 'no_access' | 'not_authenticated' | 'loading';
  betaActive: boolean;
  betaExpiresAt: string | null;
  betaSource: string | null;
  subscriptionStatus: 'trial' | 'active' | 'none';
  subscriptionExpiresAt: string | null;
}

const DEFAULT: ServerEntitlement = {
  allowed: false,
  reason: 'loading',
  betaActive: false,
  betaExpiresAt: null,
  betaSource: null,
  subscriptionStatus: 'none',
  subscriptionExpiresAt: null,
};

export function useServerEntitlement() {
  const { user, loading: authLoading } = useAuth();
  const [entitlement, setEntitlement] = useState<ServerEntitlement>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!user) {
      if (mountedRef.current) {
        setEntitlement({ ...DEFAULT, reason: 'not_authenticated' });
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_entitlements');
      if (!mountedRef.current) return;

      if (error || !data) {
        console.warn('[ServerEntitlement] RPC failed:', error);
        return;
      }

      const d = data as any;
      setEntitlement({
        allowed: !!d.allowed,
        reason: d.reason ?? 'no_access',
        betaActive: !!d.beta_active,
        betaExpiresAt: d.beta_expires_at ?? null,
        betaSource: d.beta_source ?? null,
        subscriptionStatus: d.subscription_status ?? 'none',
        subscriptionExpiresAt: d.subscription_expires_at ?? null,
      });
    } catch (err) {
      console.warn('[ServerEntitlement] fetch failed:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading) refresh();
    return () => { mountedRef.current = false; };
  }, [refresh, authLoading]);

  // Refresh on visibility change
  useEffect(() => {
    if (!user) return;
    const handler = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [refresh, user]);

  return { entitlement, loading, refresh };
}
