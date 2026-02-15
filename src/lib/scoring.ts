import { 
  MarketProfile, 
  Session, 
  LikelihoodBand,
  ExtendedLikelihoodBand,
  MarketConditions,
  InvestmentType,
  SellerReportData,
  BuyerReportData,
  ScoringDebug,
} from '@/types';
import { calculateBuyerFactorModifiers, calculateSellerFactorModifiers } from '@/lib/propertyFactorsScoring';

// =============================================
// SELLER SCORING (unchanged legacy 3-tier)
// =============================================

function getMarketModifiers(profile?: MarketProfile): number {
  if (!profile) return 0;
  let score = 0;
  if (profile.typical_sale_to_list === 'Below') score -= 1;
  else if (profile.typical_sale_to_list === 'Above') score += 1;
  if (profile.typical_dom === 'Fast') score += 1;
  else if (profile.typical_dom === 'Slow') score -= 1;
  if (profile.multiple_offers_frequency === 'Rare') score -= 1;
  else if (profile.multiple_offers_frequency === 'Common') score += 1;
  if (profile.contingency_tolerance === 'Low') score -= 1;
  else if (profile.contingency_tolerance === 'High') score += 1;
  return score;
}

function getConditionModifier(condition: Session['condition']): number {
  switch (condition) {
    case 'Dated': return -1;
    case 'Maintained': return 0;
    case 'Updated': return 1;
    case 'Renovated': return 1;
    default: return 0;
  }
}

function scoreToBand(score: number): LikelihoodBand {
  if (score <= 0) return 'Low';
  if (score >= 1 && score <= 3) return 'Moderate';
  return 'High';
}

export function calculateSellerReport(
  session: Session,
  marketProfile?: MarketProfile
): SellerReportData {
  const baseScore = getMarketModifiers(marketProfile) + getConditionModifier(session.condition);
  
  // Apply property intelligence factors
  const factorMods = calculateSellerFactorModifiers(
    (session.property_factors as any[]) || []
  );
  let adjustedScore = baseScore + factorMods.score;

  // Signal-Based Intelligence modifiers for seller
  const sellerInputs = session.seller_inputs;
  if (sellerInputs) {
    if (sellerInputs.showing_traffic === 'Heavy') {
      adjustedScore += 1;
    } else if (sellerInputs.showing_traffic === 'Minimal') {
      adjustedScore -= 1;
    }
    if (sellerInputs.offer_deadline) {
      adjustedScore += 0.5;
    }
    if (sellerInputs.price_change_direction === 'Reduced') {
      adjustedScore -= 1;
    } else if (sellerInputs.price_change_direction === 'Increased') {
      adjustedScore += 0.5;
    }
  }

  return {
    session,
    marketProfile,
    likelihood30: scoreToBand(adjustedScore),
    likelihood60: scoreToBand(adjustedScore + 1),
    likelihood90: scoreToBand(adjustedScore + 2),
    snapshotTimestamp: new Date().toISOString(),
    propertyFactorDescriptions: factorMods.descriptions.length > 0 ? factorMods.descriptions : undefined,
  };
}

// =============================================
// BUYER SCORING (new 5-tier price-ratio system)
// =============================================

// Numeric tier values: 1=Very Low, 2=Low, 3=Moderate, 4=High, 5=Very High
const TIER_MAP: Record<number, ExtendedLikelihoodBand> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very High',
};

function clampTier(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)));
}

function tierToNum(t: ExtendedLikelihoodBand): number {
  switch (t) {
    case 'Very Low': return 1;
    case 'Low': return 2;
    case 'Moderate': return 3;
    case 'High': return 4;
    case 'Very High': return 5;
  }
}

function numToTier(n: number): ExtendedLikelihoodBand {
  return TIER_MAP[clampTier(n)];
}

// Base acceptance from price ratio + market conditions
function getBaseAcceptance(ratio: number, market: MarketConditions): ExtendedLikelihoodBand {
  if (ratio >= 1.25) return 'Very High';
  if (ratio >= 1.15) return 'High';
  if (ratio >= 1.05) {
    if (market === 'Cool') return 'Moderate';
    return 'High';
  }
  if (ratio >= 1.00) return 'Moderate';
  if (ratio >= 0.95) {
    if (market === 'Hot') return 'Moderate';
    if (market === 'Balanced') return 'Moderate';
    return 'Low';
  }
  if (ratio >= 0.90) {
    if (market === 'Hot') return 'Moderate';
    if (market === 'Balanced') return 'Low';
    return 'Very Low';
  }
  if (ratio >= 0.85) {
    if (market === 'Hot') return 'Low';
    return 'Very Low';
  }
  return 'Very Low';
}

// Base overpay risk from price ratio only
function getBaseOverpayRisk(ratio: number): ExtendedLikelihoodBand {
  if (ratio >= 1.30) return 'Very High';
  if (ratio >= 1.15) return 'High';
  if (ratio >= 1.05) return 'Moderate';
  if (ratio >= 1.00) return 'Low';
  if (ratio >= 0.95) return 'Low';
  return 'Very Low';
}

// Base losing home risk from price ratio + market conditions
function getBaseLosingHomeRisk(ratio: number, market: MarketConditions): ExtendedLikelihoodBand {
  if (ratio >= 1.35) return 'Very Low';
  if (ratio >= 1.20) return 'Very Low';
  if (ratio >= 1.05) return 'Low';
  if (ratio >= 1.00) {
    if (market === 'Hot') return 'Moderate';
    if (market === 'Balanced') return 'Low';
    return 'Very Low';
  }
  if (ratio >= 0.95) {
    if (market === 'Hot') return 'Moderate';
    if (market === 'Balanced') return 'Moderate';
    return 'Low';
  }
  if (ratio >= 0.90) {
    if (market === 'Hot') return 'High';
    if (market === 'Balanced') return 'High';
    return 'Moderate';
  }
  // <= 0.90
  if (market === 'Hot') return 'Very High';
  if (market === 'Balanced') return 'High';
  return 'Moderate';
}

// DOM modifier (acceptance only)
function getDOMModifier(days: number | null): number {
  if (days === null || days === undefined) return 0;
  if (days <= 7) return -1;
  if (days <= 14) return -0.5;
  if (days <= 30) return 0;
  if (days <= 60) return 0.5;
  if (days <= 90) return 1;
  return 1.5;
}

export function calculateBuyerReport(
  session: Session,
  marketProfile?: MarketProfile
): BuyerReportData {
  const inputs = session.buyer_inputs;
  if (!inputs) {
    throw new Error('Buyer inputs required');
  }

  const offerPrice = inputs.offer_price;
  const marketConditions: MarketConditions = inputs.market_conditions || 'Balanced';
  const daysOnMarket: number | null = inputs.days_on_market ?? null;
  const investmentType: InvestmentType = inputs.investment_type || 'Primary Residence';
  const isCash = inputs.financing_type === 'Cash';

  // Determine reference price & confidence
  let referencePrice = inputs.reference_price || 0;
  let confidence: 'High' | 'Limited' = 'High';
  const warnings: string[] = [];

  if (!referencePrice || referencePrice <= 0) {
    referencePrice = offerPrice;
    confidence = 'Limited';
    warnings.push('reference_price unavailable, using offer_price as fallback');
  }

  const priceRatio = referencePrice > 0 ? offerPrice / referencePrice : 1;

  // 1. Base tiers from price ratio + market
  const baseAcceptance = getBaseAcceptance(priceRatio, marketConditions);
  const baseOverpay = getBaseOverpayRisk(priceRatio);
  const baseLosing = getBaseLosingHomeRisk(priceRatio, marketConditions);

  let acceptanceNum = tierToNum(baseAcceptance);
  let overpayNum = tierToNum(baseOverpay);
  let losingNum = tierToNum(baseLosing);

  const modifiers: string[] = [];

  // 2. Days on Market modifier (acceptance only)
  const domMod = getDOMModifier(daysOnMarket);
  if (domMod !== 0) {
    acceptanceNum += domMod;
    const domLabel = daysOnMarket !== null ? `${daysOnMarket}` : 'unknown';
    modifiers.push(`Days on Market (${domLabel}): ${domMod > 0 ? '+' : ''}${domMod} Acceptance`);
  }

  // 3. Property Type modifier
  if (investmentType === 'Investment Property') {
    acceptanceNum -= 0.5;
    overpayNum += 0.5;
    losingNum -= 0.5;
    modifiers.push('Investment Property: −0.5 Acceptance, +0.5 Overpay, −0.5 Losing Home');
  }

  // 4. Financing modifier
  if (isCash) {
    acceptanceNum += 1;
    losingNum -= 1;
    modifiers.push('Financing (Cash): +1 Acceptance, −1 Losing Home');
  } else if (inputs.down_payment_percent === '<10') {
    acceptanceNum -= 0.5;
    losingNum += 0.5;
    modifiers.push('Low Down Payment (<10%): −0.5 Acceptance, +0.5 Losing Home');
  }
  // 20%+ is baseline (no modifier)

  // 5. Contingency modifiers
  const contingencies = inputs.contingencies;
  if (contingencies.includes('Inspection') && !contingencies.includes('None')) {
    const penalty = marketConditions === 'Hot' ? -1 : -0.5;
    acceptanceNum += penalty;
    losingNum += Math.abs(penalty);
    modifiers.push(`Contingency (Inspection${marketConditions === 'Hot' ? ', Hot Market' : ''}): ${penalty} Acceptance, +${Math.abs(penalty)} Losing Home`);
  }
  if (contingencies.includes('Appraisal') && !contingencies.includes('None')) {
    if (priceRatio > 1.05) {
      acceptanceNum -= 1;
      losingNum += 1;
      modifiers.push('Contingency (Appraisal, ratio>1.05): −1 Acceptance, +1 Losing Home');
    } else {
      acceptanceNum -= 0.25;
      modifiers.push('Contingency (Appraisal): −0.25 Acceptance');
    }
  }
  if (contingencies.includes('Financing') && !contingencies.includes('None')) {
    acceptanceNum -= 0.75;
    losingNum += 0.75;
    modifiers.push('Contingency (Financing): −0.75 Acceptance, +0.75 Losing Home');
  }
  if (contingencies.includes('Home sale') && !contingencies.includes('None')) {
    acceptanceNum -= 1;
    losingNum += 1;
    modifiers.push('Contingency (Home Sale): −1 Acceptance, +1 Losing Home');
  }

  // 6. Property Intelligence Factors
  const factorMods = calculateBuyerFactorModifiers(
    (session.property_factors as any[]) || []
  );
  if (factorMods.acceptance !== 0 || factorMods.overpayRisk !== 0 || factorMods.losingHomeRisk !== 0) {
    acceptanceNum += factorMods.acceptance;
    overpayNum += factorMods.overpayRisk;
    losingNum += factorMods.losingHomeRisk;
    modifiers.push(...factorMods.descriptions);
  }

  // 7. Signal-Based Intelligence modifiers
  // Showing Traffic
  if (inputs.showing_traffic === 'Heavy') {
    acceptanceNum -= 0.5;
    losingNum += 0.5;
    overpayNum += 0.5;
    modifiers.push('Signal (Heavy Showing Traffic): −0.5 Acceptance, +0.5 Losing Home, +0.5 Overpay');
  } else if (inputs.showing_traffic === 'Minimal') {
    acceptanceNum += 0.5;
    losingNum -= 0.5;
    overpayNum -= 0.5;
    modifiers.push('Signal (Minimal Showing Traffic): +0.5 Acceptance, −0.5 Losing Home, −0.5 Overpay');
  }

  // Offer Deadline (presence = competitive pressure)
  if (inputs.offer_deadline) {
    acceptanceNum -= 0.5;
    losingNum += 0.5;
    modifiers.push('Signal (Offer Deadline Set): −0.5 Acceptance, +0.5 Losing Home');
  }

  // Price Change History
  if (inputs.price_change_direction === 'Reduced') {
    acceptanceNum += 0.5;
    losingNum -= 0.5;
    modifiers.push('Signal (Price Reduced): +0.5 Acceptance, −0.5 Losing Home');
  } else if (inputs.price_change_direction === 'Increased') {
    acceptanceNum -= 0.5;
    losingNum += 0.5;
    modifiers.push('Signal (Price Increased): −0.5 Acceptance, +0.5 Losing Home');
  }

  // 8. Enforce extreme price ratio caps
  if (priceRatio >= 2.0 && acceptanceNum < tierToNum('High')) {
    acceptanceNum = tierToNum('High');
    modifiers.push('Cap: ratio≥2.0 forces Acceptance≥High');
  }
  if (priceRatio <= 0.85 && acceptanceNum > tierToNum('Low')) {
    acceptanceNum = tierToNum('Low');
    modifiers.push('Cap: ratio≤0.85 forces Acceptance≤Low');
  }
  if (priceRatio >= 1.30 && overpayNum < tierToNum('High')) {
    overpayNum = tierToNum('High');
    modifiers.push('Cap: ratio≥1.30 forces Overpay≥High');
  }

  // 9. Consistency enforcement: acceptance and losing-home are inversely correlated
  // If acceptance is low (≤2), losing-home must be at least moderate (≥3)
  // If acceptance is high (≥4), losing-home must be at most low (≤2)
  const clampedAcceptance = clampTier(Math.round(acceptanceNum));
  const clampedLosing = clampTier(Math.round(losingNum));
  const expectedMinLosing = 6 - clampedAcceptance; // inverse: acc=1→losing≥5, acc=5→losing≥1
  if (clampedLosing < expectedMinLosing - 1) {
    losingNum = expectedMinLosing - 1;
    modifiers.push(`Consistency: Losing Home raised to match low Acceptance`);
  } else if (clampedLosing > expectedMinLosing + 1) {
    losingNum = expectedMinLosing + 1;
    modifiers.push(`Consistency: Losing Home lowered to match high Acceptance`);
  }

  const finalAcceptance = numToTier(acceptanceNum);
  const finalOverpay = numToTier(overpayNum);
  const finalLosing = numToTier(losingNum);

  const debug: ScoringDebug = {
    referencePrice,
    offerPrice,
    priceRatio,
    marketConditions,
    daysOnMarket,
    investmentType,
    baseTiers: {
      acceptance: baseAcceptance,
      overpayRisk: baseOverpay,
      losingHomeRisk: baseLosing,
    },
    modifiers,
    finalTiers: {
      acceptance: finalAcceptance,
      overpayRisk: finalOverpay,
      losingHomeRisk: finalLosing,
    },
    confidence,
    warnings,
  };

  return {
    session,
    marketProfile,
    acceptanceLikelihood: finalAcceptance,
    riskOfLosingHome: finalLosing,
    riskOfOverpaying: finalOverpay,
    snapshotTimestamp: new Date().toISOString(),
    confidence,
    debug,
  };
}
