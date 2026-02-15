// Feature gating configuration for Market Compass Professional

export type ProfessionalFeature =
  | 'unlimitedReports'
  | 'scenarioExplorer'
  | 'offerPositionMeter'
  | 'sellerLeverageMeter'
  | 'brandedExports'
  | 'advancedMarketInsights'
  | 'customBranding';

export const PROFESSIONAL_FEATURES: { key: ProfessionalFeature; label: string; description: string }[] = [
  { key: 'unlimitedReports', label: 'Unlimited Reports', description: 'Create professional reports for every client and property.' },
  { key: 'scenarioExplorer', label: 'Scenario Explorer', description: 'Model winning strategies before submitting offers.' },
  { key: 'offerPositionMeter', label: 'Offer Position Meter', description: 'Visualize exactly where your offer stands competitively.' },
  { key: 'sellerLeverageMeter', label: 'Seller Leverage Meter', description: 'Understand seller negotiation strength at a glance.' },
  { key: 'brandedExports', label: 'Branded Exports', description: 'Deliver client-ready reports that are easy to share and understand.' },
  { key: 'advancedMarketInsights', label: 'Advanced Market Insights', description: 'Understand offer strength, risk tradeoffs, and positioning.' },
  { key: 'customBranding', label: 'Custom Branding', description: 'Present polished reports with your identity and contact details.' },
];

// Free tier limits (enforced after trial expires)
export const FREE_TIER_LIMITS = {
  reportsPerMonth: 2,
  comparisonsPerMonth: 1,
  scenarioExplorerUsesPerMonth: 0,
} as const;

// App Store product IDs
export const SUBSCRIPTION_PRODUCTS = {
  monthlyPro: 'com.marketcompass.pro.monthly',
  yearlyPro: 'com.marketcompass.pro.yearly',
} as const;

export const PRICING = {
  monthly: { price: 29, label: '$29/month' },
  yearly: { price: 249, monthlyEquivalent: 20.75, label: '$249/year', savings: '28%' },
  trialDays: 14,
} as const;

export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired' | 'canceled';

export interface UserEntitlement {
  isProfessionalUser: boolean;
  isReviewer: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
  trialEndsAt?: string;
}

// Reviewer emails that get automatic Professional access
export const REVIEWER_EMAILS: string[] = [
  // Add App Store reviewer emails here
];

/**
 * Check if a user can access a specific professional feature
 */
export function canAccessFeature(
  entitlement: UserEntitlement,
  _feature: ProfessionalFeature
): boolean {
  return entitlement.isProfessionalUser;
}

/**
 * Check if user has Professional access (any source)
 */
export function hasValidAccess(entitlement: UserEntitlement): boolean {
  return entitlement.isProfessionalUser;
}
