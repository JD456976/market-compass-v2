import { Session, SellerReportData, BuyerReportData, LikelihoodBand, BuyerInputs, SellerInputs } from '@/types';

export interface ComparisonOption {
  session: Session;
  report: SellerReportData | BuyerReportData;
  label: string; // e.g., "Option A: Faster Timeline"
  labelDescription?: string; // Helper description for certain labels
  characteristics: {
    timeline: 'Faster' | 'More flexible' | 'Standard';
    certainty: 'Higher' | 'Moderate' | 'Lower';
    competitivePosture: 'Aggressive' | 'Balanced' | 'Conservative';
    primaryRisk: string;
  };
  validationErrors?: string[]; // Missing required fields
}

export interface ComparisonTableRow {
  category: string;
  icon: 'clock' | 'shield' | 'scale' | 'target' | 'trending';
  optionA: string;
  optionB: string;
  isDifferent: boolean;
}

// Generate a client-friendly label for an option based on its strategy
export function generateOptionLabel(session: Session, optionLetter: 'A' | 'B'): string {
  if (session.session_type === 'Seller' && session.seller_inputs) {
    const { strategy_preference, desired_timeframe } = session.seller_inputs;
    
    if (strategy_preference === 'Prioritize speed') {
      return `Option ${optionLetter}: Faster Timeline`;
    }
    if (strategy_preference === 'Maximize price') {
      return `Option ${optionLetter}: Price Focused`;
    }
    if (desired_timeframe === '30') {
      return `Option ${optionLetter}: Quick Close`;
    }
    if (desired_timeframe === '90+') {
      return `Option ${optionLetter}: More Flexibility`;
    }
    return `Option ${optionLetter}: Balanced Approach`;
  }
  
  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    const { buyer_preference, contingencies } = session.buyer_inputs;
    
    if (buyer_preference === 'Must win') {
      return `Option ${optionLetter}: More Competitive`;
    }
    if (buyer_preference === 'Price-protective') {
      return `Option ${optionLetter}: More Conservative`;
    }
    if (contingencies.length === 0 || contingencies.includes('None')) {
      return `Option ${optionLetter}: Streamlined Terms`;
    }
    if (contingencies.length >= 3) {
      return `Option ${optionLetter}: Conservative Offer`;
    }
    return `Option ${optionLetter}: Balanced Offer`;
  }
  
  return `Option ${optionLetter}`;
}

// Helper description for conservative offer
export const CONSERVATIVE_OFFER_DESCRIPTION = "This option prioritizes buyer safeguards through contingencies, which can reduce risk but may lower competitiveness.";

// Analyze characteristics from session and report data
function analyzeCharacteristics(session: Session, report: SellerReportData | BuyerReportData): ComparisonOption['characteristics'] {
  if (session.session_type === 'Seller' && session.seller_inputs) {
    const { strategy_preference, desired_timeframe } = session.seller_inputs;
    const sellerReport = report as SellerReportData;
    
    let timeline: ComparisonOption['characteristics']['timeline'] = 'Standard';
    if (desired_timeframe === '30' || strategy_preference === 'Prioritize speed') {
      timeline = 'Faster';
    } else if (desired_timeframe === '90+') {
      timeline = 'More flexible';
    }
    
    let certainty: ComparisonOption['characteristics']['certainty'] = 'Moderate';
    if (sellerReport.likelihood30 === 'High' || sellerReport.likelihood60 === 'High') {
      certainty = 'Higher';
    } else if (sellerReport.likelihood60 === 'Low') {
      certainty = 'Lower';
    }
    
    let competitivePosture: ComparisonOption['characteristics']['competitivePosture'] = 'Balanced';
    if (strategy_preference === 'Prioritize speed') {
      competitivePosture = 'Aggressive';
    } else if (strategy_preference === 'Maximize price') {
      competitivePosture = 'Conservative';
    }
    
    let primaryRisk = 'Extended timeline';
    if (strategy_preference === 'Prioritize speed') {
      primaryRisk = 'Leaving value on table';
    } else if (strategy_preference === 'Maximize price') {
      primaryRisk = 'Extended time on market';
    }
    
    return { timeline, certainty, competitivePosture, primaryRisk };
  }
  
  // Buyer
  if (session.buyer_inputs) {
    const { buyer_preference, contingencies, closing_timeline } = session.buyer_inputs;
    const buyerReport = report as BuyerReportData;
    
    let timeline: ComparisonOption['characteristics']['timeline'] = 'Standard';
    if (closing_timeline === '<21' || buyer_preference === 'Must win') {
      timeline = 'Faster';
    } else if (closing_timeline === '45+') {
      timeline = 'More flexible';
    }
    
    let certainty: ComparisonOption['characteristics']['certainty'] = 'Moderate';
    if (buyerReport.acceptanceLikelihood === 'High') {
      certainty = 'Higher';
    } else if (buyerReport.acceptanceLikelihood === 'Low') {
      certainty = 'Lower';
    }
    
    let competitivePosture: ComparisonOption['characteristics']['competitivePosture'] = 'Balanced';
    if (buyer_preference === 'Must win') {
      competitivePosture = 'Aggressive';
    } else if (buyer_preference === 'Price-protective') {
      competitivePosture = 'Conservative';
    }
    
    let primaryRisk = 'Competitive disadvantage';
    if (buyerReport.riskOfOverpaying === 'High') {
      primaryRisk = 'Overpaying';
    } else if (buyerReport.riskOfLosingHome === 'High') {
      primaryRisk = 'Losing momentum';
    }
    
    return { timeline, certainty, competitivePosture, primaryRisk };
  }
  
  return {
    timeline: 'Standard',
    certainty: 'Moderate',
    competitivePosture: 'Balanced',
    primaryRisk: 'Market uncertainty',
  };
}

// Validate session has required fields for comparison
export function validateSessionForComparison(session: Session): string[] {
  const errors: string[] = [];
  
  if (!session.client_name?.trim()) errors.push('Client name');
  if (!session.location?.trim()) errors.push('Location');
  
  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    const inputs = session.buyer_inputs;
    if (!inputs.offer_price || inputs.offer_price <= 0) errors.push('Offer price');
    if (!inputs.financing_type) errors.push('Financing type');
    if (inputs.financing_type !== 'Cash' && !inputs.down_payment_percent) errors.push('Down payment');
    if (!inputs.contingencies || inputs.contingencies.length === 0) errors.push('Contingencies');
    if (!inputs.closing_timeline) errors.push('Closing timeline');
  }
  
  if (session.session_type === 'Seller' && session.seller_inputs) {
    const inputs = session.seller_inputs;
    if (!inputs.seller_selected_list_price || inputs.seller_selected_list_price <= 0) errors.push('List price');
  }
  
  return errors;
}

// Get description for option label (for conservative offer)
function getOptionLabelDescription(session: Session): string | undefined {
  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    const { contingencies } = session.buyer_inputs;
    if (contingencies.length >= 3) {
      return CONSERVATIVE_OFFER_DESCRIPTION;
    }
  }
  return undefined;
}

// Build comparison options from sessions and reports
export function buildComparisonOptions(
  sessionA: Session,
  sessionB: Session,
  reportA: SellerReportData | BuyerReportData,
  reportB: SellerReportData | BuyerReportData
): { optionA: ComparisonOption; optionB: ComparisonOption } {
  return {
    optionA: {
      session: sessionA,
      report: reportA,
      label: generateOptionLabel(sessionA, 'A'),
      labelDescription: getOptionLabelDescription(sessionA),
      characteristics: analyzeCharacteristics(sessionA, reportA),
      validationErrors: validateSessionForComparison(sessionA),
    },
    optionB: {
      session: sessionB,
      report: reportB,
      label: generateOptionLabel(sessionB, 'B'),
      labelDescription: getOptionLabelDescription(sessionB),
      characteristics: analyzeCharacteristics(sessionB, reportB),
      validationErrors: validateSessionForComparison(sessionB),
    },
  };
}

// Build comparison table rows
export function buildComparisonTable(
  optionA: ComparisonOption,
  optionB: ComparisonOption
): ComparisonTableRow[] {
  const rows: ComparisonTableRow[] = [
    {
      category: 'Timeline expectation',
      icon: 'clock',
      optionA: optionA.characteristics.timeline,
      optionB: optionB.characteristics.timeline,
      isDifferent: optionA.characteristics.timeline !== optionB.characteristics.timeline,
    },
    {
      category: 'Certainty',
      icon: 'shield',
      optionA: optionA.characteristics.certainty,
      optionB: optionB.characteristics.certainty,
      isDifferent: optionA.characteristics.certainty !== optionB.characteristics.certainty,
    },
    {
      category: 'Competitive posture',
      icon: 'target',
      optionA: optionA.characteristics.competitivePosture,
      optionB: optionB.characteristics.competitivePosture,
      isDifferent: optionA.characteristics.competitivePosture !== optionB.characteristics.competitivePosture,
    },
    {
      category: 'Primary risk',
      icon: 'trending',
      optionA: optionA.characteristics.primaryRisk,
      optionB: optionB.characteristics.primaryRisk,
      isDifferent: optionA.characteristics.primaryRisk !== optionB.characteristics.primaryRisk,
    },
  ];
  
  return rows;
}

// Generate tradeoff narrative
export function generateTradeoffNarrative(
  optionA: ComparisonOption,
  optionB: ComparisonOption
): string {
  const aIsAggressive = optionA.characteristics.competitivePosture === 'Aggressive';
  const bIsAggressive = optionB.characteristics.competitivePosture === 'Aggressive';
  const aIsFaster = optionA.characteristics.timeline === 'Faster';
  const bIsFaster = optionB.characteristics.timeline === 'Faster';
  
  let narrative = '';
  
  if (aIsAggressive && !bIsAggressive) {
    narrative = `${optionA.label.split(':')[0]} emphasizes competitiveness and speed, which may improve responsiveness but can increase price pressure. ${optionB.label.split(':')[0]} prioritizes balance and flexibility, which may preserve value but can extend timelines.`;
  } else if (bIsAggressive && !aIsAggressive) {
    narrative = `${optionB.label.split(':')[0]} emphasizes competitiveness and speed, which may improve responsiveness but can increase price pressure. ${optionA.label.split(':')[0]} prioritizes balance and flexibility, which may preserve value but can extend timelines.`;
  } else if (aIsFaster && !bIsFaster) {
    narrative = `${optionA.label.split(':')[0]} focuses on a faster timeline, which often works well in active markets but may require trade-offs. ${optionB.label.split(':')[0]} allows for more flexibility, which tends to offer more options but may take longer.`;
  } else if (bIsFaster && !aIsFaster) {
    narrative = `${optionB.label.split(':')[0]} focuses on a faster timeline, which often works well in active markets but may require trade-offs. ${optionA.label.split(':')[0]} allows for more flexibility, which tends to offer more options but may take longer.`;
  } else {
    narrative = `Both options represent different approaches to the same goal. ${optionA.label.split(':')[0]} and ${optionB.label.split(':')[0]} each have trade-offs that may suit different priorities and comfort levels.`;
  }
  
  return narrative;
}

// Generate "who each option fits" content
export function generateFitGuidance(option: ComparisonOption): string[] {
  const { characteristics } = option;
  const fits: string[] = [];
  
  if (characteristics.timeline === 'Faster') {
    fits.push('Value timing and certainty');
    fits.push('Prefer fewer unknowns');
  } else if (characteristics.timeline === 'More flexible') {
    fits.push('Value flexibility in timing');
    fits.push('Are comfortable with a longer process');
  }
  
  if (characteristics.competitivePosture === 'Aggressive') {
    fits.push('Prioritize winning over price');
  } else if (characteristics.competitivePosture === 'Conservative') {
    fits.push('Value price discipline');
    fits.push('Are comfortable with potential trade-offs');
  }
  
  if (characteristics.certainty === 'Higher') {
    fits.push('Prefer more predictable outcomes');
  }
  
  // Return at most 3 unique fits
  return [...new Set(fits)].slice(0, 3);
}

// Get client notes from session (excluding agent notes)
export function getClientNotes(session: Session): string | undefined {
  if (session.session_type === 'Seller' && session.seller_inputs) {
    return session.seller_inputs.client_notes || session.seller_inputs.notes;
  }
  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    return session.buyer_inputs.client_notes || session.buyer_inputs.notes;
  }
  return undefined;
}
