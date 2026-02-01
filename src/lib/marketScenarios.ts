// Market Scenario Library - Pre-populated, reusable market scenarios
// These influence scoring and explanations in reports

export type DemandLevel = 'low' | 'medium' | 'high';
export type CompetitionLevel = 'low' | 'medium' | 'high';
export type PricingSensitivity = 'low' | 'medium' | 'high';
export type DOMBand = 'short' | 'average' | 'long';
export type NegotiationLeverage = 'buyer' | 'neutral' | 'seller';

export interface MarketScenario {
  id: string;
  name: string;
  summary: string; // Client-safe, 1-2 sentences
  isBuiltIn: boolean;
  // Scoring assumptions (internal only)
  assumptions: {
    demandLevel: DemandLevel;
    competitionLevel: CompetitionLevel;
    pricingSensitivity: PricingSensitivity;
    typicalDOMBand: DOMBand;
    negotiationLeverage: NegotiationLeverage;
  };
  created_at: string;
  updated_at: string;
}

// Built-in scenarios that ship with the app
export const BUILT_IN_SCENARIOS: MarketScenario[] = [
  {
    id: 'balanced-market',
    name: 'Balanced Market',
    summary: 'Supply and demand are relatively even. Homes sell within typical timeframes at or near asking price with standard negotiation.',
    isBuiltIn: true,
    assumptions: {
      demandLevel: 'medium',
      competitionLevel: 'medium',
      pricingSensitivity: 'medium',
      typicalDOMBand: 'average',
      negotiationLeverage: 'neutral',
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'hot-market-multiple-offers',
    name: 'Hot Market / Multiple Offers',
    summary: 'High buyer competition with frequent multiple offer situations. Homes often sell quickly above asking price with limited contingencies.',
    isBuiltIn: true,
    assumptions: {
      demandLevel: 'high',
      competitionLevel: 'high',
      pricingSensitivity: 'low',
      typicalDOMBand: 'short',
      negotiationLeverage: 'seller',
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'price-sensitive-market',
    name: 'Price Sensitive Market',
    summary: 'Buyers are cautious about value. Pricing accuracy is critical, and overpriced homes tend to sit longer or require reductions.',
    isBuiltIn: true,
    assumptions: {
      demandLevel: 'medium',
      competitionLevel: 'low',
      pricingSensitivity: 'high',
      typicalDOMBand: 'average',
      negotiationLeverage: 'buyer',
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'low-inventory',
    name: 'Low Inventory',
    summary: 'Limited available listings create urgency among buyers. Well-priced homes attract strong interest and may receive competitive offers.',
    isBuiltIn: true,
    assumptions: {
      demandLevel: 'high',
      competitionLevel: 'high',
      pricingSensitivity: 'medium',
      typicalDOMBand: 'short',
      negotiationLeverage: 'seller',
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'high-rate-environment',
    name: 'High Rate Environment',
    summary: 'Elevated interest rates reduce buyer purchasing power. Affordability concerns lead to more price sensitivity and longer decision cycles.',
    isBuiltIn: true,
    assumptions: {
      demandLevel: 'low',
      competitionLevel: 'low',
      pricingSensitivity: 'high',
      typicalDOMBand: 'long',
      negotiationLeverage: 'buyer',
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seasonal-slowdown',
    name: 'Seasonal Slowdown',
    summary: 'Reduced buyer activity during off-peak periods. Listings may take longer to sell, but serious buyers are more motivated.',
    isBuiltIn: true,
    assumptions: {
      demandLevel: 'low',
      competitionLevel: 'low',
      pricingSensitivity: 'medium',
      typicalDOMBand: 'long',
      negotiationLeverage: 'buyer',
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'sellers-market',
    name: "Seller's Market",
    summary: 'Demand significantly exceeds supply. Sellers have negotiating advantage with shorter time on market and favorable terms.',
    isBuiltIn: true,
    assumptions: {
      demandLevel: 'high',
      competitionLevel: 'high',
      pricingSensitivity: 'low',
      typicalDOMBand: 'short',
      negotiationLeverage: 'seller',
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'buyers-market',
    name: "Buyer's Market",
    summary: 'More inventory than demand gives buyers leverage. Expect longer days on market, more negotiation, and potential price adjustments.',
    isBuiltIn: true,
    assumptions: {
      demandLevel: 'low',
      competitionLevel: 'low',
      pricingSensitivity: 'high',
      typicalDOMBand: 'long',
      negotiationLeverage: 'buyer',
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];

const CUSTOM_SCENARIOS_KEY = 'reality_engine_custom_scenarios';

function safeParseArray<T>(data: string | null): T[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Get all scenarios (built-in + custom)
export function loadMarketScenarios(): MarketScenario[] {
  const customScenarios = safeParseArray<MarketScenario>(localStorage.getItem(CUSTOM_SCENARIOS_KEY));
  return [...BUILT_IN_SCENARIOS, ...customScenarios];
}

// Get a scenario by ID
export function getMarketScenarioById(id: string): MarketScenario | undefined {
  return loadMarketScenarios().find(s => s.id === id);
}

// Save a custom scenario
export function saveCustomScenario(scenario: Omit<MarketScenario, 'isBuiltIn' | 'created_at' | 'updated_at'>): void {
  const customScenarios = safeParseArray<MarketScenario>(localStorage.getItem(CUSTOM_SCENARIOS_KEY));
  const now = new Date().toISOString();
  const existingIndex = customScenarios.findIndex(s => s.id === scenario.id);
  
  const scenarioToSave: MarketScenario = {
    ...scenario,
    isBuiltIn: false,
    created_at: existingIndex >= 0 ? customScenarios[existingIndex].created_at : now,
    updated_at: now,
  };
  
  if (existingIndex >= 0) {
    customScenarios[existingIndex] = scenarioToSave;
  } else {
    customScenarios.push(scenarioToSave);
  }
  
  localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(customScenarios));
}

// Delete a custom scenario (cannot delete built-in)
export function deleteCustomScenario(id: string): boolean {
  const builtIn = BUILT_IN_SCENARIOS.find(s => s.id === id);
  if (builtIn) return false; // Cannot delete built-in
  
  const customScenarios = safeParseArray<MarketScenario>(localStorage.getItem(CUSTOM_SCENARIOS_KEY))
    .filter(s => s.id !== id);
  localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(customScenarios));
  return true;
}

// Get scoring modifier based on scenario (affects likelihood calculations)
export function getScenarioScoringModifier(scenario: MarketScenario): {
  buyerAdvantage: number; // Positive = helps buyers, negative = helps sellers
  domModifier: number; // Affects DOM expectations
  priceFlexibility: number; // How much pricing matters
} {
  const { assumptions } = scenario;
  
  let buyerAdvantage = 0;
  let domModifier = 0;
  let priceFlexibility = 0;
  
  // Demand level affects both sides
  if (assumptions.demandLevel === 'high') {
    buyerAdvantage -= 1; // Harder for buyers
    domModifier -= 1; // Faster sales
  } else if (assumptions.demandLevel === 'low') {
    buyerAdvantage += 1; // Easier for buyers
    domModifier += 1; // Slower sales
  }
  
  // Competition level
  if (assumptions.competitionLevel === 'high') {
    buyerAdvantage -= 1;
  } else if (assumptions.competitionLevel === 'low') {
    buyerAdvantage += 1;
  }
  
  // Pricing sensitivity
  if (assumptions.pricingSensitivity === 'high') {
    priceFlexibility -= 1; // Less room for error
  } else if (assumptions.pricingSensitivity === 'low') {
    priceFlexibility += 1; // More room
  }
  
  // Negotiation leverage
  if (assumptions.negotiationLeverage === 'buyer') {
    buyerAdvantage += 1;
  } else if (assumptions.negotiationLeverage === 'seller') {
    buyerAdvantage -= 1;
  }
  
  return { buyerAdvantage, domModifier, priceFlexibility };
}
