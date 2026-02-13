/**
 * Regret Risk Meter — "How likely you'll regret this offer later"
 * 
 * Combines overpay risk with market timing signals to produce
 * a single deterministic regret-risk indicator.
 * 
 * Deterministic, no AI. Neutral language only.
 */

import { BuyerInputs, MarketConditions, ExtendedLikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';

export type RegretRiskLevel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';

export const REGRET_RISK_LEVELS: readonly RegretRiskLevel[] = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];

export interface RegretRiskResult {
  level: RegretRiskLevel;
  /** 0-100 numeric score */
  score: number;
  factors: string[];
}

/**
 * Calculate "Regret Risk" — a composite of overpay risk + timing risk.
 */
export function calculateRegretRisk(
  inputs: BuyerInputs,
  overpayRisk: ExtendedLikelihoodBand,
  snapshot?: MarketSnapshot | null,
): RegretRiskResult {
  let score = 30; // baseline — mild regret risk is human nature
  const factors: string[] = [];

  // 1. Overpay risk is the primary driver
  const overpayMap: Record<ExtendedLikelihoodBand, number> = {
    'Very Low': -15,
    'Low': -5,
    'Moderate': 5,
    'High': 15,
    'Very High': 25,
  };
  score += overpayMap[overpayRisk];
  if (overpayRisk === 'High' || overpayRisk === 'Very High') {
    factors.push('High overpay risk increases potential for future regret');
  } else if (overpayRisk === 'Very Low' || overpayRisk === 'Low') {
    factors.push('Low overpay risk reduces potential for buyer remorse');
  }

  // 2. Price ratio — paying far above comparables
  const refPrice = inputs.reference_price || inputs.offer_price;
  const ratio = refPrice > 0 ? inputs.offer_price / refPrice : 1;
  if (ratio >= 1.20) {
    score += 15;
    factors.push('Offer significantly exceeds comparable value');
  } else if (ratio >= 1.10) {
    score += 8;
    factors.push('Offer exceeds comparable value by a notable margin');
  } else if (ratio <= 0.95) {
    score -= 10;
    factors.push('Offer below comparable value tends to reduce buyer remorse');
  }

  // 3. Contingency protections — fewer protections = more regret risk
  const contingencyCount = inputs.contingencies.filter(c => c !== 'None').length;
  if (inputs.contingencies.includes('None') || contingencyCount === 0) {
    score += 12;
    factors.push('No contingency protections increases exposure');
  } else if (contingencyCount <= 1) {
    score += 4;
    factors.push('Minimal contingency protections');
  } else if (contingencyCount >= 3) {
    score -= 5;
    factors.push('Multiple contingencies provide buyer protections');
  }

  // 4. Market timing risk — hot markets tend to normalize
  const market: MarketConditions = inputs.market_conditions || 'Balanced';
  if (market === 'Hot') {
    score += 8;
    factors.push('Hot market purchases may carry timing risk if market normalizes');
  } else if (market === 'Cool') {
    score -= 5;
    factors.push('Cool market conditions may present more favorable entry timing');
  }

  // 5. Investment type — investment properties carry more emotional distance
  if (inputs.investment_type === 'Investment Property') {
    score -= 3;
    factors.push('Investment-focused purchases tend to have lower emotional regret');
  }

  // 6. Market snapshot signals
  if (snapshot) {
    if (snapshot.saleToListRatio >= 1.05) {
      score += 5;
      factors.push('Homes selling well above list may normalize over time');
    }
    if (snapshot.medianDOM <= 7) {
      score += 3;
      factors.push('Very fast market may lead to pressure-driven decisions');
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    level: scoreToRegretLevel(score),
    score,
    factors,
  };
}

function scoreToRegretLevel(score: number): RegretRiskLevel {
  if (score >= 75) return 'Very High';
  if (score >= 55) return 'High';
  if (score >= 35) return 'Moderate';
  if (score >= 18) return 'Low';
  return 'Very Low';
}
