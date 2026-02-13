/**
 * Seller "What If You Wait?" Simulator
 * 
 * Projects risks of delaying listing for N days.
 * Deterministic, pattern-based.
 */

import { MarketSnapshot } from '@/lib/marketSnapshots';
import { LikelihoodBand } from '@/types';

export type RiskLevel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';

export interface SellerWaitScenario {
  days: number;
  label: string;
  /** Risk of market shifting against seller */
  marketShiftRisk: RiskLevel;
  /** Price movement direction */
  priceMovement: { direction: 'up' | 'flat' | 'down'; magnitude: string };
  /** Risk of increased competition (more listings) */
  competitionRisk: RiskLevel;
  /** Summary */
  summary: string;
}

function numToRisk(n: number): RiskLevel {
  if (n >= 4.5) return 'Very High';
  if (n >= 3.5) return 'High';
  if (n >= 2.5) return 'Moderate';
  if (n >= 1.5) return 'Low';
  return 'Very Low';
}

export function simulateSellerWaiting(
  likelihood30: LikelihoodBand,
  snapshot?: MarketSnapshot | null,
): SellerWaitScenario[] {
  // Generate for continuous range, but we'll return specific days
  const periods = [
    { days: 30, label: '30 Days' },
    { days: 60, label: '60 Days' },
    { days: 90, label: '90 Days' },
  ];

  // Base market shift risk from current likelihood
  let baseShiftRisk: number;
  if (likelihood30 === 'High') baseShiftRisk = 3; // hot markets can cool
  else if (likelihood30 === 'Moderate') baseShiftRisk = 2.5;
  else baseShiftRisk = 2; // already cool, less to shift

  let priceTrend: 'up' | 'flat' | 'down' = 'flat';
  let inventoryMod = 0;

  if (snapshot) {
    if (snapshot.saleToListRatio >= 1.02) priceTrend = 'up';
    else if (snapshot.saleToListRatio <= 0.96) priceTrend = 'down';

    if (snapshot.inventorySignal === 'high') inventoryMod = 0.5;
    else if (snapshot.inventorySignal === 'low') inventoryMod = -0.5;

    if (snapshot.medianDOM <= 14) baseShiftRisk += 0.5; // fast market may peak
    else if (snapshot.medianDOM >= 60) baseShiftRisk -= 0.5;
  } else {
    if (likelihood30 === 'High') priceTrend = 'up';
    else if (likelihood30 === 'Low') priceTrend = 'down';
  }

  return periods.map(({ days, label }) => {
    const timeMultiplier = days / 30;

    // Market shift risk increases with time
    const shiftRaw = baseShiftRisk + (timeMultiplier - 1) * 0.5;
    const marketShiftRisk = numToRisk(Math.max(1, Math.min(5, shiftRaw)));

    // Price movement
    let magnitude: string;
    if (priceTrend === 'up') {
      // Seller waiting in rising market might benefit, but trend could reverse
      const pct = (0.5 + timeMultiplier * 0.3).toFixed(0);
      magnitude = `Possible ~${pct}-${(parseInt(pct) + 1)}% appreciation, but trend reversal risk grows`;
    } else if (priceTrend === 'down') {
      const pct = (1 + timeMultiplier * 0.5).toFixed(0);
      magnitude = `~${pct}-${(parseInt(pct) + 2)}% decline risk based on current trajectory`;
    } else {
      magnitude = 'Minimal change expected based on current patterns';
    }

    // Competition risk — more sellers may enter
    const compBase = 2.5 + inventoryMod;
    const competitionRisk = numToRisk(Math.min(5, compBase + (timeMultiplier - 1) * 0.5));

    // Summary
    let summary: string;
    if (likelihood30 === 'High' && days <= 30) {
      summary = 'Current conditions favor sellers. Delaying risks missing the window of strong demand.';
    } else if (likelihood30 === 'High' && days >= 60) {
      summary = 'Extended delays in a strong market risk seasonal shifts and increased competition from new listings.';
    } else if (likelihood30 === 'Low') {
      summary = `Waiting ${days} days in a challenging market may allow conditions to improve, but price erosion risk exists.`;
    } else {
      summary = `Delaying ${days} days introduces uncertainty. Monitor inventory levels and comparable sales closely.`;
    }

    return {
      days,
      label,
      marketShiftRisk,
      priceMovement: { direction: priceTrend, magnitude },
      competitionRisk,
      summary,
    };
  });
}
