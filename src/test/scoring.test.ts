import { describe, it, expect } from 'vitest';
import { calculateBuyerReport } from '@/lib/scoring';
import { Session } from '@/types';

function makeSession(overrides: Partial<Session['buyer_inputs']> & { offer_price: number }): Session {
  return {
    id: 'test',
    session_type: 'Buyer',
    client_name: 'Test',
    location: 'Boston, MA',
    property_type: 'SFH',
    condition: 'Maintained',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    buyer_inputs: {
      offer_price: overrides.offer_price,
      financing_type: overrides.financing_type || 'Conventional',
      down_payment_percent: overrides.down_payment_percent || '20+',
      contingencies: overrides.contingencies || ['Inspection'],
      closing_timeline: overrides.closing_timeline || '21-30',
      buyer_preference: overrides.buyer_preference || 'Balanced',
      reference_price: overrides.reference_price,
      market_conditions: overrides.market_conditions,
      days_on_market: overrides.days_on_market,
      investment_type: overrides.investment_type,
    },
  };
}

describe('Market-Aware Buyer Scoring', () => {
  it('Test 1: Extreme Overbid ($10M on $900K) → Very High acceptance, Very High overpay', () => {
    const session = makeSession({
      offer_price: 10_000_000,
      reference_price: 900_000,
      market_conditions: 'Balanced',
      contingencies: [],
    });
    const result = calculateBuyerReport(session);
    expect(result.acceptanceLikelihood).toBe('Very High');
    expect(result.riskOfOverpaying).toBe('Very High');
    expect(['Very Low', 'Low']).toContain(result.riskOfLosingHome);
  });

  it('Test 2: Low Offer Cool Market ($700K on $900K) → Very Low acceptance', () => {
    const session = makeSession({
      offer_price: 700_000,
      reference_price: 900_000,
      market_conditions: 'Cool',
    });
    const result = calculateBuyerReport(session);
    expect(result.acceptanceLikelihood).toBe('Very Low');
    expect(result.riskOfOverpaying).toBe('Very Low');
  });

  it('Test 3: Competitive Offer Hot Market New Listing ($950K on $900K, 3 DOM)', () => {
    const session = makeSession({
      offer_price: 950_000,
      reference_price: 900_000,
      market_conditions: 'Hot',
      days_on_market: 3,
      contingencies: [],
    });
    const result = calculateBuyerReport(session);
    // Base High for hot+1.05x, DOM -1 → should drop
    expect(['Moderate', 'High']).toContain(result.acceptanceLikelihood);
  });

  it('Test 4: Cash at market rate 90+ DOM ($900K on $900K) → Very High acceptance', () => {
    const session = makeSession({
      offer_price: 900_000,
      reference_price: 900_000,
      market_conditions: 'Balanced',
      days_on_market: 95,
      financing_type: 'Cash',
      contingencies: [],
    });
    const result = calculateBuyerReport(session);
    expect(result.acceptanceLikelihood).toBe('Very High');
    expect(result.riskOfLosingHome).toBe('Very Low');
  });

  it('Cash financing excludes down payment from scoring', () => {
    const session = makeSession({
      offer_price: 900_000,
      reference_price: 900_000,
      financing_type: 'Cash',
      down_payment_percent: '<10',
      contingencies: [],
    });
    const result = calculateBuyerReport(session);
    expect(result.confidence).toBe('High');
  });

  it('No reference price → Limited confidence', () => {
    const session = makeSession({ offer_price: 500_000 });
    const result = calculateBuyerReport(session);
    expect(result.confidence).toBe('Limited');
    expect(result.debug?.warnings).toContain('reference_price unavailable, using offer_price as fallback');
  });

  it('Extreme price ratio caps enforce correctly', () => {
    const session = makeSession({
      offer_price: 2_000_000,
      reference_price: 900_000,
      contingencies: ['Inspection', 'Financing', 'Appraisal', 'Home sale'],
      closing_timeline: '45+',
    });
    const result = calculateBuyerReport(session);
    expect(['High', 'Very High']).toContain(result.acceptanceLikelihood);
  });
});
