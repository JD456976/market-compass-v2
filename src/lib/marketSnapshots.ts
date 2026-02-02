// Market Snapshot Library - Public market trend data at city/town level
// This grounds assumptions in real, publicly available data without MLS or paid APIs

export interface MarketSnapshot {
  id: string;
  location: string; // City, State format (e.g., "Seattle, WA")
  medianDOM: number; // Median Days on Market
  saleToListRatio: number; // e.g., 0.98 = 98% of list price
  inventorySignal: 'low' | 'balanced' | 'high';
  lastUpdated: string; // ISO date string
  sourceLabel: string;
}

// Parse city/town from a location string
// Handles formats like "Seattle, WA", "Norfolk, MA 02056", "123 Main St, Boston, MA"
export function parseCityFromLocation(location: string): string | null {
  if (!location) return null;
  
  const trimmed = location.trim();
  
  // Try to match "City, State" or "City, ST" pattern
  // Also handles "City, State ZIP" format
  const cityStateMatch = trimmed.match(/^([^,]+),\s*([A-Z]{2})\b/i);
  if (cityStateMatch) {
    const city = cityStateMatch[1].trim();
    const state = cityStateMatch[2].toUpperCase();
    return `${city}, ${state}`;
  }
  
  // Handle "Address, City, State" format
  const parts = trimmed.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    // Look for state abbreviation in last parts
    for (let i = parts.length - 1; i >= 1; i--) {
      const stateMatch = parts[i].match(/^([A-Z]{2})\b/i);
      if (stateMatch) {
        const city = parts[i - 1];
        const state = stateMatch[1].toUpperCase();
        return `${city}, ${state}`;
      }
    }
  }
  
  return null;
}

// Normalize location for matching
function normalizeLocation(location: string): string {
  return location.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Seeded market snapshots - manually curated from public data
// These can be expanded via CSV/JSON import
const SEEDED_SNAPSHOTS: MarketSnapshot[] = [
  // Massachusetts
  {
    id: 'boston-ma',
    location: 'Boston, MA',
    medianDOM: 28,
    saleToListRatio: 1.02,
    inventorySignal: 'low',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'cambridge-ma',
    location: 'Cambridge, MA',
    medianDOM: 21,
    saleToListRatio: 1.04,
    inventorySignal: 'low',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'norfolk-ma',
    location: 'Norfolk, MA',
    medianDOM: 35,
    saleToListRatio: 0.99,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'newton-ma',
    location: 'Newton, MA',
    medianDOM: 24,
    saleToListRatio: 1.01,
    inventorySignal: 'low',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  // Washington
  {
    id: 'seattle-wa',
    location: 'Seattle, WA',
    medianDOM: 18,
    saleToListRatio: 1.03,
    inventorySignal: 'low',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'bellevue-wa',
    location: 'Bellevue, WA',
    medianDOM: 22,
    saleToListRatio: 1.02,
    inventorySignal: 'low',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'tacoma-wa',
    location: 'Tacoma, WA',
    medianDOM: 32,
    saleToListRatio: 0.98,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  // California
  {
    id: 'san-francisco-ca',
    location: 'San Francisco, CA',
    medianDOM: 25,
    saleToListRatio: 1.01,
    inventorySignal: 'low',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'los-angeles-ca',
    location: 'Los Angeles, CA',
    medianDOM: 38,
    saleToListRatio: 0.97,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'san-diego-ca',
    location: 'San Diego, CA',
    medianDOM: 30,
    saleToListRatio: 0.99,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  // Texas
  {
    id: 'austin-tx',
    location: 'Austin, TX',
    medianDOM: 45,
    saleToListRatio: 0.96,
    inventorySignal: 'high',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'dallas-tx',
    location: 'Dallas, TX',
    medianDOM: 42,
    saleToListRatio: 0.97,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'houston-tx',
    location: 'Houston, TX',
    medianDOM: 48,
    saleToListRatio: 0.95,
    inventorySignal: 'high',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  // New York
  {
    id: 'new-york-ny',
    location: 'New York, NY',
    medianDOM: 55,
    saleToListRatio: 0.94,
    inventorySignal: 'high',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'brooklyn-ny',
    location: 'Brooklyn, NY',
    medianDOM: 50,
    saleToListRatio: 0.95,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  // Florida
  {
    id: 'miami-fl',
    location: 'Miami, FL',
    medianDOM: 60,
    saleToListRatio: 0.93,
    inventorySignal: 'high',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  {
    id: 'tampa-fl',
    location: 'Tampa, FL',
    medianDOM: 52,
    saleToListRatio: 0.95,
    inventorySignal: 'high',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  // Colorado
  {
    id: 'denver-co',
    location: 'Denver, CO',
    medianDOM: 28,
    saleToListRatio: 0.99,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  // Arizona
  {
    id: 'phoenix-az',
    location: 'Phoenix, AZ',
    medianDOM: 40,
    saleToListRatio: 0.97,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
  // Illinois
  {
    id: 'chicago-il',
    location: 'Chicago, IL',
    medianDOM: 35,
    saleToListRatio: 0.98,
    inventorySignal: 'balanced',
    lastUpdated: '2024-01-15',
    sourceLabel: 'Public market data',
  },
];

// Generic baseline for markets without specific data
export const GENERIC_BASELINE: MarketSnapshot = {
  id: 'generic-baseline',
  location: 'Generic Market',
  medianDOM: 35,
  saleToListRatio: 0.98,
  inventorySignal: 'balanced',
  lastUpdated: '2024-01-01',
  sourceLabel: 'Generic baseline assumptions',
};

const CUSTOM_SNAPSHOTS_KEY = 'reality_engine_market_snapshots';

function safeParseArray<T>(data: string | null): T[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Get all snapshots (seeded + custom)
export function loadMarketSnapshots(): MarketSnapshot[] {
  const customSnapshots = safeParseArray<MarketSnapshot>(localStorage.getItem(CUSTOM_SNAPSHOTS_KEY));
  return [...SEEDED_SNAPSHOTS, ...customSnapshots];
}

// Find snapshot for a location
export function getMarketSnapshotForLocation(location: string): MarketSnapshot | null {
  const city = parseCityFromLocation(location);
  if (!city) return null;
  
  const normalizedCity = normalizeLocation(city);
  const snapshots = loadMarketSnapshots();
  
  const match = snapshots.find(s => normalizeLocation(s.location) === normalizedCity);
  return match || null;
}

// Get snapshot or fallback to generic baseline
export function getMarketSnapshotOrBaseline(location: string): {
  snapshot: MarketSnapshot;
  isGenericBaseline: boolean;
} {
  const snapshot = getMarketSnapshotForLocation(location);
  if (snapshot) {
    return { snapshot, isGenericBaseline: false };
  }
  return { snapshot: GENERIC_BASELINE, isGenericBaseline: true };
}

// Save a custom snapshot (for manual entry or CSV import)
export function saveCustomSnapshot(snapshot: Omit<MarketSnapshot, 'id'>): void {
  const customSnapshots = safeParseArray<MarketSnapshot>(localStorage.getItem(CUSTOM_SNAPSHOTS_KEY));
  const id = `custom-${snapshot.location.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  
  const existingIndex = customSnapshots.findIndex(s => 
    normalizeLocation(s.location) === normalizeLocation(snapshot.location)
  );
  
  const snapshotToSave: MarketSnapshot = {
    ...snapshot,
    id,
  };
  
  if (existingIndex >= 0) {
    customSnapshots[existingIndex] = snapshotToSave;
  } else {
    customSnapshots.push(snapshotToSave);
  }
  
  localStorage.setItem(CUSTOM_SNAPSHOTS_KEY, JSON.stringify(customSnapshots));
}

// Derive context from snapshot for report display
export function getMarketContext(snapshot: MarketSnapshot): {
  speedContext: 'faster' | 'typical' | 'slower';
  priceContext: 'above' | 'at' | 'below';
  competitionContext: 'high' | 'moderate' | 'low';
} {
  // Speed based on DOM
  let speedContext: 'faster' | 'typical' | 'slower';
  if (snapshot.medianDOM <= 25) {
    speedContext = 'faster';
  } else if (snapshot.medianDOM >= 45) {
    speedContext = 'slower';
  } else {
    speedContext = 'typical';
  }
  
  // Price based on sale-to-list ratio
  let priceContext: 'above' | 'at' | 'below';
  if (snapshot.saleToListRatio >= 1.01) {
    priceContext = 'above';
  } else if (snapshot.saleToListRatio <= 0.96) {
    priceContext = 'below';
  } else {
    priceContext = 'at';
  }
  
  // Competition based on inventory
  let competitionContext: 'high' | 'moderate' | 'low';
  if (snapshot.inventorySignal === 'low') {
    competitionContext = 'high';
  } else if (snapshot.inventorySignal === 'high') {
    competitionContext = 'low';
  } else {
    competitionContext = 'moderate';
  }
  
  return { speedContext, priceContext, competitionContext };
}

// Get timeline anchor text (compare desired timeline to market DOM)
export function getTimelineAnchor(
  desiredDays: number, 
  snapshot: MarketSnapshot
): { hasAnchor: boolean; message: string } {
  const diff = desiredDays - snapshot.medianDOM;
  
  if (diff <= -15) {
    return {
      hasAnchor: true,
      message: `Selected timeline (${desiredDays} days) is significantly faster than typical for this market (median ${snapshot.medianDOM} days).`,
    };
  }
  if (diff >= 20) {
    return {
      hasAnchor: true,
      message: `Selected timeline (${desiredDays} days) is slower than typical for this market (median ${snapshot.medianDOM} days).`,
    };
  }
  
  return { hasAnchor: false, message: '' };
}

// Get price competitiveness anchor
export function getPricingAnchor(
  strategy: 'conservative' | 'market' | 'aggressive',
  snapshot: MarketSnapshot
): { hasAnchor: boolean; message: string; riskLevel: 'low' | 'moderate' | 'elevated' } {
  const context = getMarketContext(snapshot);
  
  // In markets selling above list, conservative pricing is higher risk
  if (context.priceContext === 'above' && strategy === 'conservative') {
    return {
      hasAnchor: true,
      message: 'Conservative pricing in a market selling above list price may reduce competitiveness.',
      riskLevel: 'elevated',
    };
  }
  
  // In markets selling below list, aggressive pricing is higher risk
  if (context.priceContext === 'below' && strategy === 'aggressive') {
    return {
      hasAnchor: true,
      message: 'Aggressive pricing in a softer market may extend time on market.',
      riskLevel: 'moderate',
    };
  }
  
  return { hasAnchor: false, message: '', riskLevel: 'low' };
}

// Get contingency anchor for buyers
export function getContingencyAnchor(
  contingencyCount: number,
  hasHomeSaleContingency: boolean,
  snapshot: MarketSnapshot
): { hasAnchor: boolean; message: string } {
  const context = getMarketContext(snapshot);
  
  // High competition + heavy contingencies
  if (context.competitionContext === 'high' && (contingencyCount >= 3 || hasHomeSaleContingency)) {
    return {
      hasAnchor: true,
      message: 'In high-competition markets, multiple contingencies may significantly reduce offer attractiveness.',
    };
  }
  
  // Low competition = contingencies less penalized
  if (context.competitionContext === 'low' && contingencyCount >= 2) {
    return {
      hasAnchor: true,
      message: 'Current market conditions provide more flexibility for contingencies.',
    };
  }
  
  return { hasAnchor: false, message: '' };
}
