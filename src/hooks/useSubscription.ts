import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { friendlyErrorMessage } from '@/lib/requestHelpers';

export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired' | 'canceled';

export interface SubscriptionState {
  status: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionProductId: string | null;
  subscriptionExpiresAt: string | null;
  autoRenewEnabled: boolean;
  loading: boolean;
}

const TRIAL_DURATION_DAYS = 14;

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    status: 'none',
    trialStartedAt: null,
    trialEndsAt: null,
    subscriptionProductId: null,
    subscriptionExpiresAt: null,
    autoRenewEnabled: true,
    loading: true,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false, status: 'none' }));
      return;
    }

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      // Silent fallback — keep status as 'none' rather than showing raw DB errors
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    if (!data) {
      setState(prev => ({ ...prev, loading: false, status: 'none' }));
      return;
    }

    // Compute effective status
    let effectiveStatus: SubscriptionStatus = (data.status as SubscriptionStatus) || 'none';
    const now = new Date();

    if (effectiveStatus === 'trial' && data.trial_ends_at) {
      if (new Date(data.trial_ends_at) < now) {
        effectiveStatus = 'expired';
        // Update in DB
        await supabase
          .from('user_subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', user.id);
      }
    }

    if (effectiveStatus === 'active' && data.subscription_expires_at) {
      if (new Date(data.subscription_expires_at) < now) {
        effectiveStatus = 'expired';
        await supabase
          .from('user_subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', user.id);
      }
    }

    setState({
      status: effectiveStatus,
      trialStartedAt: data.trial_started_at,
      trialEndsAt: data.trial_ends_at,
      subscriptionProductId: data.subscription_product_id,
      subscriptionExpiresAt: data.subscription_expires_at,
      autoRenewEnabled: data.auto_renew_enabled ?? true,
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const startTrial = useCallback(async () => {
    if (!user) return false;

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        status: 'trial',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      return false;
    }

    setState(prev => ({
      ...prev,
      status: 'trial',
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
    }));

    return true;
  }, [user]);

  const trialDaysRemaining = (() => {
    if (state.status !== 'trial' || !state.trialEndsAt) return 0;
    const remaining = Math.ceil(
      (new Date(state.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, remaining);
  })();

  const isPro = state.status === 'trial' || state.status === 'active';

  return {
    ...state,
    isPro,
    trialDaysRemaining,
    startTrial,
    refreshSubscription: fetchSubscription,
  };
}
