import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FRED_API_KEY = Deno.env.get('FRED_API_KEY') ?? 'b46baf05500cf297f3d29065d604a92f';
const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';

const cache = new Map<string, { data: any; fetchedAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ── ZIP prefix (first 3 digits) → state abbreviation ─────────────────────────
// Covers all 50 states + DC. Based on USPS ZIP code ranges.
const ZIP3_TO_STATE: Record<string, string> = {};
function addRange(lo: number, hi: number, st: string) {
  for (let i = lo; i <= hi; i++) ZIP3_TO_STATE[String(i).padStart(3, '0')] = st;
}
// Northeast
addRange(  5,   5,'NY'); addRange(  6,   6,'PR'); addRange( 10, 14,'NY');
addRange( 15, 19,'PA'); addRange( 20, 20,'DC'); addRange( 21, 21,'MD');
addRange( 22, 24,'VA'); addRange( 25, 26,'WV'); addRange( 27, 28,'NC');
addRange( 29, 29,'SC'); addRange( 30, 31,'GA'); addRange( 32, 34,'FL');
addRange( 35, 36,'AL'); addRange( 37, 38,'TN'); addRange( 39, 39,'MS');
addRange( 40, 42,'KY'); addRange( 43, 45,'OH'); addRange( 46, 47,'IN');
addRange( 48, 49,'MI'); addRange( 50, 52,'IA'); addRange( 53, 54,'WI');
addRange( 55, 56,'MN'); addRange( 57, 57,'SD'); addRange( 58, 58,'ND');
addRange( 59, 59,'MT'); addRange( 60, 62,'IL'); addRange( 63, 65,'MO');
addRange( 66, 67,'KS'); addRange( 68, 69,'NE'); addRange( 70, 71,'LA');
addRange( 72, 72,'AR'); addRange( 73, 73,'OK'); addRange( 74, 74,'OK');
addRange( 75, 79,'TX'); addRange( 80, 81,'CO'); addRange( 82, 83,'WY');
addRange( 83, 83,'ID'); addRange( 84, 84,'UT'); addRange( 85, 86,'AZ');
addRange( 87, 88,'NM'); addRange( 89, 89,'NV'); addRange( 90, 96,'CA');
addRange( 97, 97,'OR'); addRange( 98, 99,'WA');
// New England
addRange(  1,  2,'MA'); addRange(  3,  3,'NH'); addRange(  4,  4,'ME');
addRange(  5,  5,'VT'); // override NY above for 050-059
addRange(  6,  6,'CT'); // override PR for 060-069
addRange(  7,  8,'NJ'); addRange(  9,  9,'PR');
// Fix overlaps (more specific ranges)
ZIP3_TO_STATE['006'] = 'PR'; ZIP3_TO_STATE['007'] = 'PR'; ZIP3_TO_STATE['008'] = 'PR'; ZIP3_TO_STATE['009'] = 'PR';
ZIP3_TO_STATE['050'] = 'VT'; ZIP3_TO_STATE['051'] = 'VT'; ZIP3_TO_STATE['052'] = 'VT'; ZIP3_TO_STATE['053'] = 'VT';
ZIP3_TO_STATE['054'] = 'VT'; ZIP3_TO_STATE['055'] = 'MN'; ZIP3_TO_STATE['056'] = 'MN';
// Hawaii & Alaska
ZIP3_TO_STATE['967'] = 'HI'; ZIP3_TO_STATE['968'] = 'HI';
ZIP3_TO_STATE['995'] = 'AK'; ZIP3_TO_STATE['996'] = 'AK'; ZIP3_TO_STATE['997'] = 'AK';
ZIP3_TO_STATE['998'] = 'AK'; ZIP3_TO_STATE['999'] = 'AK';
// DE, HI extras
ZIP3_TO_STATE['197'] = 'DE'; ZIP3_TO_STATE['198'] = 'DE'; ZIP3_TO_STATE['199'] = 'DE';

function zipToState(zip: string): string | null {
  if (!zip || zip.length < 3) return null;
  return ZIP3_TO_STATE[zip.substring(0, 3)] || null;
}

// ── FRED fetch helpers ───────────────────────────────────────────────────────

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

/** Try state-level series first, fall back to national */
async function fetchWithFallback(stateSeries: string | null, nationalSeries: string, limit = 14): Promise<{ obs: any[]; seriesUsed: string }> {
  if (stateSeries) {
    try {
      const obs = await fetchFredSeries(stateSeries, limit);
      if (obs.length > 0) return { obs, seriesUsed: stateSeries };
    } catch { /* fall through to national */ }
  }
  const obs = await fetchFredSeries(nationalSeries, limit);
  return { obs, seriesUsed: nationalSeries };
}

function latestAndTrend(obs: any[]) {
  if (!obs.length) return { current: null, previous: null, trend: 'unknown' as const, asOfDate: null };
  const current = parseFloat(obs[0].value);
  const previous = obs.length > 1 ? parseFloat(obs[1].value) : null;
  const trend = previous === null
    ? 'unknown' as const
    : current > previous ? 'rising' as const : current < previous ? 'falling' as const : 'stable' as const;
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
    // Support both query param and POST body
    const url = new URL(req.url);
    let zip = url.searchParams.get('zip') || '';
    if (!zip && req.method === 'POST') {
      try {
        const body = await req.json();
        zip = body.zip || body.zipCode || '';
      } catch { /* no body */ }
    }
    zip = zip.trim();
    if (!zip || zip === 'national') zip = 'national';

    // Check cache
    const cached = cache.get(zip);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve state for regional series
    const state = zip !== 'national' ? zipToState(zip) : null;

    // State-level FRED series IDs
    // Unemployment: {ST}UR (e.g., NYUR, CAUR, TXUR)
    const stateUnemploySeries = state ? `${state}UR` : null;
    // HPI: {ST}STHPI (e.g., NYSTHPI, CASTHPI)
    const stateHpiSeries = state ? `${state}STHPI` : null;

    // Fetch all in parallel — state-level for unemployment & HPI, national for the rest
    const [
      mortgageResult,
      inventoryResult,
      domResult,
      hpiResult,
      unemployResult,
    ] = await Promise.all([
      fetchWithFallback(null, 'MORTGAGE30US', 14),                    // always national
      fetchWithFallback(null, 'ACTLISCOUUS', 14),                    // national inventory
      fetchWithFallback(null, 'MEDDAYONMARUS', 14),                  // national DOM
      fetchWithFallback(stateHpiSeries, 'CSUSHPISA', 14),            // state HPI → national
      fetchWithFallback(stateUnemploySeries, 'UNRATE', 14),          // state unemployment → national
    ]);

    const mortgageObs = mortgageResult.obs;
    const inventoryObs = inventoryResult.obs;
    const domObs = domResult.obs;
    const hpiObs = hpiResult.obs;
    const unemployObs = unemployResult.obs;

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
      factors.push({ label: 'Economic Stability', points: 10, reason: `Unemployment at ${unemploy.current.toFixed(1)}% and ${unemploy.trend} — stable economy supports household mobility decisions.` });
    } else if (unemploy.current !== null && unemploy.trend === 'rising' && unemploy.current > 5) {
      score += 5;
      factors.push({ label: 'Economic Pressure', points: 5, reason: `Unemployment at ${unemploy.current.toFixed(1)}% and rising — economic stress may force inventory onto the market.` });
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
    const leadType: 'seller' | 'transitional' | 'buyer' = score >= 71 ? 'seller' : score >= 41 ? 'transitional' : 'buyer';
    const topFactors = [...factors].sort((a, b) => b.points - a.points).slice(0, 2);

    // ── Notes ─────────────────────────────────────────────────────────────────
    const stateLabel = state ? ` (${state})` : '';

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

    const hpiSeriesLabel = hpiResult.seriesUsed !== 'CSUSHPISA' ? `${state} State` : 'National';
    const hpiNote = hpi90dChange === null ? 'Data unavailable'
      : hpi90dChange > 2 ? `${hpiSeriesLabel} prices are up ${hpi90dChange.toFixed(1)}% over 90 days — strong equity gains motivate move-up sellers.`
      : hpi90dChange < -1 ? `${hpiSeriesLabel} prices are down ${Math.abs(hpi90dChange).toFixed(1)}% over 90 days — seller motivation is rising.`
      : `${hpiSeriesLabel} price momentum is relatively flat. Watch for directional confirmation.`;

    const unemploySeriesLabel = unemployResult.seriesUsed !== 'UNRATE' ? `${state}` : 'National';
    const unemployNote = unemploy.current === null ? 'Data unavailable'
      : unemploy.trend === 'falling' ? `${unemploySeriesLabel} unemployment is declining — a strengthening labor market supports household mobility.`
      : unemploy.trend === 'rising' ? `${unemploySeriesLabel} unemployment is rising — economic uncertainty may slow discretionary moves.`
      : `${unemploySeriesLabel} employment is stable at ${unemploy.current.toFixed(1)}%. Economic foundation is solid.`;

    const result = {
      zip,
      state: state || null,
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
          seriesId: hpiResult.seriesUsed, label: 'Price Momentum',
          sublabel: hpiResult.seriesUsed !== 'CSUSHPISA' ? `${state} State Home Price Index` : 'Case-Shiller Home Price Index',
          current: hpi.current, previous: hpi.previous, trend: hpi.trend,
          change90d: hpi90dChange, asOfDate: hpi.asOfDate, unit: 'index',
          note: hpiNote, flagged: hpi90dChange !== null && hpi90dChange < -1,
          history: buildHistory(hpiObs),
        },
        unemployment: {
          seriesId: unemployResult.seriesUsed, label: 'Economic Stability',
          sublabel: unemployResult.seriesUsed !== 'UNRATE' ? `${state} Unemployment Rate` : 'US Unemployment Rate',
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
