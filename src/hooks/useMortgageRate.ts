import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useMortgageRate() {
  const [data, setData] = useState<MortgageRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check sessionStorage cache first (survives page navigation)
    const cached = sessionStorage.getItem('fred_mortgage_rate');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Cache valid for 2 hours
        if (Date.now() - parsed._cachedAt < 2 * 60 * 60 * 1000) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      } catch { /* ignore */ }
    }

    const fetchRate = async () => {
      try {
        const { data: responseData, error: fnError } = await supabase.functions.invoke('fred-mortgage-rate');
        if (fnError) throw fnError;
        if (responseData?.error) throw new Error(responseData.error);
        
        setData(responseData);
        sessionStorage.setItem('fred_mortgage_rate', JSON.stringify({
          data: responseData,
          _cachedAt: Date.now(),
        }));
      } catch (err: any) {
        console.error('Failed to fetch mortgage rate:', err);
        setError(err.message || 'Failed to fetch mortgage rate');
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  return { data, loading, error };
}
