/**
 * Competing Offer Simulator — deterministic scoring for competitive landscape.
 * Models how competing buyers affect offer viability.
 * Seller-side: models how many competing offers the listing might attract.
 */

import { BuyerInputs, SellerInputs, MarketConditions, LikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';

export type CompetitorAggressiveness = 'conservative' | 'moderate' | 'aggressive';

export interface CompetingOfferParams {
  numCompetitors: number; // 0-5+
  aggressiveness: CompetitorAggressiveness;
  likelyContingencyWaivers: boolean;
}

export interface CompetingOfferResult {
  neededPriceToCompete: number; // estimated price to remain competitive
  priceGap: number; // difference from current offer
  priceGapPercent: number;
  riskOfLosing: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  riskOfOverpaying: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  competitivePosition: 'Dominant' | 'Strong' | 'Competitive' | 'Weak' | 'Outmatched';
  insights: string[];
}

const AGGRESSIVENESS_MULTIPLIER: Record<CompetitorAggressiveness, number> = {
  conservative: 1.01,
  moderate: 1.04,
  aggressive: 1.08,
};

const COMPETITOR_PRESSURE: Record<number, number> = {
  0: 0,
  1: 0.01,
  2: 0.025,
  3: 0.04,
  4: 0.055,
  5: 0.07,
};

export function simulateCompetingOffers(
  inputs: BuyerInputs,
  params: CompetingOfferParams,
  snapshot?: MarketSnapshot
): CompetingOfferResult {
  const referencePrice = inputs.reference_price || inputs.offer_price;
  const priceRatio = inputs.offer_price / referencePrice;
  
  // Estimate competitor price based on aggressiveness + number
  const competitorPressure = COMPETITOR_PRESSURE[Math.min(params.numCompetitors, 5)] || 0.07;
  const aggressivenessMultiplier = AGGRESSIVENESS_MULTIPLIER[params.aggressiveness];
  
  // Market conditions modifier
  const marketMod = inputs.market_conditions === 'Hot' ? 1.02 
    : inputs.market_conditions === 'Cool' ? 0.98 : 1.0;
  
  // Snapshot-based modifier
  const snapshotMod = snapshot?.saleToListRatio 
    ? snapshot.saleToListRatio
    : 1.0;
  
  const estimatedCompetitivePrice = referencePrice * 
    aggressivenessMultiplier * 
    (1 + competitorPressure) * 
    Math.min(marketMod, snapshotMod > 0.9 ? snapshotMod : 1.0);
  
  const neededPriceToCompete = Math.round(estimatedCompetitivePrice);
  const priceGap = neededPriceToCompete - inputs.offer_price;
  const priceGapPercent = referencePrice > 0 ? (priceGap / referencePrice) * 100 : 0;
  
  // Determine competitive position
  const positionRatio = inputs.offer_price / neededPriceToCompete;
  let competitivePosition: CompetingOfferResult['competitivePosition'];
  if (positionRatio >= 1.03) competitivePosition = 'Dominant';
  else if (positionRatio >= 1.0) competitivePosition = 'Strong';
  else if (positionRatio >= 0.97) competitivePosition = 'Competitive';
  else if (positionRatio >= 0.93) competitivePosition = 'Weak';
  else competitivePosition = 'Outmatched';
  
  // Risk of losing
  let losingScore = 3; // Moderate baseline
  if (params.numCompetitors === 0) losingScore = 1;
  else if (params.numCompetitors >= 4) losingScore += 1;
  if (params.aggressiveness === 'aggressive') losingScore += 1;
  if (params.likelyContingencyWaivers && inputs.contingencies.length > 1) losingScore += 1;
  if (positionRatio < 0.97) losingScore += 1;
  if (positionRatio >= 1.03) losingScore -= 2;
  if (inputs.financing_type === 'Cash') losingScore -= 1;
  losingScore = Math.max(1, Math.min(5, losingScore));
  
  // Risk of overpaying
  let overpayScore = 2;
  if (priceRatio > 1.1) overpayScore += 2;
  else if (priceRatio > 1.05) overpayScore += 1;
  if (params.numCompetitors >= 3 && params.aggressiveness === 'aggressive') overpayScore += 1;
  if (priceRatio < 0.95) overpayScore -= 1;
  overpayScore = Math.max(1, Math.min(5, overpayScore));
  
  const bands: Record<number, 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High'> = {
    1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High',
  };
  
  // Generate insights
  const insights: string[] = [];
  if (params.numCompetitors === 0) {
    insights.push('With no competing offers, your negotiating position is significantly stronger.');
  } else {
    insights.push(`With ${params.numCompetitors} competing offer${params.numCompetitors > 1 ? 's' : ''}, the competitive pressure is ${params.numCompetitors >= 3 ? 'elevated' : 'moderate'}.`);
  }
  if (params.likelyContingencyWaivers && inputs.contingencies.length > 0) {
    insights.push('Competitors may waive contingencies, which could put your offer at a disadvantage if you retain yours.');
  }
  if (inputs.financing_type === 'Cash') {
    insights.push('Cash offers are often preferred by sellers for certainty of closing.');
  }
  if (priceGap > 0) {
    insights.push(`Your offer may need to increase by approximately ${priceGapPercent.toFixed(1)}% to remain competitive.`);
  } else {
    insights.push('Your current offer price appears competitive for this scenario.');
  }
  
  return {
    neededPriceToCompete,
    priceGap: Math.max(0, priceGap),
    priceGapPercent: Math.max(0, priceGapPercent),
    riskOfLosing: bands[losingScore],
    riskOfOverpaying: bands[overpayScore],
    competitivePosition,
    insights,
  };
}

// ── Seller Side: Expected Competing Offers ──

export interface SellerCompetingOffersResult {
  expectedOffers: number;
  offerRange: { low: number; high: number };
  demandLevel: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  buyerUrgency: 'Low' | 'Moderate' | 'High';
  insights: string[];
}

export function estimateSellerCompetingOffers(
  inputs: SellerInputs,
  likelihood30: LikelihoodBand,
  snapshot?: MarketSnapshot
): SellerCompetingOffersResult {
  const listPrice = inputs.seller_selected_list_price;
  
  // Base expected offers from likelihood
  let baseOffers = likelihood30 === 'High' ? 3.5 : likelihood30 === 'Moderate' ? 1.8 : 0.7;
  
  // Snapshot modifiers
  if (snapshot) {
    if (snapshot.medianDOM < 15) baseOffers += 1.5;
    else if (snapshot.medianDOM < 30) baseOffers += 0.5;
    else if (snapshot.medianDOM > 60) baseOffers -= 0.5;
    
    if (snapshot.saleToListRatio > 1.0) baseOffers += 0.5;
    if (snapshot.saleToListRatio > 1.03) baseOffers += 0.5;
  }
  
  // Strategy modifier
  if (inputs.strategy_preference === 'Prioritize speed') baseOffers += 0.5;
  if (inputs.strategy_preference === 'Maximize price') baseOffers -= 0.5;
  
  const expectedOffers = Math.max(0, Math.round(baseOffers * 10) / 10);
  
  // Offer range
  const lowEnd = Math.round(listPrice * 0.95);
  const highEnd = Math.round(listPrice * (snapshot?.saleToListRatio ? snapshot.saleToListRatio : 1.02));
  
  // Demand level
  let demandScore = expectedOffers <= 0.5 ? 1 : expectedOffers <= 1.5 ? 2 : expectedOffers <= 3 ? 3 : expectedOffers <= 5 ? 4 : 5;
  const bands: Record<number, 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High'> = {
    1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High',
  };
  
  // Buyer urgency
  const urgency: SellerCompetingOffersResult['buyerUrgency'] = 
    expectedOffers >= 3 ? 'High' : expectedOffers >= 1.5 ? 'Moderate' : 'Low';
  
  // Insights
  const insights: string[] = [];
  if (expectedOffers >= 3) {
    insights.push('Strong buyer interest is expected at this price point, potentially creating competitive bidding.');
  } else if (expectedOffers >= 1.5) {
    insights.push('Moderate buyer interest is expected, with a reasonable chance of receiving multiple offers.');
  } else {
    insights.push('Limited buyer interest may result in fewer offers. Pricing strategy may need adjustment.');
  }
  
  if (snapshot?.saleToListRatio && snapshot.saleToListRatio > 1.0) {
    insights.push(`Properties in this market typically sell above list price (${(snapshot.saleToListRatio * 100).toFixed(1)}% sale-to-list).`);
  }
  
  if (inputs.strategy_preference === 'Prioritize speed') {
    insights.push('Speed-focused pricing tends to attract more offers sooner.');
  }
  
  return {
    expectedOffers,
    offerRange: { low: lowEnd, high: Math.max(highEnd, listPrice) },
    demandLevel: bands[Math.min(5, Math.max(1, demandScore))],
    buyerUrgency: urgency,
    insights,
  };
}
