/**
 * Seller Motivation Indicator — inferred signals about seller/buyer leverage.
 * Buyer side: how motivated is the seller?
 * Seller side: how motivated are buyers in this market?
 */

import { BuyerInputs, SellerInputs, LikelihoodBand, ListingHistory } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';

export type MotivationLevel = 'Hot Listing' | 'Neutral' | 'Motivated' | 'Stale';
export type BuyerMotivationLevel = 'Urgent' | 'Active' | 'Patient' | 'Window Shopping';

export interface SellerMotivationResult {
  level: MotivationLevel;
  score: number; // 1-4 (Hot=1, Stale=4)
  signals: MotivationSignal[];
  summary: string;
  leverageAdvice: string;
}

export interface BuyerMotivationResult {
  level: BuyerMotivationLevel;
  score: number; // 1-4
  signals: MotivationSignal[];
  summary: string;
  leverageAdvice: string;
}

export interface MotivationSignal {
  label: string;
  indicator: 'positive' | 'neutral' | 'negative';
  detail: string;
}

export function inferSellerMotivation(
  inputs: BuyerInputs,
  snapshot?: MarketSnapshot,
  listingHistory?: ListingHistory
): SellerMotivationResult {
  let score = 2; // Neutral baseline
  const signals: MotivationSignal[] = [];
  
  // Days on market signal
  const dom = inputs.days_on_market;
  if (dom !== undefined && dom !== null) {
    if (dom <= 7) {
      signals.push({ label: 'Days on Market', indicator: 'negative', detail: `${dom} days — fresh listing, seller has strong position` });
      score -= 0.5;
    } else if (dom <= 21) {
      signals.push({ label: 'Days on Market', indicator: 'neutral', detail: `${dom} days — still in initial marketing window` });
    } else if (dom <= 45) {
      signals.push({ label: 'Days on Market', indicator: 'neutral', detail: `${dom} days — moderate time on market` });
      score += 0.5;
    } else if (dom <= 90) {
      signals.push({ label: 'Days on Market', indicator: 'positive', detail: `${dom} days — extended time may indicate flexibility` });
      score += 1;
    } else {
      signals.push({ label: 'Days on Market', indicator: 'positive', detail: `${dom}+ days — prolonged listing often signals motivation` });
      score += 1.5;
    }
  }
  
  // Market conditions signal
  if (inputs.market_conditions === 'Cool') {
    signals.push({ label: 'Market Conditions', indicator: 'positive', detail: 'Cool market — sellers may have fewer options' });
    score += 0.5;
  } else if (inputs.market_conditions === 'Hot') {
    signals.push({ label: 'Market Conditions', indicator: 'negative', detail: 'Hot market — seller likely has multiple interested buyers' });
    score -= 0.5;
  } else {
    signals.push({ label: 'Market Conditions', indicator: 'neutral', detail: 'Balanced market — standard negotiating dynamics' });
  }
  
  // Snapshot-based signals
  if (snapshot) {
    if (snapshot.medianDOM > 45) {
      signals.push({ label: 'Area Trend', indicator: 'positive', detail: `Area median DOM is ${snapshot.medianDOM} days — slower market pace` });
      score += 0.5;
    } else if (snapshot.medianDOM < 15) {
      signals.push({ label: 'Area Trend', indicator: 'negative', detail: `Area median DOM is ${snapshot.medianDOM} days — fast-moving market` });
      score -= 0.5;
    }
    
    if (snapshot.saleToListRatio < 0.98) {
      signals.push({ label: 'Price Trends', indicator: 'positive', detail: `Sellers accepting below list (${(snapshot.saleToListRatio * 100).toFixed(1)}%) — more room to negotiate` });
      score += 0.5;
    } else if (snapshot.saleToListRatio > 1.02) {
      signals.push({ label: 'Price Trends', indicator: 'negative', detail: `Properties selling above list (${(snapshot.saleToListRatio * 100).toFixed(1)}%) — limited negotiation room` });
      score -= 0.3;
    }
  }
  
  // Seasonal timing signal
  const month = new Date().getMonth();
  if (month >= 10 || month <= 1) { // Nov-Feb
    signals.push({ label: 'Seasonal Timing', indicator: 'positive', detail: 'Winter listing — sellers listing in off-season may be more motivated' });
    score += 0.5;
  } else if (month >= 3 && month <= 5) { // Apr-Jun
    signals.push({ label: 'Seasonal Timing', indicator: 'negative', detail: 'Peak season — high demand typically favors sellers' });
    score -= 0.3;
  } else {
    signals.push({ label: 'Seasonal Timing', indicator: 'neutral', detail: 'Standard selling season' });
  }
  
  // Listing History signals
  if (listingHistory) {
    if (listingHistory.wasRelisted) {
      signals.push({
        label: 'Re-Listed Property',
        indicator: 'positive',
        detail: `Property was previously listed and re-listed${listingHistory.wasCanceled ? ' after cancellation' : ''} — seller may be more flexible on terms`,
      });
      score += 1;
    } else if (listingHistory.wasCanceled) {
      signals.push({
        label: 'Previously Canceled',
        indicator: 'positive',
        detail: 'Prior listing was canceled — circumstances may have changed, increasing motivation',
      });
      score += 0.5;
    }

    if (listingHistory.cumulativeDom > 60) {
      signals.push({
        label: 'Cumulative Market Exposure',
        indicator: 'positive',
        detail: `${listingHistory.cumulativeDom} total days across all listings — extended exposure strongly suggests willingness to negotiate`,
      });
      score += 1;
    } else if (listingHistory.cumulativeDom > 30) {
      signals.push({
        label: 'Cumulative Market Exposure',
        indicator: 'positive',
        detail: `${listingHistory.cumulativeDom} total days across all listings — moderate exposure may indicate flexibility`,
      });
      score += 0.5;
    }

    if (listingHistory.totalPriceDrop > 0 && listingHistory.highestPrice > 0) {
      const pct = ((listingHistory.totalPriceDrop / listingHistory.highestPrice) * 100).toFixed(1);
      signals.push({
        label: 'Price Reduction History',
        indicator: 'positive',
        detail: `Price dropped ${pct}% ($${listingHistory.totalPriceDrop.toLocaleString()}) from original — seller adjusting expectations`,
      });
      score += 0.5;
    }
  }
  
  // Clamp and determine level
  score = Math.max(1, Math.min(4, Math.round(score)));
  const levels: Record<number, MotivationLevel> = {
    1: 'Hot Listing', 2: 'Neutral', 3: 'Motivated', 4: 'Stale',
  };
  const level = levels[score];
  
  const summaries: Record<MotivationLevel, string> = {
    'Hot Listing': 'This listing shows strong demand signals. The seller likely has leverage and may not need to negotiate significantly.',
    'Neutral': 'Standard market positioning. Neither party has a clear advantage based on available signals.',
    'Motivated': 'Several signals suggest the seller may be open to negotiation. Consider strategic positioning.',
    'Stale': 'Multiple indicators suggest this listing has been challenging to sell. There may be significant room for negotiation.',
  };
  
  const advice: Record<MotivationLevel, string> = {
    'Hot Listing': 'Present your strongest offer terms upfront. Waiving non-essential contingencies may improve competitiveness.',
    'Neutral': 'A balanced approach works well. Fair pricing with standard contingencies is appropriate.',
    'Motivated': 'You may have room to negotiate on price or request concessions like closing cost credits.',
    'Stale': 'Consider an offer below asking with favorable terms. Seller may prioritize certainty of close over price.',
  };
  
  return { level, score, signals, summary: summaries[level], leverageAdvice: advice[level] };
}

// ── Seller Side: Buyer Motivation Assessment ──

export function inferBuyerMotivation(
  inputs: SellerInputs,
  likelihood30: LikelihoodBand,
  snapshot?: MarketSnapshot
): BuyerMotivationResult {
  let score = 2;
  const signals: MotivationSignal[] = [];
  
  // Likelihood-based
  if (likelihood30 === 'High') {
    signals.push({ label: 'Sale Likelihood', indicator: 'positive', detail: 'High sale probability suggests strong buyer interest' });
    score -= 0.5;
  } else if (likelihood30 === 'Low') {
    signals.push({ label: 'Sale Likelihood', indicator: 'negative', detail: 'Lower sale probability may indicate less buyer urgency' });
    score += 1;
  }
  
  // Snapshot signals
  if (snapshot) {
    if (snapshot.medianDOM < 15) {
      signals.push({ label: 'Market Speed', indicator: 'positive', detail: `Fast market (${snapshot.medianDOM} day median DOM) — buyers are acting quickly` });
      score -= 0.5;
    } else if (snapshot.medianDOM > 45) {
      signals.push({ label: 'Market Speed', indicator: 'negative', detail: `Slower market (${snapshot.medianDOM} day median DOM) — buyers are taking their time` });
      score += 0.5;
    }
    
    if (snapshot.saleToListRatio > 1.0) {
      signals.push({ label: 'Buyer Willingness', indicator: 'positive', detail: `Buyers paying above list (${(snapshot.saleToListRatio * 100).toFixed(1)}%) — strong demand` });
      score -= 0.5;
    } else if (snapshot.saleToListRatio < 0.97) {
      signals.push({ label: 'Buyer Willingness', indicator: 'negative', detail: `Buyers negotiating below list (${(snapshot.saleToListRatio * 100).toFixed(1)}%) — cautious demand` });
      score += 0.5;
    }
  }
  
  // Strategy impact
  if (inputs.strategy_preference === 'Prioritize speed') {
    signals.push({ label: 'Pricing Strategy', indicator: 'positive', detail: 'Speed-focused pricing attracts more motivated buyers' });
    score -= 0.3;
  } else if (inputs.strategy_preference === 'Maximize price') {
    signals.push({ label: 'Pricing Strategy', indicator: 'negative', detail: 'Premium pricing may filter to only highly motivated buyers' });
    score += 0.3;
  }
  
  // Seasonal
  const month = new Date().getMonth();
  if (month >= 3 && month <= 5) {
    signals.push({ label: 'Seasonal Timing', indicator: 'positive', detail: 'Peak buying season — buyer pool is largest' });
    score -= 0.3;
  } else if (month >= 10 || month <= 1) {
    signals.push({ label: 'Seasonal Timing', indicator: 'negative', detail: 'Off-season — fewer active buyers in the market' });
    score += 0.3;
  }
  
  score = Math.max(1, Math.min(4, Math.round(score)));
  const levels: Record<number, BuyerMotivationLevel> = {
    1: 'Urgent', 2: 'Active', 3: 'Patient', 4: 'Window Shopping',
  };
  const level = levels[score];
  
  const summaries: Record<BuyerMotivationLevel, string> = {
    'Urgent': 'Buyers in this market are highly motivated and moving quickly. Expect competitive offers.',
    'Active': 'Buyers are actively searching with standard motivation levels.',
    'Patient': 'Buyers appear to be taking a measured approach, comparing options carefully.',
    'Window Shopping': 'Buyer activity is low. Attracting serious buyers may require pricing adjustments.',
  };
  
  const advice: Record<BuyerMotivationLevel, string> = {
    'Urgent': 'You may be able to hold firm on price and terms. Consider setting an offer deadline.',
    'Active': 'Standard negotiation dynamics apply. Price fairly and be responsive.',
    'Patient': 'Consider incentives like closing cost credits or home warranty to motivate buyers.',
    'Window Shopping': 'A price reduction or enhanced marketing may be needed to generate interest.',
  };
  
  return { level, score, signals, summary: summaries[level], leverageAdvice: advice[level] };
}
