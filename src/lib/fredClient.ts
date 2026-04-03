/**
 * Client-side FRED API fetcher — calls https://api.stlouisfed.org directly.
 * No edge functions, no Supabase. Pure browser fetch + deterministic scoring.
 */

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_API_KEY = 'b46baf05500cf297f3d29065d604a92f';

// ── In-memory cache (survives within session) ────────────────────────────────
const cache = new Map<string, { data: FredLeadResult; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── ZIP prefix → state ───────────────────────────────────────────────────────
const ZIP3_TO_STATE: Record<string, string> = {};
function addRange(lo: number, hi: number, st: string) {
  for (let i = lo; i <= hi; i++) ZIP3_TO_STATE[String(i).padStart(3, '0')] = st;
}
addRange(10, 14, 'NY'); addRange(15, 19, 'PA'); addRange(20, 20, 'DC');
addRange(21, 21, 'MD'); addRange(22, 24, 'VA'); addRange(25, 26, 'WV');
addRange(27, 28, 'NC'); addRange(29, 29, 'SC'); addRange(30, 31, 'GA');
addRange(32, 34, 'FL'); addRange(35, 36, 'AL'); addRange(37, 38, 'TN');
addRange(39, 39, 'MS'); addRange(40, 42, 'KY'); addRange(43, 45, 'OH');
addRange(46, 47, 'IN'); addRange(48, 49, 'MI'); addRange(50, 52, 'IA');
addRange(53, 54, 'WI'); addRange(55, 56, 'MN'); addRange(57, 57, 'SD');
addRange(58, 58, 'ND'); addRange(59, 59, 'MT'); addRange(60, 62, 'IL');
addRange(63, 65, 'MO'); addRange(66, 67, 'KS'); addRange(68, 69, 'NE');
addRange(70, 71, 'LA'); addRange(72, 72, 'AR'); addRange(73, 74, 'OK');
addRange(75, 79, 'TX'); addRange(80, 81, 'CO'); addRange(82, 82, 'WY');
addRange(83, 83, 'ID'); addRange(84, 84, 'UT'); addRange(85, 86, 'AZ');
addRange(87, 88, 'NM'); addRange(89, 89, 'NV'); addRange(90, 96, 'CA');
addRange(97, 97, 'OR'); addRange(98, 99, 'WA');
// New England
addRange(1, 2, 'MA'); addRange(3, 3, 'NH'); addRange(4, 4, 'ME');
addRange(5, 5, 'VT'); addRange(6, 6, 'CT'); addRange(7, 8, 'NJ');
addRange(9, 9, 'PR');
// Specific overrides
['006','007','008','009'].forEach(z => ZIP3_TO_STATE[z] = 'PR');
['050','051','052','053','054'].forEach(z => ZIP3_TO_STATE[z] = 'VT');
ZIP3_TO_STATE['055'] = 'MN'; ZIP3_TO_STATE['056'] = 'MN';
ZIP3_TO_STATE['967'] = 'HI'; ZIP3_TO_STATE['968'] = 'HI';
['995','996','997','998','999'].forEach(z => ZIP3_TO_STATE[z] = 'AK');
['197','198','199'].forEach(z => ZIP3_TO_STATE[z] = 'DE');

function zipToState(zip: string): string | null {
  if (!zip || zip.length < 3) return null;
  return ZIP3_TO_STATE[zip.substring(0, 3)] || null;
}

// ── FRED fetch helpers ───────────────────────────────────────────────────────

async function fetchFredSeries(seriesId: string, limit = 14, signal?: AbortSignal): Promise<any[]> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,
    file_type: 'json',
    sort_order: 'desc',
    limit: String(limit),
  });
  const res = await fetch(`${FRED_BASE}?${params}`, { signal });
  if (!res.ok) throw new Error(`FRED ${seriesId} error [${res.status}]`);
  const json = await res.json();
  return (json.observations || []).filter((o: any) => o.value !== '.');
}

async function fetchWithFallback(
  stateSeries: string | null,
  nationalSeries: string,
  limit = 14,
  signal?: AbortSignal,
): Promise<{ obs: any[]; seriesUsed: string }> {
  if (stateSeries) {
    try {
      const obs = await fetchFredSeries(stateSeries, limit, signal);
      if (obs.length > 0) return { obs, seriesUsed: stateSeries };
    } catch { /* fall through */ }
  }
  const obs = await fetchFredSeries(nationalSeries, limit, signal);
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
  return [...obs].slice(0, limit).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) }));
}

// ── Types (matches existing LeadFinderResult) ────────────────────────────────

interface HistoryPoint { date: string; value: number; }

interface MetricData {
  seriesId: string;
  label: string;
  sublabel: string;
  current: number | null;
  previous: number | null;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  change90d?: number | null;
  asOfDate: string | null;
  unit: string;
  note: string;
  flagged: boolean;
  history?: HistoryPoint[];
}

interface ScoreFactor { label: string; points: number; reason: string; }

export interface FredLeadResult {
  zip: string;
  state: string | null;
  fetchedAt: string;
  opportunityScore: number;
  leadType: 'seller' | 'transitional' | 'buyer';
  topFactors: ScoreFactor[];
  scoreBreakdown: ScoreFactor[];
  metrics: {
    mortgage: MetricData;
    inventory: MetricData;
    daysOnMarket: MetricData;
    hpi: MetricData;
    unemployment: MetricData;
  };
}

// ── Main public function ─────────────────────────────────────────────────────

export async function fetchLeadFinderData(zip: string, signal?: AbortSignal): Promise<FredLeadResult> {
  // Check cache first
  const cached = cache.get(zip);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const state = zipToState(zip);
  const stateUnemploySeries = state ? `${state}UR` : null;
  const stateHpiSeries = state ? `${state}STHPI` : null;

  const [mortgageResult, inventoryResult, domResult, hpiResult, unemployResult] = await Promise.all([
    fetchWithFallback(null, 'MORTGAGE30US', 14, signal),
    fetchWithFallback(null, 'ACTLISCOUUS', 14, signal),
    fetchWithFallback(null, 'MEDDAYONMARUS', 14, signal),
    fetchWithFallback(stateHpiSeries, 'CSUSHPISA', 14, signal),
    fetchWithFallback(stateUnemploySeries, 'UNRATE', 14, signal),
  ]);

  const mortgage = latestAndTrend(mortgageResult.obs);
  const inventory = latestAndTrend(inventoryResult.obs);
  const dom = latestAndTrend(domResult.obs);
  const hpi = latestAndTrend(hpiResult.obs);
  const unemploy = latestAndTrend(unemployResult.obs);
  const hpi90dChange = ninetyDayChange(hpiResult.obs);
  const mortgage90dChange = ninetyDayChange(mortgageResult.obs);

  // ── Scoring ────────────────────────────────────────────────────────────────
  let score = 0;
  const factors: ScoreFactor[] = [];

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

  // ── Notes ──────────────────────────────────────────────────────────────────
  const mortgageNote = mortgage.current === null ? 'Data unavailable'
    : mortgage.trend === 'rising' ? 'Rates are rising — reducing buyer pool size and increasing seller urgency.'
    : mortgage.trend === 'falling' ? 'Rates are falling — expanding buyer purchasing power and market activity.'
    : `Rates are holding steady at ${mortgage.current.toFixed(2)}%.`;

  const inventoryNote = inventory.current === null ? 'Data unavailable'
    : inventory.trend === 'falling' ? 'Supply is shrinking — sellers face less competition in a tightening market.'
    : inventory.trend === 'rising' ? 'Supply is expanding — buyers have more options and sellers face more competition.'
    : 'Inventory is stable. Monitor for directional shifts.';

  const domNote = dom.current === null ? 'Data unavailable'
    : dom.current > 45 ? 'Days on market exceeds 45 days — expired listing opportunities are accumulating.'
    : dom.current > 30 ? 'Market velocity is slowing. Listings are taking longer to move.'
    : 'Market is moving quickly. Listings are selling in under 30 days on average.';

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

  const result: FredLeadResult = {
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
        history: buildHistory(mortgageResult.obs),
      },
      inventory: {
        seriesId: 'ACTLISCOUUS', label: 'Available Supply', sublabel: 'Active Housing Listings (US)',
        current: inventory.current, previous: inventory.previous, trend: inventory.trend,
        asOfDate: inventory.asOfDate, unit: 'listings',
        note: inventoryNote, flagged: inventoryTight,
        history: buildHistory(inventoryResult.obs),
      },
      daysOnMarket: {
        seriesId: 'MEDDAYONMARUS', label: 'Listing Velocity', sublabel: 'Median Days on Market (US)',
        current: dom.current, previous: dom.previous, trend: dom.trend,
        asOfDate: dom.asOfDate, unit: 'days',
        note: domNote, flagged: dom.current !== null && dom.current > 45,
        history: buildHistory(domResult.obs),
      },
      hpi: {
        seriesId: hpiResult.seriesUsed, label: 'Price Momentum',
        sublabel: hpiResult.seriesUsed !== 'CSUSHPISA' ? `${state} State Home Price Index` : 'Case-Shiller Home Price Index',
        current: hpi.current, previous: hpi.previous, trend: hpi.trend,
        change90d: hpi90dChange, asOfDate: hpi.asOfDate, unit: 'index',
        note: hpiNote, flagged: hpi90dChange !== null && hpi90dChange < -1,
        history: buildHistory(hpiResult.obs),
      },
      unemployment: {
        seriesId: unemployResult.seriesUsed, label: 'Economic Stability',
        sublabel: unemployResult.seriesUsed !== 'UNRATE' ? `${state} Unemployment Rate` : 'US Unemployment Rate',
        current: unemploy.current, previous: unemploy.previous, trend: unemploy.trend,
        asOfDate: unemploy.asOfDate, unit: '%',
        note: unemployNote,
        flagged: unemploy.trend === 'rising' && unemploy.current !== null && unemploy.current > 5,
        history: buildHistory(unemployResult.obs),
      },
    },
  };

  cache.set(zip, { data: result, fetchedAt: Date.now() });
  return result;
}
