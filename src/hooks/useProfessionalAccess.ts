import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { REVIEWER_EMAILS, type UserEntitlement, type ProfessionalFeature, canAccessFeature } from '@/lib/featureGating';

/**
 * Hook that determines if the current user has Professional-level access.
 * 
 * Professional access is granted when any of these are true:
 * - User has an active subscription (App Store)
 * - User is in their 14-day free trial
 * - User has beta access (during beta period)
 * - User role is 'reviewer'
 * - User email matches reviewer list
 */
export function useProfessionalAccess() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { status: subStatus, isPro, trialDaysRemaining, trialEndsAt, subscriptionExpiresAt, loading: subLoading } = useSubscription();

  const loading = roleLoading || subLoading;

  const entitlement = useMemo<UserEntitlement>(() => {
    const betaSession = getBetaAccessSession();
    const hasBeta = !!betaSession;
    const isReviewer =
      role === 'reviewer' ||
      (!!user?.email && REVIEWER_EMAILS.includes(user.email.toLowerCase()));

    // Professional access: active sub, trial, beta, or reviewer
    const isProfessionalUser = isPro || hasBeta || isReviewer;

    return {
      isProfessionalUser,
      isReviewer,
      subscriptionStatus: subStatus,
      trialEndsAt: trialEndsAt ?? undefined,
      subscriptionExpiresAt: subscriptionExpiresAt ?? undefined,
    };
  }, [user?.email, role, isPro, subStatus, trialEndsAt, subscriptionExpiresAt]);

  return {
    ...entitlement,
    loading,
    trialDaysRemaining,
    canAccess: (feature: ProfessionalFeature) => canAccessFeature(entitlement, feature),
  };
}
