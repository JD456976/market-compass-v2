import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { checkSubscription, redirectToCheckout, openCustomerPortal, type SubscriptionStatus } from '@/lib/stripe/stripeService';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { supabase } from '@/integrations/supabase/client';

interface EntitlementState {
  isPro: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  isActive: boolean;
  expiresAt: string | null;
  // Server-side beta access
  betaActive: boolean;
  betaExpiresAt: string | null;
  betaExpired: boolean; // was active, now expired
}

interface EntitlementContextType {
  entitlementState: EntitlementState;
  loading: boolean;
  canWrite: boolean;
  isReviewer: boolean;
  startCheckout: () => Promise<void>;
  manageSubscription: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_STATE: EntitlementState = {
  isPro: false,
  isTrial: false,
  trialEndsAt: null,
  isActive: false,
  expiresAt: null,
  betaActive: false,
  betaExpiresAt: null,
  betaExpired: false,
};

const EntitlementContext = createContext<EntitlementContextType | undefined>(undefined);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [state, setState] = useState<EntitlementState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const isReviewer = role === 'reviewer';
  const hasBeta = !!getBetaAccessSession();

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch server entitlements and stripe status in parallel
      const [serverResult, stripeData] = await Promise.all([
        supabase.rpc('get_user_entitlements'),
        checkSubscription().catch((): SubscriptionStatus => ({ subscribed: false, productId: null, subscriptionEnd: null, isTrial: false, trialEnd: null })),
      ]);

      if (!mountedRef.current) return;

      const serverData = serverResult.data as any;

      const isPro = (stripeData?.subscribed && !stripeData?.isTrial) ?? false;
      const isTrial = stripeData?.isTrial ?? false;

      // Beta expired = had beta_source but beta_access_active is now false
      const hadBeta = serverData?.beta_source === 'beta_code';
      const betaCurrentlyActive = !!serverData?.beta_active;
      const betaExpired = hadBeta && !betaCurrentlyActive;

      setState({
        isPro,
        isTrial,
        trialEndsAt: stripeData?.trialEnd ?? null,
        isActive: stripeData?.subscribed ?? false,
        expiresAt: stripeData?.subscriptionEnd ?? null,
        betaActive: betaCurrentlyActive,
        betaExpiresAt: serverData?.beta_expires_at ?? null,
        betaExpired,
      });
    } catch (err) {
      console.warn('[Entitlement] refresh failed:', err);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    if (user) {
      (async () => {
        await refresh();
        if (mountedRef.current) setLoading(false);
      })();
    } else {
      setState(DEFAULT_STATE);
      setLoading(false);
    }
    return () => { mountedRef.current = false; };
  }, [refresh, user]);

  // Refresh when app returns to foreground
  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh, user]);

  // Periodic refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh, user]);

  const startCheckout = useCallback(async () => {
    setLoading(true);
    try {
      await redirectToCheckout();
    } catch (err) {
      console.error('[Entitlement] checkout failed:', err);
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const manageSubscription = useCallback(async () => {
    try {
      await openCustomerPortal();
    } catch (err) {
      console.error('[Entitlement] portal failed:', err);
    }
  }, []);

  // canWrite: server beta OR stripe OR legacy localStorage beta OR reviewer
  const canWrite = isReviewer || hasBeta || state.betaActive || state.isPro || state.isTrial;

  return (
    <EntitlementContext.Provider value={{ entitlementState: state, loading, canWrite, isReviewer, startCheckout, manageSubscription, refresh }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement() {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement must be used within EntitlementProvider');
  return ctx;
}
