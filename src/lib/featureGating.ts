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

// Re-export pricing from Stripe config
export { PRICE_DISPLAY as PRICING_DISPLAY, TRIAL_DURATION_DAYS } from '@/lib/stripe/stripeConfig';

export const PRICING = {
  monthly: { price: 39, label: '$39/month' },
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
export const REVIEWER_EMAILS: string[] = [];

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
