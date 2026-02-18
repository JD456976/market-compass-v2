import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FRED_API_KEY = Deno.env.get('FRED_API_KEY') ?? 'b46baf05500cf297f3d29065d604a92f';
const FRED_SERIES_ID = 'MORTGAGE30US';
const FRED_API_URL = `https://api.stlouisfed.org/fred/series/observations`;

// Cache: store last fetched result to avoid excessive calls
let cachedResult: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Return cached if fresh
    if (cachedResult && Date.now() - cachedResult.fetchedAt < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cachedResult.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch last 12 observations (weekly data = ~3 months)
    const params = new URLSearchParams({
      series_id: FRED_SERIES_ID,
      api_key: FRED_API_KEY,
      file_type: 'json',
      sort_order: 'desc',
      limit: '12',
    });

    const response = await fetch(`${FRED_API_URL}?${params}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FRED API error [${response.status}]: ${errorText}`);
    }

    const fredData = await response.json();
    const observations = fredData.observations || [];

    // Extract the latest valid rate
    const latest = observations.find((obs: any) => obs.value !== '.');
    const previousValid = observations.filter((obs: any) => obs.value !== '.').slice(1);

    const result = {
      current_rate: latest ? parseFloat(latest.value) : null,
      as_of_date: latest?.date || null,
      series_id: FRED_SERIES_ID,
      series_name: '30-Year Fixed Rate Mortgage Average',
      source: 'Federal Reserve Economic Data (FRED)',
      source_url: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
      trend: previousValid.length > 0 && latest
        ? parseFloat(latest.value) > parseFloat(previousValid[0].value)
          ? 'rising'
          : parseFloat(latest.value) < parseFloat(previousValid[0].value)
          ? 'falling'
          : 'stable'
        : 'unknown',
      previous_rate: previousValid.length > 0 ? parseFloat(previousValid[0].value) : null,
      history: observations
        .filter((obs: any) => obs.value !== '.')
        .slice(0, 8)
        .map((obs: any) => ({
          date: obs.date,
          rate: parseFloat(obs.value),
        }))
        .reverse(),
    };

    cachedResult = { data: result, fetchedAt: Date.now() };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('FRED mortgage rate error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
