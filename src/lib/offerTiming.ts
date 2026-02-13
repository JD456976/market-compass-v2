/**
 * Offer Timing Advantage — deterministic timing signals.
 * Buyer side: how timing affects offer strength.
 * Seller side: how listing timing affects buyer interest.
 */

import { BuyerInputs, SellerInputs, LikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';

export type TimingStrength = 'Optimal' | 'Good' | 'Neutral' | 'Weak';

export interface TimingSignal {
  label: string;
  strength: 'positive' | 'neutral' | 'negative';
  detail: string;
}

export interface TimingResult {
  overall: TimingStrength;
  score: number; // 1-4
  signals: TimingSignal[];
  summary: string;
}

export function analyzeBuyerTiming(
  inputs: BuyerInputs,
  snapshot?: MarketSnapshot
): TimingResult {
  let score = 2.5; // Neutral baseline
  const signals: TimingSignal[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const hour = now.getHours();
  const month = now.getMonth();
  
  // Days on market timing
  const dom = inputs.days_on_market;
  if (dom !== undefined && dom !== null) {
    if (dom <= 3) {
      signals.push({ label: 'First-Mover Advantage', strength: 'positive', detail: 'Submitting early on a fresh listing often signals serious intent' });
      score -= 0.5;
    } else if (dom <= 7) {
      signals.push({ label: 'Early Interest', strength: 'positive', detail: 'Within the first week — still in the initial wave of offers' });
      score -= 0.3;
    } else if (dom >= 30 && dom < 60) {
      signals.push({ label: 'Extended Listing', strength: 'neutral', detail: 'Property has been available for a while — less urgency from seller' });
      score += 0.3;
    } else if (dom && dom >= 60) {
      signals.push({ label: 'Stale Listing', strength: 'positive', detail: 'Extended time on market may give you more negotiating leverage' });
      score -= 0.3; // Good timing for buyer
    }
  }
  
  // Day of week signal
  if (dayOfWeek >= 1 && dayOfWeek <= 3) { // Mon-Wed
    signals.push({ label: 'Weekday Submission', strength: 'positive', detail: 'Offers submitted early in the week allow sellers time to review before weekend showings' });
    score -= 0.3;
  } else if (dayOfWeek === 0 || dayOfWeek === 6) {
    signals.push({ label: 'Weekend Submission', strength: 'neutral', detail: 'Weekend offers may compete with open house traffic' });
    score += 0.2;
  } else {
    signals.push({ label: 'Late-Week Submission', strength: 'neutral', detail: 'Thursday/Friday offers are common — standard timing' });
  }
  
  // Seasonal timing
  if (month >= 10 || month <= 1) {
    signals.push({ label: 'Off-Season Advantage', strength: 'positive', detail: 'Winter buyers face less competition — favorable timing' });
    score -= 0.5;
  } else if (month >= 3 && month <= 5) {
    signals.push({ label: 'Peak Season', strength: 'negative', detail: 'Spring market brings maximum competition from other buyers' });
    score += 0.5;
  } else if (month >= 6 && month <= 8) {
    signals.push({ label: 'Summer Market', strength: 'neutral', detail: 'Active market with moderate competition levels' });
  } else {
    signals.push({ label: 'Fall Market', strength: 'positive', detail: 'Fall often brings motivated sellers before year-end' });
    score -= 0.2;
  }
  
  // Closing timeline advantage
  if (inputs.closing_timeline === '<21') {
    signals.push({ label: 'Fast Close', strength: 'positive', detail: 'Quick closing timeline appeals to sellers who want certainty' });
    score -= 0.3;
  } else if (inputs.closing_timeline === '45+') {
    signals.push({ label: 'Extended Close', strength: 'negative', detail: 'Longer timelines may be less attractive in competitive situations' });
    score += 0.3;
  }
  
  // Market speed from snapshot
  if (snapshot && snapshot.medianDOM < 14) {
    signals.push({ label: 'Fast Market', strength: 'negative', detail: 'Properties move quickly — speed of response is critical' });
    score += 0.3;
  }
  
  score = Math.max(1, Math.min(4, Math.round(score)));
  const levels: Record<number, TimingStrength> = {
    1: 'Optimal', 2: 'Good', 3: 'Neutral', 4: 'Weak',
  };
  const overall = levels[score];
  
  const summaries: Record<TimingStrength, string> = {
    'Optimal': 'Your timing aligns well with multiple favorable factors. This is an advantageous moment to submit.',
    'Good': 'Timing conditions are generally favorable with a few positive signals.',
    'Neutral': 'Standard timing dynamics — no significant advantage or disadvantage.',
    'Weak': 'Timing factors suggest elevated competition or less favorable conditions.',
  };
  
  return { overall, score, signals, summary: summaries[overall] };
}

// ── Seller Side: Listing Timing Analysis ──

export function analyzeSellerTiming(
  inputs: SellerInputs,
  likelihood30: LikelihoodBand,
  snapshot?: MarketSnapshot
): TimingResult {
  let score = 2.5;
  const signals: TimingSignal[] = [];
  const now = new Date();
  const month = now.getMonth();
  const dayOfWeek = now.getDay();
  
  // Seasonal timing for sellers
  if (month >= 3 && month <= 5) {
    signals.push({ label: 'Peak Selling Season', strength: 'positive', detail: 'Spring is historically the strongest season for listings' });
    score -= 0.5;
  } else if (month >= 10 || month <= 1) {
    signals.push({ label: 'Off-Season Listing', strength: 'negative', detail: 'Winter listings typically see fewer buyers and longer days on market' });
    score += 0.5;
  } else if (month >= 6 && month <= 8) {
    signals.push({ label: 'Summer Activity', strength: 'neutral', detail: 'Active market with families looking to move before school year' });
    score -= 0.2;
  } else {
    signals.push({ label: 'Fall Market', strength: 'neutral', detail: 'Moderate activity — serious buyers often shop in fall' });
  }
  
  // Day of week for listing launch
  if (dayOfWeek === 4 || dayOfWeek === 3) { // Wed-Thu
    signals.push({ label: 'Listing Launch Day', strength: 'positive', detail: 'Mid-week listings capture attention before weekend showings' });
    score -= 0.3;
  } else if (dayOfWeek === 0 || dayOfWeek === 1) {
    signals.push({ label: 'Listing Launch Day', strength: 'negative', detail: 'Early-week listings may lose momentum before weekend activity' });
    score += 0.2;
  }
  
  // Timeframe alignment
  if (inputs.desired_timeframe === '30' && likelihood30 === 'High') {
    signals.push({ label: 'Timeframe Match', strength: 'positive', detail: 'Market conditions support your 30-day sale target' });
    score -= 0.3;
  } else if (inputs.desired_timeframe === '30' && likelihood30 === 'Low') {
    signals.push({ label: 'Timeframe Risk', strength: 'negative', detail: '30-day target may be ambitious in current conditions' });
    score += 0.5;
  }
  
  // Market speed
  if (snapshot) {
    if (snapshot.medianDOM < 15) {
      signals.push({ label: 'Market Velocity', strength: 'positive', detail: `Fast-moving market (${snapshot.medianDOM} day median) supports quick sales` });
      score -= 0.3;
    } else if (snapshot.medianDOM > 45) {
      signals.push({ label: 'Market Velocity', strength: 'negative', detail: `Slower market (${snapshot.medianDOM} day median) — patience may be required` });
      score += 0.3;
    }
  }
  
  score = Math.max(1, Math.min(4, Math.round(score)));
  const levels: Record<number, TimingStrength> = {
    1: 'Optimal', 2: 'Good', 3: 'Neutral', 4: 'Weak',
  };
  const overall = levels[score];
  
  const summaries: Record<TimingStrength, string> = {
    'Optimal': 'Listing timing is highly favorable. Multiple signals support strong buyer engagement.',
    'Good': 'Timing conditions are generally supportive of your listing goals.',
    'Neutral': 'Standard market timing — no significant advantage or disadvantage.',
    'Weak': 'Timing factors suggest potential headwinds. Consider adjusting strategy or expectations.',
  };
  
  return { overall, score, signals, summary: summaries[overall] };
}
