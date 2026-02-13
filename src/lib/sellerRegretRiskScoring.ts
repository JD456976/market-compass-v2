/**
 * Seller Pricing Regret Risk — "How likely you'll regret this list price"
 * 
 * Combines underpricing risk, overpricing risk, and market timing signals.
 * Deterministic, no AI.
 */

import { SellerInputs, LikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';

export type SellerRegretRiskLevel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';

export const SELLER_REGRET_RISK_LEVELS: readonly SellerRegretRiskLevel[] = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];

export interface SellerRegretRiskResult {
  level: SellerRegretRiskLevel;
  score: number;
  factors: string[];
}

export function calculateSellerRegretRisk(
  inputs: SellerInputs,
  likelihood30: LikelihoodBand,
  snapshot?: MarketSnapshot | null,
): SellerRegretRiskResult {
  let score = 30;
  const factors: string[] = [];

  // 1. Likelihood is the primary signal — low likelihood = high regret risk
  if (likelihood30 === 'Low') {
    score += 15;
    factors.push('Low sale likelihood increases risk of pricing regret');
  } else if (likelihood30 === 'High') {
    score -= 10;
    factors.push('High sale likelihood reduces pricing regret risk');
  }

  // 2. Strategy extremes carry more regret risk
  if (inputs.strategy_preference === 'Maximize price') {
    score += 10;
    factors.push('Maximizing price may lead to extended time on market');
  } else if (inputs.strategy_preference === 'Prioritize speed') {
    score += 8;
    factors.push('Prioritizing speed may leave money on the table');
  } else {
    score -= 3;
    factors.push('Balanced strategy reduces likelihood of extreme regret');
  }

  // 3. Tight timeframe + low likelihood = pressure-driven decisions
  if (inputs.desired_timeframe === '30' && likelihood30 !== 'High') {
    score += 10;
    factors.push('Short timeframe with moderate/low likelihood creates pressure');
  }

  // 4. Snapshot signals
  if (snapshot) {
    if (snapshot.saleToListRatio <= 0.95) {
      score += 8;
      factors.push('Market shows homes selling below list — overpricing risk elevated');
    } else if (snapshot.saleToListRatio >= 1.03) {
      score -= 5;
      factors.push('Market shows homes selling above list — pricing cushion exists');
    }

    if (snapshot.medianDOM >= 60) {
      score += 5;
      factors.push('Slow market increases risk of stale listing regret');
    } else if (snapshot.medianDOM <= 14) {
      score -= 3;
      factors.push('Fast-moving market reduces time-on-market concerns');
    }

    if (snapshot.inventorySignal === 'high') {
      score += 5;
      factors.push('High inventory means more competition from other sellers');
    } else if (snapshot.inventorySignal === 'low') {
      score -= 3;
      factors.push('Low inventory favors sellers');
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    level: scoreToLevel(score),
    score,
    factors,
  };
}

function scoreToLevel(score: number): SellerRegretRiskLevel {
  if (score >= 75) return 'Very High';
  if (score >= 55) return 'High';
  if (score >= 35) return 'Moderate';
  if (score >= 18) return 'Low';
  return 'Very Low';
}
