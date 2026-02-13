/**
 * Negotiation Pathway Planner — deterministic next-move suggestions.
 * Buyer side: what to do if offer is rejected.
 * Seller side: how to respond to offers.
 */

import { BuyerInputs, SellerInputs, ExtendedLikelihoodBand, LikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';

export type MoveType = 'increase-price' | 'adjust-terms' | 'wait' | 'walk-away' | 'hold-firm' | 'counter' | 'accept-best' | 'reduce-price';
export type MovePriority = 'primary' | 'secondary' | 'fallback';

export interface NegotiationMove {
  type: MoveType;
  priority: MovePriority;
  label: string;
  description: string;
  impact: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface NegotiationPathwayResult {
  moves: NegotiationMove[];
  overallStrategy: string;
  positionStrength: 'Strong' | 'Balanced' | 'Weak';
}

export function planBuyerNegotiation(
  inputs: BuyerInputs,
  acceptance: ExtendedLikelihoodBand,
  riskOfLosing: ExtendedLikelihoodBand,
  snapshot?: MarketSnapshot
): NegotiationPathwayResult {
  const moves: NegotiationMove[] = [];
  const priceRatio = inputs.reference_price ? inputs.offer_price / inputs.reference_price : 1.0;
  const contingencyCount = inputs.contingencies.filter(c => c !== 'None').length;
  
  // Determine position strength
  let positionStrength: NegotiationPathwayResult['positionStrength'] = 'Balanced';
  if (acceptance === 'High' || acceptance === 'Very High') positionStrength = 'Strong';
  if (acceptance === 'Low' || acceptance === 'Very Low') positionStrength = 'Weak';
  
  // ── Primary Move ──
  if (acceptance === 'Very Low' || acceptance === 'Low') {
    // Weak position - need to improve
    if (priceRatio < 1.0) {
      moves.push({
        type: 'increase-price',
        priority: 'primary',
        label: 'Increase Offer Price',
        description: `Your offer is ${((1 - priceRatio) * 100).toFixed(1)}% below reference. A modest increase could significantly improve acceptance.`,
        impact: 'Could move acceptance likelihood up 1-2 tiers',
        riskLevel: 'medium',
      });
    }
    
    if (contingencyCount >= 2) {
      moves.push({
        type: 'adjust-terms',
        priority: priceRatio >= 1.0 ? 'primary' : 'secondary',
        label: 'Reduce Contingencies',
        description: `You have ${contingencyCount} contingencies. Removing non-essential ones signals stronger commitment.`,
        impact: 'Removing each contingency may improve position by 0.5-1 tier',
        riskLevel: 'medium',
      });
    }
  } else if (acceptance === 'Moderate') {
    // Borderline - strategic adjustments
    if (inputs.closing_timeline === '45+' || inputs.closing_timeline === '31-45') {
      moves.push({
        type: 'adjust-terms',
        priority: 'primary',
        label: 'Shorten Closing Timeline',
        description: 'A faster close can be more appealing than a higher price to many sellers.',
        impact: 'Demonstrates serious intent and certainty',
        riskLevel: 'low',
      });
    } else {
      moves.push({
        type: 'increase-price',
        priority: 'primary',
        label: 'Modest Price Increase',
        description: 'A small escalation (1-3%) could tip the balance in your favor.',
        impact: 'May move acceptance to High',
        riskLevel: 'low',
      });
    }
  } else {
    // Strong position
    moves.push({
      type: 'hold-firm',
      priority: 'primary',
      label: 'Hold Current Position',
      description: 'Your offer is competitive. Maintaining current terms shows confidence.',
      impact: 'Preserves value while maintaining strong position',
      riskLevel: 'low',
    });
  }
  
  // ── Secondary Moves ──
  if (inputs.financing_type !== 'Cash' && (acceptance === 'Low' || acceptance === 'Moderate')) {
    moves.push({
      type: 'adjust-terms',
      priority: 'secondary',
      label: 'Increase Earnest Money',
      description: 'A larger deposit signals commitment and reduces perceived risk for the seller.',
      impact: 'Shows seller you are serious about closing',
      riskLevel: 'low',
    });
  }
  
  if (riskOfLosing === 'High' || riskOfLosing === 'Very High') {
    moves.push({
      type: 'adjust-terms',
      priority: 'secondary',
      label: 'Add Escalation Clause',
      description: 'An escalation clause automatically increases your offer if competing bids exist, up to your maximum.',
      impact: 'Protects against being outbid by a small margin',
      riskLevel: 'medium',
    });
  }
  
  // ── Fallback Moves ──
  const dom = inputs.days_on_market;
  if (dom && dom > 30) {
    moves.push({
      type: 'wait',
      priority: 'fallback',
      label: 'Wait & Monitor',
      description: 'The listing has been available for a while. Waiting for a potential price reduction may be strategic.',
      impact: 'May result in better terms but risks another buyer acting first',
      riskLevel: 'medium',
    });
  }
  
  if (priceRatio > 1.1 || (riskOfLosing === 'Very Low' && acceptance === 'Very Low')) {
    moves.push({
      type: 'walk-away',
      priority: 'fallback',
      label: 'Consider Other Properties',
      description: 'If the gap between your budget and this property is significant, redirecting your search may be more effective.',
      impact: 'Preserves budget and avoids overextending',
      riskLevel: 'low',
    });
  } else {
    moves.push({
      type: 'walk-away',
      priority: 'fallback',
      label: 'Walk Away as Leverage',
      description: 'Sometimes the most powerful negotiation tool is willingness to walk away.',
      impact: 'May prompt seller to reconsider or counter',
      riskLevel: 'high',
    });
  }
  
  // Overall strategy
  const strategies: Record<typeof positionStrength, string> = {
    'Strong': 'You are negotiating from a position of strength. Focus on protecting value while maintaining your competitive edge.',
    'Balanced': 'The negotiation is evenly matched. Strategic adjustments to terms or price could tip the outcome in your favor.',
    'Weak': 'Your position needs strengthening. Focus on the highest-impact changes — typically price or contingency adjustments.',
  };
  
  return {
    moves: moves.slice(0, 5), // Max 5 moves
    overallStrategy: strategies[positionStrength],
    positionStrength,
  };
}

// ── Seller Side: Counter-Offer Strategy ──

export function planSellerNegotiation(
  inputs: SellerInputs,
  likelihood30: LikelihoodBand,
  snapshot?: MarketSnapshot
): NegotiationPathwayResult {
  const moves: NegotiationMove[] = [];
  
  let positionStrength: NegotiationPathwayResult['positionStrength'] = 'Balanced';
  if (likelihood30 === 'High') positionStrength = 'Strong';
  if (likelihood30 === 'Low') positionStrength = 'Weak';
  
  if (likelihood30 === 'High') {
    // Strong position
    moves.push({
      type: 'hold-firm',
      priority: 'primary',
      label: 'Hold at List Price',
      description: 'Market conditions support your asking price. Standing firm may yield full-price or above-list offers.',
      impact: 'Maximizes sale price while maintaining demand',
      riskLevel: 'low',
    });
    
    moves.push({
      type: 'counter',
      priority: 'secondary',
      label: 'Counter with Terms',
      description: 'If an offer comes in slightly below, counter with favorable terms rather than a lower price.',
      impact: 'Maintains price while showing flexibility',
      riskLevel: 'low',
    });
    
    moves.push({
      type: 'accept-best',
      priority: 'secondary',
      label: 'Set Offer Deadline',
      description: 'Creating urgency through an offer deadline can drive competitive bidding.',
      impact: 'May attract multiple offers and bidding competition',
      riskLevel: 'medium',
    });
  } else if (likelihood30 === 'Moderate') {
    moves.push({
      type: 'counter',
      priority: 'primary',
      label: 'Strategic Counter-Offer',
      description: 'Meet buyers partway. A counter 2-3% above their offer shows flexibility while protecting value.',
      impact: 'Opens negotiation while maintaining leverage',
      riskLevel: 'low',
    });
    
    moves.push({
      type: 'adjust-terms',
      priority: 'secondary',
      label: 'Offer Closing Credits',
      description: 'Offering 1-2% in closing cost credits can attract buyers without reducing your net.',
      impact: 'Makes offer more attractive without headline price reduction',
      riskLevel: 'low',
    });
    
    if (inputs.desired_timeframe === '30') {
      moves.push({
        type: 'reduce-price',
        priority: 'fallback',
        label: 'Prepare for Price Adjustment',
        description: 'If no offers materialize in 2-3 weeks, a strategic price reduction of 3-5% often reignites interest.',
        impact: 'Fresh marketing at new price point can attract new buyer pool',
        riskLevel: 'medium',
      });
    }
  } else {
    // Weak position
    moves.push({
      type: 'reduce-price',
      priority: 'primary',
      label: 'Strategic Price Reduction',
      description: 'Current pricing may not align with market conditions. A reduction of 3-7% could attract significantly more interest.',
      impact: 'Price reductions often generate a wave of new buyer activity',
      riskLevel: 'medium',
    });
    
    moves.push({
      type: 'adjust-terms',
      priority: 'secondary',
      label: 'Enhance Listing Value',
      description: 'Consider adding incentives: home warranty, closing credits, or flexible move-in dates.',
      impact: 'Differentiates your listing from competitors',
      riskLevel: 'low',
    });
    
    moves.push({
      type: 'accept-best',
      priority: 'secondary',
      label: 'Accept Best Available Offer',
      description: 'If an offer is within 5% of your goal, the cost of waiting may exceed the gap.',
      impact: 'Eliminates carrying costs and market risk',
      riskLevel: 'low',
    });
    
    moves.push({
      type: 'wait',
      priority: 'fallback',
      label: 'Consider Timing',
      description: 'If not urgent, waiting for a seasonal uptick (spring) may yield better results.',
      impact: 'Market conditions may improve but carrying costs continue',
      riskLevel: 'high',
    });
  }
  
  const strategies: Record<typeof positionStrength, string> = {
    'Strong': 'You are in a strong position. Focus on maximizing value and setting favorable terms.',
    'Balanced': 'The market is balanced. Be prepared to negotiate strategically while protecting your key priorities.',
    'Weak': 'Current conditions favor buyers. Focus on making your listing stand out and be open to creative deal structures.',
  };
  
  return {
    moves: moves.slice(0, 5),
    overallStrategy: strategies[positionStrength],
    positionStrength,
  };
}
