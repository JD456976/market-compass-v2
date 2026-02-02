/**
 * Client-friendly language translations
 * Converts internal/agent terminology to softer client-facing language
 */

// Report section titles
export const reportTitles = {
  agent: {
    riskTradeoff: 'Risk Tradeoff Analysis',
    riskOfLosingHome: 'Risk of Losing Home',
    riskOfOverpaying: 'Risk of Overpaying',
    acceptanceLikelihood: 'Offer Acceptance Likelihood',
    saleLikelihood: 'Sale Likelihood Analysis',
    whatThisMeans: 'What This Means',
    tradeoffSummary: 'Tradeoff Summary',
    offerOverview: 'Offer Overview',
    propertyOverview: 'Property Overview',
    offerDetails: 'Offer Details',
    listingStrategy: 'Listing Strategy',
  },
  client: {
    riskTradeoff: 'Key Tradeoffs',
    riskOfLosingHome: 'Competitiveness Factor',
    riskOfOverpaying: 'Value Protection Factor',
    acceptanceLikelihood: 'Offer Strength Snapshot',
    saleLikelihood: 'Timeline Snapshot',
    whatThisMeans: 'Key Insights',
    tradeoffSummary: 'Summary',
    offerOverview: 'Offer Overview',
    propertyOverview: 'Property Overview',
    offerDetails: 'Offer Details',
    listingStrategy: 'Listing Strategy',
  },
};

// Risk descriptions (buyer)
export const buyerRiskDescriptions = {
  agent: {
    losingHomeHigh: 'Lower aggressive offers increase this risk',
    losingHomeLow: 'Strong offer terms reduce this risk',
    overpayingHigh: 'Higher aggressive offers increase this risk',
    overpayingLow: 'Conservative pricing protects value',
  },
  client: {
    losingHomeHigh: 'More competitive offers tend to receive stronger consideration',
    losingHomeLow: 'Your offer terms are well-positioned for consideration',
    overpayingHigh: 'Aggressive pricing may exceed market value',
    overpayingLow: 'Your pricing approach helps protect value',
  },
};

// What This Means content (buyer) - probabilistic language
export const buyerWhatThisMeans = {
  agent: {
    high: 'Your offer terms are well-aligned with seller expectations. Strong financing and favorable terms tend to make offers more competitive in the current market.',
    moderate: 'Your offer is likely to face competition from other buyers. Sellers often weigh multiple factors including price, contingencies, and closing timeline when evaluating offers.',
    low: 'At the current offer terms, acceptance tends to be less certain. This often occurs when contingencies or financing create perceived risk for the seller.',
  },
  client: {
    high: 'Your offer is well-positioned for serious consideration. The combination of your terms and timing aligns well with what sellers typically look for.',
    moderate: 'Your offer has solid fundamentals. In competitive situations, sellers tend to consider many factors including timing, terms, and overall fit.',
    low: 'There may be opportunities to strengthen your offer. Small adjustments to terms or timing can sometimes make a meaningful difference.',
  },
};

// What This Means content (seller) - probabilistic language
export const sellerWhatThisMeans = {
  agent: {
    high: 'Your listing is well-positioned for a relatively quick sale. The combination of your list price and market conditions tends to attract buyer interest early.',
    moderate: 'Initial buyer activity may take time to build. Properties in this range often see increased interest as market exposure grows over 60–90 days.',
    low: 'At the current list price, early buyer activity tends to be more limited. This often occurs when pricing is positioned at the higher end of comparable properties.',
  },
  client: {
    high: 'Market conditions appear favorable for your listing. Properties with similar positioning tend to generate strong interest from qualified buyers.',
    moderate: 'Your listing is positioned to attract buyer interest over time. Market exposure typically builds momentum as more buyers become aware of the opportunity.',
    low: 'Your pricing strategy prioritizes value. This approach may take more time to find the right buyer, which can work well for sellers with flexibility.',
  },
};

// Tradeoff descriptions - probabilistic language
export const tradeoffDescriptions = {
  agent: {
    buyerMain: 'More aggressive terms tend to increase acceptance likelihood but may also raise the risk of overpaying, while conservative offers help protect value but can reduce competitiveness.',
    sellerPriceVsTime: 'Prioritizing a faster sale often involves accepting a lower final price, while holding for maximum price may extend time on market.',
  },
  client: {
    buyerMain: 'Finding the right balance between competitiveness and value protection is key. Every market situation has its own dynamics to consider.',
    sellerPriceVsTime: 'There are natural tradeoffs between timing and final sale price. Your priorities help guide the best approach for your situation.',
  },
};

// Suggestion items (buyer)
export const buyerSuggestions = {
  agent: {
    contingencies: 'Reducing contingencies often makes offers more attractive to sellers',
    timeline: 'A shorter closing timeline may signal stronger buyer readiness',
    financing: 'Strengthening financing terms or increasing down payment tends to reduce seller concerns',
    price: 'Adjusting your offer price may improve competitive positioning',
  },
  client: {
    contingencies: 'Streamlined terms can help your offer stand out in competitive situations',
    timeline: 'Flexible timing can be appealing when sellers are evaluating multiple options',
    financing: 'Strong financing gives sellers confidence in a smooth transaction',
    price: 'Competitive pricing is one factor that can strengthen your overall position',
  },
};

// Suggestion items (seller)
export const sellerSuggestions = {
  agent: {
    strategy: 'Consider a balanced strategy that may attract more buyers sooner',
    price: 'A more competitive list price often generates faster buyer interest',
    timeframe: 'Extending your desired timeframe may align better with current market conditions',
    pricing: 'Adjusting your pricing strategy may help optimize your timeline',
  },
  client: {
    strategy: 'A balanced approach can help attract a wider range of interested buyers',
    price: 'Strategic pricing helps position your property competitively in the market',
    timeframe: 'Flexibility with timing can help match your property with the right buyer',
    pricing: 'Pricing adjustments are one tool to help achieve your goals',
  },
};

// Get the appropriate text based on mode
export function getText<T extends Record<string, string>>(
  textMap: { agent: T; client: T },
  key: keyof T,
  isClientMode: boolean
): string {
  const mode = isClientMode ? 'client' : 'agent';
  return textMap[mode][key];
}

// Get title based on mode
export function getTitle(
  key: keyof typeof reportTitles.agent,
  isClientMode: boolean
): string {
  return isClientMode ? reportTitles.client[key] : reportTitles.agent[key];
}
