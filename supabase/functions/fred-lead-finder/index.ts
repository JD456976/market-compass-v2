import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FRED_API_KEY = 'b46baf05500cf297f3d29065d604a92f';
const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';

const cache = new Map<string, { data: any; fetchedAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchFredSeries(seriesId: string, limit = 14): Promise<any[]> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,
    file_type: 'json',
    sort_order: 'desc',
    limit: String(limit),
  });
  const res = await fetch(`${FRED_API_URL}?${params}`);
  if (!res.ok) throw new Error(`FRED ${seriesId} error [${res.status}]`);
  const json = await res.json();
  return (json.observations || []).filter((o: any) => o.value !== '.');
}

function latestAndTrend(obs: any[]) {
  if (!obs.length) return { current: null, previous: null, trend: 'unknown', asOfDate: null };
  const current = parseFloat(obs[0].value);
  const previous = obs.length > 1 ? parseFloat(obs[1].value) : null;
  const trend = previous === null
    ? 'unknown'
    : current > previous ? 'rising' : current < previous ? 'falling' : 'stable';
  return { current, previous, trend, asOfDate: obs[0].date };
}

function ninetyDayChange(obs: any[]) {
  if (obs.length < 2) return null;
  const current = parseFloat(obs[0].value);
  const older = parseFloat(obs[Math.min(12, obs.length - 1)].value);
  return ((current - older) / older) * 100;
}

function buildHistory(obs: any[], limit = 8) {
  return [...obs]
    .slice(0, limit)
    .reverse()
    .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const zip = url.searchParams.get('zip') || 'national';

    const cached = cache.get(zip);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [mortgageObs, inventoryObs, domObs, hpiObs, unemployObs] = await Promise.all([
      fetchFredSeries('MORTGAGE30US', 14),
      fetchFredSeries('ACTLISCOUUS', 14),
      fetchFredSeries('MEDDAYONMARUS', 14),
      fetchFredSeries('CSUSHPISA', 14),
      fetchFredSeries('UNRATE', 14),
    ]);

    const mortgage = latestAndTrend(mortgageObs);
    const inventory = latestAndTrend(inventoryObs);
    const dom = latestAndTrend(domObs);
    const hpi = latestAndTrend(hpiObs);
    const unemploy = latestAndTrend(unemployObs);
    const hpi90dChange = ninetyDayChange(hpiObs);
    const mortgage90dChange = ninetyDayChange(mortgageObs);

    // ── Scoring ──────────────────────────────────────────────────────────────
    let score = 0;
    const factors: { label: string; points: number; reason: string }[] = [];

    if (mortgage.current !== null && mortgage.current > 7 && mortgage.trend === 'rising') {
      score += 20;
      factors.push({ label: 'Rising Borrowing Costs', points: 20, reason: 'Rates above 7% and climbing — seller urgency increases as buyer purchasing power erodes.' });
    } else if (mortgage.current !== null && mortgage.current > 7) {
      score += 12;
      factors.push({ label: 'High Borrowing Costs', points: 12, reason: 'Rates above 7% — elevated borrowing costs are motivating long-term owners to act.' });
    }

    const inventoryTight = inventory.current !== null && inventory.current < 700000;
    if (inventoryTight) {
      score += 20;
      factors.push({ label: 'Tight Inventory', points: 20, reason: 'Active listings are below the national baseline — sellers face less competition and stronger pricing.' });
    } else if (inventory.trend === 'falling') {
      score += 10;
      factors.push({ label: 'Shrinking Supply', points: 10, reason: 'Inventory is declining, pointing toward a tightening market favorable to sellers.' });
    }

    if (dom.current !== null && dom.current > 45) {
      score += 15;
      factors.push({ label: 'Expired Listing Pool', points: 15, reason: `Median days on market is ${Math.round(dom.current)} days — a growing pool of expired listings represents warm prospecting opportunities.` });
    } else if (dom.current !== null && dom.current > 30) {
      score += 7;
      factors.push({ label: 'Slowing Velocity', points: 7, reason: 'Days on market is elevated — the market is taking longer to clear.' });
    }

    if (hpi90dChange !== null && hpi90dChange < -1) {
      score += 15;
      factors.push({ label: 'Softening Prices', points: 15, reason: `Home prices are down ${Math.abs(hpi90dChange).toFixed(1)}% over 90 days — seller motivation is rising.` });
    } else if (hpi90dChange !== null && hpi90dChange < 0) {
      score += 8;
      factors.push({ label: 'Price Cooling', points: 8, reason: 'Price momentum is slightly negative — early signal that seller positioning is shifting.' });
    }

    if (unemploy.current !== null && (unemploy.trend === 'stable' || unemploy.trend === 'falling')) {
      score += 10;
      factors.push({ label: 'Economic Stability', points: 10, reason: `Unemployment at ${unemploy.current}% and ${unemploy.trend} — stable economy supports household mobility decisions.` });
    }

    const momentumBonus = Math.round(
      (mortgage.trend === 'rising' ? 5 : 0) +
      (inventory.trend === 'falling' ? 5 : 0) +
      (dom.trend === 'rising' ? 5 : 0) +
      (hpi.trend === 'falling' ? 5 : 0)
    );
    score += momentumBonus;
    if (momentumBonus > 0) {
      factors.push({ label: 'Combined Market Momentum', points: momentumBonus, reason: 'Multiple indicators are moving in the same direction, amplifying listing opportunity.' });
    }

    score = Math.min(100, Math.max(0, score));
    let leadType: 'seller' | 'transitional' | 'buyer' = score >= 71 ? 'seller' : score >= 41 ? 'transitional' : 'buyer';
    const topFactors = [...factors].sort((a, b) => b.points - a.points).slice(0, 2);

    // ── Notes ─────────────────────────────────────────────────────────────────
    const mortgageNote = mortgage.current === null ? 'Data unavailable'
      : mortgage.trend === 'rising' ? `Rates are rising — reducing buyer pool size and increasing seller urgency.`
      : mortgage.trend === 'falling' ? `Rates are falling — expanding buyer purchasing power and market activity.`
      : `Rates are holding steady at ${mortgage.current.toFixed(2)}%.`;

    const inventoryNote = inventory.current === null ? 'Data unavailable'
      : inventory.trend === 'falling' ? `Supply is shrinking — sellers face less competition in a tightening market.`
      : inventory.trend === 'rising' ? `Supply is expanding — buyers have more options and sellers face more competition.`
      : `Inventory is stable. Monitor for directional shifts.`;

    const domNote = dom.current === null ? 'Data unavailable'
      : dom.current > 45 ? `Days on market exceeds 45 days — expired listing opportunities are accumulating.`
      : dom.current > 30 ? `Market velocity is slowing. Listings are taking longer to move.`
      : `Market is moving quickly. Listings are selling in under 30 days on average.`;

    const hpiNote = hpi90dChange === null ? 'Data unavailable'
      : hpi90dChange > 2 ? `Prices are up ${hpi90dChange.toFixed(1)}% over 90 days — strong equity gains motivate move-up sellers.`
      : hpi90dChange < -1 ? `Prices are down ${Math.abs(hpi90dChange).toFixed(1)}% over 90 days — seller motivation is rising.`
      : `Price momentum is relatively flat. Watch for directional confirmation.`;

    const unemployNote = unemploy.current === null ? 'Data unavailable'
      : unemploy.trend === 'falling' ? `Unemployment is declining — a strengthening labor market supports household mobility.`
      : unemploy.trend === 'rising' ? `Unemployment is rising — economic uncertainty may slow discretionary moves.`
      : `Employment is stable at ${unemploy.current}%. Economic foundation is solid.`;

    const result = {
      zip,
      fetchedAt: new Date().toISOString(),
      opportunityScore: score,
      leadType,
      topFactors,
      scoreBreakdown: factors,
      metrics: {
        mortgage: {
          seriesId: 'MORTGAGE30US', label: 'Borrowing Cost', sublabel: '30-Year Fixed Mortgage Rate',
          current: mortgage.current, previous: mortgage.previous, trend: mortgage.trend,
          change90d: mortgage90dChange, asOfDate: mortgage.asOfDate, unit: '%',
          note: mortgageNote, flagged: mortgage.current !== null && mortgage.current > 7,
          history: buildHistory(mortgageObs),
        },
        inventory: {
          seriesId: 'ACTLISCOUUS', label: 'Available Supply', sublabel: 'Active Housing Listings (US)',
          current: inventory.current, previous: inventory.previous, trend: inventory.trend,
          asOfDate: inventory.asOfDate, unit: 'listings',
          note: inventoryNote, flagged: inventoryTight,
          history: buildHistory(inventoryObs),
        },
        daysOnMarket: {
          seriesId: 'MEDDAYONMARUS', label: 'Listing Velocity', sublabel: 'Median Days on Market (US)',
          current: dom.current, previous: dom.previous, trend: dom.trend,
          asOfDate: dom.asOfDate, unit: 'days',
          note: domNote, flagged: dom.current !== null && dom.current > 45,
          history: buildHistory(domObs),
        },
        hpi: {
          seriesId: 'CSUSHPISA', label: 'Price Momentum', sublabel: 'Case-Shiller Home Price Index',
          current: hpi.current, previous: hpi.previous, trend: hpi.trend,
          change90d: hpi90dChange, asOfDate: hpi.asOfDate, unit: 'index',
          note: hpiNote, flagged: hpi90dChange !== null && hpi90dChange < -1,
          history: buildHistory(hpiObs),
        },
        unemployment: {
          seriesId: 'UNRATE', label: 'Economic Stability', sublabel: 'US Unemployment Rate',
          current: unemploy.current, previous: unemploy.previous, trend: unemploy.trend,
          asOfDate: unemploy.asOfDate, unit: '%',
          note: unemployNote,
          flagged: unemploy.trend === 'rising' && unemploy.current !== null && unemploy.current > 5,
          history: buildHistory(unemployObs),
        },
      },
    };

    cache.set(zip, { data: result, fetchedAt: Date.now() });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Lead finder FRED error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
