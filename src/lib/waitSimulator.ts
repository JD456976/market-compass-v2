/**
 * "What Would Happen If You Wait?" Simulator
 * 
 * Deterministic projections for waiting 30/60/90 days based on
 * current market signals. No AI, no predictions — pattern-based estimates.
 */

import { MarketConditions } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';

export type RiskLevel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';

export interface WaitScenario {
  days: number;
  label: string;
  /** Risk that property will no longer be available */
  propertyLossRisk: RiskLevel;
  /** Estimated price movement direction */
  priceMovement: { direction: 'up' | 'flat' | 'down'; magnitude: string };
  /** Market trend risk — will conditions shift against buyer? */
  marketTrendRisk: RiskLevel;
  /** Summary description */
  summary: string;
}

function riskScore(level: RiskLevel): number {
  const map: Record<RiskLevel, number> = { 'Very Low': 1, 'Low': 2, 'Moderate': 3, 'High': 4, 'Very High': 5 };
  return map[level];
}

function numToRisk(n: number): RiskLevel {
  if (n >= 4.5) return 'Very High';
  if (n >= 3.5) return 'High';
  if (n >= 2.5) return 'Moderate';
  if (n >= 1.5) return 'Low';
  return 'Very Low';
}

export function simulateWaiting(
  market: MarketConditions,
  daysOnMarket: number | null,
  offerPrice: number,
  referencePrice: number,
  snapshot?: MarketSnapshot | null,
): WaitScenario[] {
  const periods = [
    { days: 30, label: '30 Days' },
    { days: 60, label: '60 Days' },
    { days: 90, label: '90 Days' },
  ];

  // Base property loss risk from DOM
  const dom = daysOnMarket ?? 30;
  let baseLossRisk: number;
  if (dom <= 7) baseLossRisk = 4.5; // fresh listing, very high risk of losing
  else if (dom <= 14) baseLossRisk = 4;
  else if (dom <= 30) baseLossRisk = 3;
  else if (dom <= 60) baseLossRisk = 2;
  else baseLossRisk = 1.5;

  // Market heat modifier
  const heatMod = market === 'Hot' ? 1 : market === 'Cool' ? -1 : 0;

  // Snapshot-derived signals
  let velocityMod = 0;
  let priceTrend: 'up' | 'flat' | 'down' = 'flat';
  if (snapshot) {
    if (snapshot.medianDOM <= 14) velocityMod = 0.5;
    else if (snapshot.medianDOM >= 60) velocityMod = -0.5;

    if (snapshot.saleToListRatio >= 1.02) priceTrend = 'up';
    else if (snapshot.saleToListRatio <= 0.96) priceTrend = 'down';
  } else {
    if (market === 'Hot') priceTrend = 'up';
    else if (market === 'Cool') priceTrend = 'down';
  }

  return periods.map(({ days, label }) => {
    const timeMultiplier = days / 30; // 1, 2, 3

    // Property loss risk increases with time
    const lossRiskRaw = baseLossRisk + heatMod + velocityMod + (timeMultiplier - 1) * 0.5;
    // But decreases if already stale
    const lossRiskAdjusted = dom > 60 ? lossRiskRaw - 0.5 : lossRiskRaw;
    const propertyLossRisk = numToRisk(Math.max(1, Math.min(5, lossRiskAdjusted)));

    // Price movement
    let magnitude: string;
    let direction: 'up' | 'flat' | 'down' = priceTrend;
    if (priceTrend === 'up') {
      const pct = (1 + timeMultiplier * 0.5).toFixed(0);
      magnitude = `~${pct}-${(parseInt(pct) + 2)}% increase likely based on patterns`;
    } else if (priceTrend === 'down') {
      const pct = (0.5 + timeMultiplier * 0.3).toFixed(0);
      magnitude = `~${pct}-${(parseInt(pct) + 1)}% decrease observed in similar conditions`;
    } else {
      magnitude = 'Minimal change expected based on current patterns';
    }

    // Market trend risk
    const trendBase = market === 'Hot' ? 3.5 : market === 'Cool' ? 1.5 : 2.5;
    const marketTrendRisk = numToRisk(Math.min(5, trendBase + (timeMultiplier - 1) * 0.5));

    // Summary
    let summary: string;
    if (market === 'Hot' && days <= 30) {
      summary = 'In fast-moving markets, desirable properties often receive competing offers quickly.';
    } else if (market === 'Hot' && days >= 60) {
      summary = 'Extended waiting in a hot market significantly increases the risk of losing the property and facing higher prices.';
    } else if (market === 'Cool') {
      summary = 'Cooler market conditions may provide more time, but desirable properties can still attract interest.';
    } else {
      summary = `Waiting ${days} days introduces uncertainty. Market patterns suggest ${priceTrend === 'up' ? 'upward' : priceTrend === 'down' ? 'downward' : 'stable'} price movement.`;
    }

    return {
      days,
      label,
      propertyLossRisk,
      priceMovement: { direction, magnitude },
      marketTrendRisk,
      summary,
    };
  });
}
