/**
 * Position Meter Scoring – deterministic calculations for
 * Offer Position (buyer) and Seller Leverage (seller).
 * 
 * No AI, no advice – purely informational position indicators.
 */

import { Session, BuyerInputs, SellerInputs, MarketConditions } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';

// =============================================
// BUYER: Offer Position Meter
// =============================================

export type OfferPositionLevel = 'Weak' | 'Moderate' | 'Competitive' | 'Strong' | 'Dominant';

const OFFER_POSITION_LEVELS: OfferPositionLevel[] = ['Weak', 'Moderate', 'Competitive', 'Strong', 'Dominant'];

export interface OfferPositionResult {
  level: OfferPositionLevel;
  /** 0-100 numeric score for meter positioning */
  score: number;
  factors: string[];
}

/**
 * Calculate the Offer Position based on deterministic inputs.
 * Score range: 0–100, mapped to 5 levels.
 */
export function calculateOfferPosition(
  session: Session,
  snapshot?: MarketSnapshot | null,
): OfferPositionResult {
  const inputs = session.buyer_inputs;
  if (!inputs) return { level: 'Moderate', score: 50, factors: [] };

  // Guard: if offer price is $0 or missing, return indeterminate
  if (!inputs.offer_price || inputs.offer_price <= 0) {
    return { level: 'Moderate', score: 50, factors: ['Enter an offer price to see position analysis'], _noOfferPrice: true } as any;
  }

  let score = 50; // baseline
  const factors: string[] = [];

  // 1. Price ratio vs reference (comparable value)
  const refPrice = inputs.reference_price || inputs.offer_price;
  const ratio = refPrice > 0 ? inputs.offer_price / refPrice : 1;

  if (ratio >= 1.15) {
    score += 20;
    factors.push('Offer is significantly above comparable value');
  } else if (ratio >= 1.05) {
    score += 12;
    factors.push('Offer is above comparable value');
  } else if (ratio >= 1.00) {
    score += 5;
    factors.push('Offer is at comparable value');
  } else if (ratio >= 0.95) {
    score -= 5;
    factors.push('Offer is slightly below comparable value');
  } else if (ratio >= 0.90) {
    score -= 12;
    factors.push('Offer is below comparable value');
  } else {
    score -= 20;
    factors.push('Offer is well below comparable value');
  }

  // 2. Financing strength
  if (inputs.financing_type === 'Cash') {
    score += 15;
    factors.push('Cash financing increases competitiveness');
  } else if (inputs.financing_type === 'Conventional' && inputs.down_payment_percent === '20+') {
    score += 5;
    factors.push('Conventional financing with strong down payment');
  } else if (inputs.financing_type === 'FHA' || inputs.financing_type === 'VA') {
    score -= 3;
    factors.push('Government-backed financing may be viewed less favorably by some sellers');
  }
  if (inputs.down_payment_percent === '<10' && inputs.financing_type !== 'Cash') {
    score -= 5;
    factors.push('Low down payment can reduce perceived strength');
  }

  // 3. Contingencies
  const contingencyCount = inputs.contingencies.filter(c => c !== 'None').length;
  if (inputs.contingencies.includes('None') || contingencyCount === 0) {
    score += 10;
    factors.push('No contingencies increases appeal');
  } else {
    score -= contingencyCount * 4;
    factors.push(`${contingencyCount} contingenc${contingencyCount > 1 ? 'ies' : 'y'} may reduce seller appeal`);
  }

  // 4. Closing timeline flexibility
  if (inputs.closing_timeline === '<21') {
    score += 5;
    factors.push('Fast closing timeline can increase appeal');
  } else if (inputs.closing_timeline === '45+') {
    score -= 5;
    factors.push('Extended closing timeline may reduce appeal');
  }

  // 5. Market competitiveness indicator
  const market: MarketConditions = inputs.market_conditions || 'Balanced';
  if (market === 'Hot') {
    score -= 8;
    factors.push('Hot market conditions increase competition');
  } else if (market === 'Cool') {
    score += 8;
    factors.push('Cool market conditions may favor buyers');
  }

  // 6. Signal-Based Intelligence
  if (inputs.showing_traffic === 'Heavy') {
    score -= 6;
    factors.push('Heavy showing traffic suggests strong competition');
  } else if (inputs.showing_traffic === 'Minimal') {
    score += 6;
    factors.push('Minimal showing traffic may reduce competition');
  }

  if (inputs.offer_deadline) {
    score -= 5;
    factors.push('Active offer deadline increases competitive pressure');
  }

  if (inputs.price_change_direction === 'Reduced') {
    score += 5;
    factors.push('Price reduction may indicate seller flexibility');
  } else if (inputs.price_change_direction === 'Increased') {
    score -= 5;
    factors.push('Price increase suggests seller confidence');
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    level: scoreToOfferLevel(score),
    score,
    factors,
  };
}

function scoreToOfferLevel(score: number): OfferPositionLevel {
  if (score >= 80) return 'Dominant';
  if (score >= 65) return 'Strong';
  if (score >= 45) return 'Competitive';
  if (score >= 25) return 'Moderate';
  return 'Weak';
}

// =============================================
// SELLER: Seller Leverage Meter
// =============================================

export type SellerLeverageLevel = 'Buyer Advantage' | 'Balanced' | 'Seller Advantage' | 'Strong Seller Market';

const SELLER_LEVERAGE_LEVELS: SellerLeverageLevel[] = ['Buyer Advantage', 'Balanced', 'Seller Advantage', 'Strong Seller Market'];

export interface SellerLeverageResult {
  level: SellerLeverageLevel;
  /** 0-100 numeric score for meter positioning */
  score: number;
  factors: string[];
}

/**
 * Calculate the Seller Leverage based on deterministic inputs.
 * Score range: 0–100, mapped to 4 levels.
 */
export function calculateSellerLeverage(
  session: Session,
  snapshot?: MarketSnapshot | null,
): SellerLeverageResult {
  const inputs = session.seller_inputs;
  if (!inputs) return { level: 'Balanced', score: 50, factors: [] };

  let score = 50; // baseline
  const factors: string[] = [];

  // 1. Market velocity from snapshot
  if (snapshot) {
    const medianDOM = snapshot.medianDOM;
    if (medianDOM <= 14) {
      score += 15;
      factors.push('Fast market velocity tends to favor sellers');
    } else if (medianDOM <= 30) {
      score += 5;
      factors.push('Average market velocity');
    } else if (medianDOM <= 60) {
      score -= 5;
      factors.push('Slower market velocity may reduce leverage');
    } else {
      score -= 15;
      factors.push('Extended days on market often indicates buyer-favorable conditions');
    }

    // Sale-to-list ratio
    const stl = snapshot.saleToListRatio;
    if (stl >= 1.02) {
      score += 12;
      factors.push('Homes selling above list price suggests seller leverage');
    } else if (stl >= 0.98) {
      score += 3;
      factors.push('Sale-to-list ratio near parity');
    } else {
      score -= 10;
      factors.push('Homes selling below list price may indicate reduced leverage');
    }

    // Inventory signal
    if (snapshot.inventorySignal === 'low') {
      score += 8;
      factors.push('Low inventory often correlates with seller advantage');
    } else if (snapshot.inventorySignal === 'high') {
      score -= 8;
      factors.push('High inventory may increase buyer options');
    }
  }

  // 2. Property condition
  if (session.condition === 'Renovated' || session.condition === 'Updated') {
    score += 5;
    factors.push('Updated/renovated condition can increase negotiating position');
  } else if (session.condition === 'Dated') {
    score -= 5;
    factors.push('Dated condition may reduce negotiating leverage');
  }

  // 3. Strategy alignment
  if (inputs.strategy_preference === 'Prioritize speed') {
    score -= 5;
    factors.push('Speed-focused strategy may involve price concessions');
  } else if (inputs.strategy_preference === 'Maximize price') {
    score += 3;
    factors.push('Price-maximizing strategy reflects perceived strength');
  }

  // 4. Signal-Based Intelligence
  if (inputs.showing_traffic === 'Heavy') {
    score += 8;
    factors.push('Heavy showing traffic suggests strong buyer interest');
  } else if (inputs.showing_traffic === 'Minimal') {
    score -= 8;
    factors.push('Minimal showing traffic may indicate limited demand');
  }

  if (inputs.offer_deadline) {
    score += 5;
    factors.push('Active offer deadline signals competitive interest');
  }

  if (inputs.price_change_direction === 'Reduced') {
    score -= 6;
    factors.push('Price reduction may signal reduced leverage');
  } else if (inputs.price_change_direction === 'Increased') {
    score += 4;
    factors.push('Price increase reflects market confidence');
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    level: scoreToLeverageLevel(score),
    score,
    factors,
  };
}

function scoreToLeverageLevel(score: number): SellerLeverageLevel {
  if (score >= 72) return 'Strong Seller Market';
  if (score >= 55) return 'Seller Advantage';
  if (score >= 35) return 'Balanced';
  return 'Buyer Advantage';
}

// =============================================
// STRATEGY INSIGHTS (Context-Aware Suggestions)
// =============================================

export interface StrategyInsight {
  text: string;
}

export function getBuyerStrategyInsights(position: OfferPositionResult): StrategyInsight[] {
  const insights: StrategyInsight[] = [];

  switch (position.level) {
    case 'Weak':
      insights.push({ text: 'Increasing offer price is often associated with higher competitiveness.' });
      insights.push({ text: 'Larger deposits may signal commitment to sellers.' });
      insights.push({ text: 'Flexible closing timelines can increase appeal.' });
      insights.push({ text: 'Reducing contingencies is sometimes associated with stronger offers.' });
      break;
    case 'Moderate':
      insights.push({ text: 'The current offer may face competition from stronger terms.' });
      insights.push({ text: 'Strengthening financing or reducing contingencies can influence positioning.' });
      break;
    case 'Competitive':
      insights.push({ text: 'Offer terms appear competitive relative to market norms.' });
      insights.push({ text: 'Minor adjustments may further differentiate the offer.' });
      break;
    case 'Strong':
      insights.push({ text: 'Offer may already be competitive based on current terms.' });
      insights.push({ text: 'Consider risk tolerance before making aggressive concessions.' });
      break;
    case 'Dominant':
      insights.push({ text: 'Offer terms are very strong relative to the market.' });
      insights.push({ text: 'Overpay risk tends to increase with highly aggressive positioning.' });
      break;
  }

  return insights;
}

export function getSellerStrategyInsights(leverage: SellerLeverageResult): StrategyInsight[] {
  const insights: StrategyInsight[] = [];

  switch (leverage.level) {
    case 'Buyer Advantage':
      insights.push({ text: 'Flexibility on terms may attract more buyer interest.' });
      insights.push({ text: 'Strategic pricing can influence showing activity.' });
      insights.push({ text: 'Offering concessions is sometimes associated with faster outcomes.' });
      break;
    case 'Balanced':
      insights.push({ text: 'Market conditions suggest relatively even negotiating dynamics.' });
      insights.push({ text: 'Pricing strategy and presentation can influence positioning.' });
      break;
    case 'Seller Advantage':
      insights.push({ text: 'Sellers may prioritize price over concessions in this environment.' });
      insights.push({ text: 'Competitive offers may be expected from buyers.' });
      break;
    case 'Strong Seller Market':
      insights.push({ text: 'Market conditions tend to favor seller pricing power.' });
      insights.push({ text: 'Multiple offers may be more likely in this environment.' });
      insights.push({ text: 'Minimal concessions are often observed in strong seller markets.' });
      break;
  }

  return insights;
}

export { OFFER_POSITION_LEVELS, SELLER_LEVERAGE_LEVELS };
