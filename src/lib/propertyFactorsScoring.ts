/**
 * Property Factors Scoring Module
 * 
 * Converts PropertyFactor weights from MLSPIN extraction into
 * scoring modifiers for the buyer/seller determination engines.
 */

import { PropertyFactor } from '@/lib/mlspinParser';

export interface FactorModifiers {
  acceptance: number;
  overpayRisk: number;
  losingHomeRisk: number;
  descriptions: string[];
}

export interface SellerFactorModifiers {
  score: number;
  descriptions: string[];
}

/**
 * Calculate buyer scoring modifiers from property intelligence factors.
 * 
 * Positive-weight factors (e.g. "Water Feature" +2, "Recently Renovated" +1.5):
 *   - Increase acceptance (property is desirable → seller less likely to negotiate)
 *   - Increase overpay risk (premium features may inflate price)
 *   - Decrease losing home risk (desirable property → more competition)
 * 
 * Negative-weight factors (e.g. "Oil Heat" -1, "As-Is Sale" -1.5):
 *   - Increase acceptance (seller has fewer options → more willing to accept)
 *   - Decrease overpay risk (issues justify lower price)
 *   - Increase losing home risk slightly (less competition but seller may reject low offers)
 */
export function calculateBuyerFactorModifiers(factors: PropertyFactor[]): FactorModifiers {
  if (!factors || factors.length === 0) {
    return { acceptance: 0, overpayRisk: 0, losingHomeRisk: 0, descriptions: [] };
  }

  let acceptance = 0;
  let overpayRisk = 0;
  let losingHomeRisk = 0;
  const descriptions: string[] = [];

  for (const factor of factors) {
    // Only apply high/medium confidence factors
    if (factor.confidence === 'low') continue;

    const w = factor.weight;
    const confMultiplier = factor.confidence === 'high' ? 1 : 0.5;
    const scaled = w * confMultiplier;

    if (w > 0) {
      // Positive factor: desirable property
      // Harder to get accepted (seller holds power), higher overpay risk, lower losing risk
      acceptance -= scaled * 0.25;
      overpayRisk += scaled * 0.3;
      losingHomeRisk -= scaled * 0.25;
    } else if (w < 0) {
      // Negative factor: property has issues
      // Easier to get accepted (seller motivated), lower overpay risk, slightly lower losing risk
      acceptance += Math.abs(scaled) * 0.3;
      overpayRisk += scaled * 0.25; // negative weight → reduces overpay risk
      losingHomeRisk -= Math.abs(scaled) * 0.15;
    }

    if (Math.abs(scaled) >= 0.25) {
      const dir = w > 0 ? 'desirable' : 'concern';
      descriptions.push(`Property Factor (${factor.label}, ${dir}): ${scaled > 0 ? '+' : ''}${scaled.toFixed(2)} modifier`);
    }
  }

  return {
    acceptance: Math.round(acceptance * 100) / 100,
    overpayRisk: Math.round(overpayRisk * 100) / 100,
    losingHomeRisk: Math.round(losingHomeRisk * 100) / 100,
    descriptions,
  };
}

/**
 * Calculate seller scoring modifier from property intelligence factors.
 * 
 * Positive factors boost likelihood of sale (desirable property sells faster).
 * Negative factors reduce likelihood (issues slow the sale).
 */
export function calculateSellerFactorModifiers(factors: PropertyFactor[]): SellerFactorModifiers {
  if (!factors || factors.length === 0) {
    return { score: 0, descriptions: [] };
  }

  let score = 0;
  const descriptions: string[] = [];

  for (const factor of factors) {
    if (factor.confidence === 'low') continue;

    const confMultiplier = factor.confidence === 'high' ? 1 : 0.5;
    const scaled = factor.weight * confMultiplier * 0.4;

    score += scaled;

    if (Math.abs(scaled) >= 0.15) {
      descriptions.push(`Property Factor (${factor.label}): ${scaled > 0 ? '+' : ''}${scaled.toFixed(2)} score`);
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    descriptions,
  };
}
