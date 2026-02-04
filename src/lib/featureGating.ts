// Feature gating configuration for Market Compass
// During beta, all features are accessible. This scaffolds future paid features.

export interface FeatureFlags {
  unlimitedReports: boolean;
  unlimitedComparisons: boolean;
  advancedScenarioExplorer: boolean;
  marketSnapshotSelection: boolean;
  brandedPdfExports: boolean;
}

// Define which features are paid (will be enforced post-beta)
export const PAID_FEATURES: (keyof FeatureFlags)[] = [
  'unlimitedReports',
  'unlimitedComparisons', 
  'advancedScenarioExplorer',
  'marketSnapshotSelection',
  'brandedPdfExports',
];

// Free tier limits (future enforcement)
export const FREE_TIER_LIMITS = {
  reportsPerMonth: 3,
  comparisonsPerMonth: 1,
  scenarioExplorerUsesPerMonth: 5,
} as const;

// Subscription product IDs (Apple App Store ready)
export const SUBSCRIPTION_PRODUCTS = {
  monthlyPro: 'com.marketcompass.pro.monthly',
  yearlyPro: 'com.marketcompass.pro.yearly',
} as const;

export type SubscriptionStatus = 'none' | 'active' | 'expired' | 'canceled';

export interface UserEntitlement {
  hasBetaAccess: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
}

/**
 * Check if a user can access a specific feature
 * During beta, beta access grants all features
 */
export function canAccessFeature(
  entitlement: UserEntitlement,
  _feature: keyof FeatureFlags
): boolean {
  // Beta access bypasses all restrictions
  if (entitlement.hasBetaAccess) {
    return true;
  }

  // Active subscription grants all features
  if (entitlement.subscriptionStatus === 'active') {
    return true;
  }

  // Future: implement free tier logic here
  // For now, beta-only means no free tier exists
  return false;
}

/**
 * Check if user has any valid access (beta or subscription)
 */
export function hasValidAccess(entitlement: UserEntitlement): boolean {
  return entitlement.hasBetaAccess || entitlement.subscriptionStatus === 'active';
}

/**
 * Get current entitlement from beta session
 * This is a client-side helper - real validation happens server-side
 */
export function getEntitlementFromSession(): UserEntitlement {
  // Import dynamically to avoid circular dependency
  const session = localStorage.getItem('market_compass_access');
  
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return {
        hasBetaAccess: true,
        subscriptionStatus: 'none', // Subscriptions not active during beta
      };
    } catch {
      // Invalid session
    }
  }

  return {
    hasBetaAccess: false,
    subscriptionStatus: 'none',
  };
}
