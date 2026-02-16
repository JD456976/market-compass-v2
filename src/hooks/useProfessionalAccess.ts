import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useEntitlement } from '@/contexts/EntitlementContext';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { REVIEWER_EMAILS, type UserEntitlement, type ProfessionalFeature, canAccessFeature } from '@/lib/featureGating';

/**
 * Hook that determines if the current user has Professional-level access.
 * 
 * Professional access is granted when any of these are true:
 * - User has an active Stripe subscription
 * - User is in their 14-day free trial
 * - User has beta access (during beta period)
 * - User role is 'reviewer'
 * - User email matches reviewer list
 */
export function useProfessionalAccess() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { entitlementState, loading: entLoading, canWrite } = useEntitlement();

  const loading = roleLoading || entLoading;

  const entitlement = useMemo<UserEntitlement>(() => {
    const betaSession = getBetaAccessSession();
    const hasBeta = !!betaSession;
    const isReviewer =
      role === 'reviewer' ||
      (!!user?.email && REVIEWER_EMAILS.includes(user.email.toLowerCase()));

    const isProfessionalUser = canWrite || hasBeta || isReviewer;

    return {
      isProfessionalUser,
      isReviewer,
      subscriptionStatus: entitlementState.isTrial ? 'trial' : entitlementState.isPro ? 'active' : 'none',
      trialEndsAt: entitlementState.trialEndsAt ?? undefined,
      subscriptionExpiresAt: entitlementState.expiresAt ?? undefined,
    };
  }, [user?.email, role, canWrite, entitlementState]);

  const trialDaysRemaining = entitlementState.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(entitlementState.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    ...entitlement,
    loading,
    trialDaysRemaining,
    canAccess: (feature: ProfessionalFeature) => canAccessFeature(entitlement, feature),
  };
}
