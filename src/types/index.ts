export type PropertyType = 'SFH' | 'Condo' | 'MFH';
export type SaleToList = 'Below' | 'Near' | 'Above';
export type TypicalDOM = 'Fast' | 'Normal' | 'Slow';
export type MultipleOffersFrequency = 'Rare' | 'Sometimes' | 'Common';
export type ContingencyTolerance = 'Low' | 'Medium' | 'High';
export type Condition = 'Dated' | 'Maintained' | 'Updated' | 'Renovated';
export type SessionType = 'Seller' | 'Buyer' | 'touring_brief';
export type DesiredTimeframe = '30' | '60' | '90+';
export type StrategyPreference = 'Maximize price' | 'Balanced' | 'Prioritize speed';
export type FinancingType = 'Cash' | 'Conventional' | 'FHA' | 'VA' | 'Other';
export type DownPaymentPercent = '<10' | '10-19' | '20+';
export type Contingency = 'Inspection' | 'Financing' | 'Appraisal' | 'Home sale' | 'None';
export type ClosingTimeline = '<21' | '21-30' | '31-45' | '45+';
export type BuyerPreference = 'Must win' | 'Balanced' | 'Price-protective';
export type LikelihoodBand = 'Low' | 'Moderate' | 'High';
export type ExtendedLikelihoodBand = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
export type MarketConditions = 'Hot' | 'Balanced' | 'Cool';
export type InvestmentType = 'Primary Residence' | 'Investment Property';

export interface MarketProfile {
  id: string;
  label: string;
  location: string;
  property_type: PropertyType;
  typical_sale_to_list: SaleToList;
  typical_dom: TypicalDOM;
  multiple_offers_frequency: MultipleOffersFrequency;
  contingency_tolerance: ContingencyTolerance;
  updated_at: string;
}

export interface SellerInputs {
  seller_selected_list_price: number;
  desired_timeframe: DesiredTimeframe;
  strategy_preference: StrategyPreference;
  notes?: string; // Legacy field - maps to client_notes
  agent_notes?: string;
  client_notes?: string;
  // Signal-Based Intelligence fields
  showing_traffic?: ShowingTrafficLevel;
  offer_deadline?: string; // ISO date or empty
  price_change_direction?: PriceChangeDirection;
  price_change_amount?: number;
}

export type ShowingTrafficLevel = 'Minimal' | 'Steady' | 'Heavy' | 'Unknown';
export type PriceChangeDirection = 'Reduced' | 'Increased' | 'None';

export interface BuyerInputs {
  offer_price: number;
  financing_type: FinancingType;
  down_payment_percent: DownPaymentPercent;
  contingencies: Contingency[];
  closing_timeline: ClosingTimeline;
  buyer_preference: BuyerPreference;
  notes?: string; // Legacy field - maps to client_notes
  agent_notes?: string;
  client_notes?: string;
  // New market-aware fields
  reference_price?: number;
  market_conditions?: MarketConditions;
  days_on_market?: number;
  investment_type?: InvestmentType;
  // Signal-Based Intelligence fields
  showing_traffic?: ShowingTrafficLevel;
  offer_deadline?: string; // ISO date or empty
  price_change_direction?: PriceChangeDirection;
  price_change_amount?: number;
}

export interface PropertyFactor {
  label: string;
  weight: number;
  explanation: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'field' | 'remarks';
}

export interface MarketHistoryEvent {
  mlsNumber: string;
  date: string;
  action: string; // 'Listed' | 'Price Changed' | 'Canceled' | 'Expired' | 'Sold' | 'Pending' | 'Withdrawn' | 'Status Changed'
  price: number | null;
  agent?: string;
  dom?: number;
  dto?: number;
}

export interface ListingHistory {
  events: MarketHistoryEvent[];
  cumulativeDom: number;
  priceChanges: number;
  wasRelisted: boolean;
  wasCanceled: boolean;
  totalPriceDrop: number; // from highest to current
  highestPrice: number;
  currentPrice: number;
}

export interface AddressFields {
  address_line?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface Session {
  id: string;
  session_type: SessionType;
  client_name: string;
  location: string;
  property_type: PropertyType;
  condition: Condition;
  selected_market_profile_id?: string; // Legacy - now also supports market scenario IDs
  market_scenario_id?: string; // Reference to market scenario
  market_scenario_overrides?: {
    demandLevel?: 'low' | 'medium' | 'high';
    competitionLevel?: 'low' | 'medium' | 'high';
    pricingSensitivity?: 'low' | 'medium' | 'high';
  };
  // Market snapshot reference (auto-attached based on location)
  market_snapshot_id?: string;
  // Address fields
  address_fields?: AddressFields;
  // Property intelligence factors from document extraction
  property_factors?: PropertyFactor[];
  // Listing market history (price changes, cancellations, re-listings)
  listing_history?: ListingHistory;
  // Privacy toggle (default true = hide address from client)
  client_privacy?: boolean;
  seller_inputs?: SellerInputs;
  buyer_inputs?: BuyerInputs;
  // Deliverable tracking
  share_link_created?: boolean;
  pdf_exported?: boolean;
  // Archive
  archived?: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerReportData {
  session: Session;
  marketProfile?: MarketProfile;
  likelihood30: LikelihoodBand;
  likelihood60: LikelihoodBand;
  likelihood90: LikelihoodBand;
  snapshotTimestamp: string;
  propertyFactorDescriptions?: string[];
}

export interface ScoringDebug {
  referencePrice: number;
  offerPrice: number;
  priceRatio: number;
  marketConditions: MarketConditions;
  daysOnMarket: number | null;
  investmentType: InvestmentType;
  baseTiers: {
    acceptance: ExtendedLikelihoodBand;
    overpayRisk: ExtendedLikelihoodBand;
    losingHomeRisk: ExtendedLikelihoodBand;
  };
  modifiers: string[];
  finalTiers: {
    acceptance: ExtendedLikelihoodBand;
    overpayRisk: ExtendedLikelihoodBand;
    losingHomeRisk: ExtendedLikelihoodBand;
  };
  confidence: 'High' | 'Limited';
  warnings: string[];
}

export interface BuyerReportData {
  session: Session;
  marketProfile?: MarketProfile;
  acceptanceLikelihood: ExtendedLikelihoodBand;
  riskOfLosingHome: ExtendedLikelihoodBand;
  riskOfOverpaying: ExtendedLikelihoodBand;
  snapshotTimestamp: string;
  confidence: 'High' | 'Limited';
  debug?: ScoringDebug;
}
