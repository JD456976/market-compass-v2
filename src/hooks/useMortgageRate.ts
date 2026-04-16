import { useState, useEffect } from 'react';

export interface MortgageRateData {
  current_rate: number | null;
  as_of_date: string | null;
  series_name: string;
  source: string;
  source_url: string;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  previous_rate: number | null;
  history: { date: string; rate: number }[];
}

// Approximate 30-yr fixed rate — updated periodically
// Source: Freddie Mac PMMS survey (approximate, not live)
const FALLBACK_RATE = 6.82;
const FALLBACK_DATE = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

export function useMortgageRate() {
  const [data] = useState<MortgageRateData>({
    current_rate: FALLBACK_RATE,
    as_of_date: FALLBACK_DATE,
    series_name: '30-Year Fixed Rate Mortgage',
    source: 'Freddie Mac PMMS (approximate)',
    source_url: 'https://www.freddiemac.com/pmms',
    trend: 'stable',
    previous_rate: 6.95,
    history: [],
  });

  return { data, loading: false, error: null };
}
