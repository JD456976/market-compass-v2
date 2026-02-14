import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { REVIEWER_EMAILS, type UserEntitlement, type ProfessionalFeature, canAccessFeature } from '@/lib/featureGating';

/**
 * Hook that determines if the current user has Professional-level access.
 * 
 * Professional access is granted when any of these are true:
 * - User has beta access (during beta period)
 * - User role is 'reviewer'
 * - User email matches reviewer list
 * - User has an active subscription (future)
 */
export function useProfessionalAccess() {
  const { user } = useAuth();
  const { role, loading } = useUserRole();

  const entitlement = useMemo<UserEntitlement>(() => {
    const betaSession = getBetaAccessSession();
    const hasBeta = !!betaSession;
    const isReviewer =
      role === 'reviewer' ||
      (!!user?.email && REVIEWER_EMAILS.includes(user.email.toLowerCase()));

    // During beta, beta access = professional access
    // Reviewers always get professional access
    const isProfessionalUser = hasBeta || isReviewer;

    return {
      isProfessionalUser,
      isReviewer,
      subscriptionStatus: 'none',
    };
  }, [user?.email, role]);

  return {
    ...entitlement,
    loading,
    canAccess: (feature: ProfessionalFeature) => canAccessFeature(entitlement, feature),
  };
}
