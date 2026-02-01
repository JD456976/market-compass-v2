export type PropertyType = 'SFH' | 'Condo' | 'MFH';
export type SaleToList = 'Below' | 'Near' | 'Above';
export type TypicalDOM = 'Fast' | 'Normal' | 'Slow';
export type MultipleOffersFrequency = 'Rare' | 'Sometimes' | 'Common';
export type ContingencyTolerance = 'Low' | 'Medium' | 'High';
export type Condition = 'Dated' | 'Maintained' | 'Updated' | 'Renovated';
export type SessionType = 'Seller' | 'Buyer';
export type DesiredTimeframe = '30' | '60' | '90+';
export type StrategyPreference = 'Maximize price' | 'Balanced' | 'Prioritize speed';
export type FinancingType = 'Cash' | 'Conventional' | 'FHA' | 'VA' | 'Other';
export type DownPaymentPercent = '<10' | '10-19' | '20+';
export type Contingency = 'Inspection' | 'Financing' | 'Appraisal' | 'Home sale' | 'None';
export type ClosingTimeline = '<21' | '21-30' | '31-45' | '45+';
export type BuyerPreference = 'Must win' | 'Balanced' | 'Price-protective';
export type LikelihoodBand = 'Low' | 'Moderate' | 'High';

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
}

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
}

export interface Session {
  id: string;
  session_type: SessionType;
  client_name: string;
  location: string;
  property_type: PropertyType;
  condition: Condition;
  selected_market_profile_id?: string; // Legacy - now also supports market scenario IDs
  market_scenario_id?: string; // New: reference to market scenario
  market_scenario_overrides?: {
    demandLevel?: 'low' | 'medium' | 'high';
    competitionLevel?: 'low' | 'medium' | 'high';
    pricingSensitivity?: 'low' | 'medium' | 'high';
  };
  seller_inputs?: SellerInputs;
  buyer_inputs?: BuyerInputs;
  // Deliverable tracking
  share_link_created?: boolean;
  pdf_exported?: boolean;
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
}

export interface BuyerReportData {
  session: Session;
  marketProfile?: MarketProfile;
  acceptanceLikelihood: LikelihoodBand;
  riskOfLosingHome: LikelihoodBand;
  riskOfOverpaying: LikelihoodBand;
  snapshotTimestamp: string;
}
