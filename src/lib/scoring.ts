import { 
  MarketProfile, 
  Session, 
  LikelihoodBand,
  SellerReportData,
  BuyerReportData 
} from '@/types';

function getMarketModifiers(profile?: MarketProfile): number {
  if (!profile) return 0;
  
  let score = 0;
  
  // typical_sale_to_list: Below(-1), Near(0), Above(+1)
  if (profile.typical_sale_to_list === 'Below') score -= 1;
  else if (profile.typical_sale_to_list === 'Above') score += 1;
  
  // typical_dom: Fast(+1), Normal(0), Slow(-1)
  if (profile.typical_dom === 'Fast') score += 1;
  else if (profile.typical_dom === 'Slow') score -= 1;
  
  // multiple_offers_frequency: Rare(-1), Sometimes(0), Common(+1)
  if (profile.multiple_offers_frequency === 'Rare') score -= 1;
  else if (profile.multiple_offers_frequency === 'Common') score += 1;
  
  // contingency_tolerance: Low(-1), Medium(0), High(+1)
  if (profile.contingency_tolerance === 'Low') score -= 1;
  else if (profile.contingency_tolerance === 'High') score += 1;
  
  return score;
}

function getConditionModifier(condition: Session['condition']): number {
  // Condition: Dated(-1), Maintained(0), Updated(+1), Renovated(+1)
  switch (condition) {
    case 'Dated': return -1;
    case 'Maintained': return 0;
    case 'Updated': return 1;
    case 'Renovated': return 1;
    default: return 0;
  }
}

function scoreToBand(score: number): LikelihoodBand {
  if (score <= 0) return 'Low';
  if (score >= 1 && score <= 3) return 'Moderate';
  return 'High';
}

export function calculateSellerReport(
  session: Session,
  marketProfile?: MarketProfile
): SellerReportData {
  const baseScore = getMarketModifiers(marketProfile) + getConditionModifier(session.condition);
  
  return {
    session,
    marketProfile,
    likelihood30: scoreToBand(baseScore),
    likelihood60: scoreToBand(baseScore + 1),
    likelihood90: scoreToBand(baseScore + 2),
    snapshotTimestamp: new Date().toISOString(),
  };
}

export function calculateBuyerReport(
  session: Session,
  marketProfile?: MarketProfile
): BuyerReportData {
  const inputs = session.buyer_inputs;
  if (!inputs) {
    throw new Error('Buyer inputs required');
  }
  
  let score = getMarketModifiers(marketProfile) + getConditionModifier(session.condition);
  
  const isCash = inputs.financing_type === 'Cash';
  const hasMinimalContingencies = inputs.contingencies.includes('None') || 
    inputs.contingencies.length === 0 ||
    (inputs.contingencies.length === 1 && inputs.contingencies[0] === 'Inspection');
  const hasFastClose = inputs.closing_timeline === '<21' || inputs.closing_timeline === '21-30';
  
  // financing: Cash(+3), Conventional(+1), FHA/VA(0)
  // Cash gets higher bonus to help reach High likelihood
  if (isCash) {
    score += 3;
  } else if (inputs.financing_type === 'Conventional') {
    score += 1;
  }
  
  // down_payment: Only applies if NOT cash
  // 20+(+1), 10–19(0), <10(-1)
  if (!isCash) {
    if (inputs.down_payment_percent === '20+') score += 1;
    else if (inputs.down_payment_percent === '<10') score -= 1;
  }
  
  // contingencies: None(+2), Inspection only(+1), Financing(0), Appraisal(-1), Home sale(-2)
  // Reduced penalty when cash or fast close is present
  if (inputs.contingencies.includes('None') || inputs.contingencies.length === 0) {
    score += 2;
  } else if (inputs.contingencies.length === 1 && inputs.contingencies[0] === 'Inspection') {
    score += 1;
  } else if (inputs.contingencies.includes('Home sale')) {
    // Reduce penalty if cash or fast close offsets
    score -= (isCash || hasFastClose) ? 1 : 2;
  } else if (inputs.contingencies.includes('Appraisal')) {
    score -= 1;
  }
  
  // closing: <21(+2), 21–30(+1), 31–45(0), 45+(-1)
  // Faster close gets higher bonus
  if (inputs.closing_timeline === '<21') {
    score += 2;
  } else if (inputs.closing_timeline === '21-30') {
    score += 1;
  } else if (inputs.closing_timeline === '45+') {
    score -= 1;
  }
  
  // Calculate acceptance likelihood with expanded thresholds
  // Low: ≤0, Moderate: 1-4, High: ≥5
  let acceptanceLikelihood: LikelihoodBand;
  if (score <= 0) {
    acceptanceLikelihood = 'Low';
  } else if (score >= 5) {
    acceptanceLikelihood = 'High';
  } else {
    acceptanceLikelihood = 'Moderate';
  }
  
  // Calculate risk bands based on buyer preference AND offer strength
  let riskOfLosingHome: LikelihoodBand;
  let riskOfOverpaying: LikelihoodBand;
  
  // Risk relationship based on preference, adjusted by offer strength
  if (inputs.buyer_preference === 'Must win') {
    riskOfLosingHome = 'Low';
    // High acceptance + must win = higher overpaying risk
    riskOfOverpaying = acceptanceLikelihood === 'High' ? 'High' : 'Moderate';
  } else if (inputs.buyer_preference === 'Price-protective') {
    // Low acceptance + price-protective = higher losing risk
    riskOfLosingHome = acceptanceLikelihood === 'Low' ? 'High' : 'Moderate';
    riskOfOverpaying = 'Low';
  } else {
    // Balanced: risks depend on offer strength
    if (acceptanceLikelihood === 'High') {
      riskOfLosingHome = 'Low';
      riskOfOverpaying = 'Moderate';
    } else if (acceptanceLikelihood === 'Low') {
      riskOfLosingHome = 'Moderate';
      riskOfOverpaying = 'Low';
    } else {
      riskOfLosingHome = 'Moderate';
      riskOfOverpaying = 'Moderate';
    }
  }
  
  return {
    session,
    marketProfile,
    acceptanceLikelihood,
    riskOfLosingHome,
    riskOfOverpaying,
    snapshotTimestamp: new Date().toISOString(),
  };
}
