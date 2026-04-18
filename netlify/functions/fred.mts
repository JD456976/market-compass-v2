import type { Config } from "@netlify/functions";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const FRED_API_KEY = "b46baf05500cf297f3d29065d604a92f";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function fetchSeries(seriesId: string, limit = 14): Promise<any[]> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,
    file_type: "json",
    sort_order: "desc",
    limit: String(limit),
  });
  const res = await fetch(`${FRED_BASE}?${params}`);
  if (!res.ok) throw new Error(`FRED ${seriesId} [${res.status}]`);
  const json = await res.json();
  return (json.observations || []).filter((o: any) => o.value !== ".");
}

async function fetchWithFallback(stateSeries: string | null, nationalSeries: string, limit = 14) {
  if (stateSeries) {
    try {
      const obs = await fetchSeries(stateSeries, limit);
      if (obs.length > 0) return { obs, seriesUsed: stateSeries };
    } catch { /* fall through */ }
  }
  const obs = await fetchSeries(nationalSeries, limit);
  return { obs, seriesUsed: nationalSeries };
}

function latestAndTrend(obs: any[]) {
  if (!obs.length) return { current: null, trend: "unknown", asOfDate: null };
  const current = parseFloat(obs[0].value);
  const previous = obs.length > 1 ? parseFloat(obs[1].value) : null;
  const trend = previous === null ? "unknown"
    : current > previous ? "rising"
    : current < previous ? "falling" : "stable";
  return { current, previous, trend, asOfDate: obs[0].date };
}

function ninetyDayChange(obs: any[]) {
  if (obs.length < 2) return null;
  const current = parseFloat(obs[0].value);
  const older = parseFloat(obs[Math.min(12, obs.length - 1)].value);
  return ((current - older) / older) * 100;
}

// ZIP prefix → state code
const ZIP3_TO_STATE: Record<string, string> = {};
function addRange(lo: number, hi: number, st: string) {
  for (let i = lo; i <= hi; i++) ZIP3_TO_STATE[String(i).padStart(3, "0")] = st;
}
addRange(1, 2, "MA"); addRange(3, 3, "NH"); addRange(4, 4, "ME"); addRange(5, 5, "VT");
addRange(6, 6, "CT"); addRange(7, 8, "NJ"); addRange(10, 14, "NY"); addRange(15, 19, "PA");
addRange(20, 20, "DC"); addRange(21, 21, "MD"); addRange(22, 24, "VA"); addRange(25, 26, "WV");
addRange(27, 28, "NC"); addRange(29, 29, "SC"); addRange(30, 31, "GA"); addRange(32, 34, "FL");
addRange(35, 36, "AL"); addRange(37, 38, "TN"); addRange(39, 39, "MS"); addRange(40, 42, "KY");
addRange(43, 45, "OH"); addRange(46, 47, "IN"); addRange(48, 49, "MI"); addRange(50, 52, "IA");
addRange(53, 54, "WI"); addRange(55, 56, "MN"); addRange(57, 57, "SD"); addRange(58, 58, "ND");
addRange(59, 59, "MT"); addRange(60, 62, "IL"); addRange(63, 65, "MO"); addRange(66, 67, "KS");
addRange(68, 69, "NE"); addRange(70, 71, "LA"); addRange(72, 72, "AR"); addRange(73, 74, "OK");
addRange(75, 79, "TX"); addRange(80, 81, "CO"); addRange(82, 82, "WY"); addRange(83, 83, "ID");
addRange(84, 84, "UT"); addRange(85, 86, "AZ"); addRange(87, 88, "NM"); addRange(89, 89, "NV");
addRange(90, 96, "CA"); addRange(97, 97, "OR"); addRange(98, 99, "WA");
["967", "968"].forEach(z => ZIP3_TO_STATE[z] = "HI");
["995","996","997","998","999"].forEach(z => ZIP3_TO_STATE[z] = "AK");

function zipToState(zip: string): string | null {
  return ZIP3_TO_STATE[zip.substring(0, 3)] || null;
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  try {
    const { zip } = await req.json();
    if (!zip || !/^\d{5}$/.test(zip)) {
      return new Response(JSON.stringify({ error: "Valid 5-digit ZIP required" }), { status: 400, headers: CORS });
    }

    const state = zipToState(zip);
    const stateHpiSeries = state ? `${state}STHPI` : null;
    const stateUnemploySeries = state ? `${state}UR` : null;

    const [mortgageRes, inventoryRes, domRes, hpiRes, unemployRes] = await Promise.all([
      fetchWithFallback(null, "MORTGAGE30US", 14),
      fetchWithFallback(null, "ACTLISCOUUS", 14),
      fetchWithFallback(null, "MEDDAYONMARUS", 14),
      fetchWithFallback(stateHpiSeries, "CSUSHPISA", 14),
      fetchWithFallback(stateUnemploySeries, "UNRATE", 14),
    ]);

    const mortgage = latestAndTrend(mortgageRes.obs);
    const inventory = latestAndTrend(inventoryRes.obs);
    const dom = latestAndTrend(domRes.obs);
    const hpi = latestAndTrend(hpiRes.obs);
    const unemploy = latestAndTrend(unemployRes.obs);
    const hpi90d = ninetyDayChange(hpiRes.obs);

    // Deterministic scoring — same algorithm as fredClient.ts
    let score = 0;
    const factors: string[] = [];

    if (mortgage.current !== null && mortgage.current > 7 && mortgage.trend === "rising") {
      score += 20; factors.push("Rising Borrowing Costs");
    } else if (mortgage.current !== null && mortgage.current > 7) {
      score += 12; factors.push("High Borrowing Costs");
    }

    const tight = inventory.current !== null && inventory.current < 700000;
    if (tight) { score += 20; factors.push("Tight Inventory"); }
    else if (inventory.trend === "falling") { score += 10; factors.push("Shrinking Supply"); }

    if (dom.current !== null && dom.current > 45) { score += 15; factors.push("Expired Listing Pool"); }
    else if (dom.current !== null && dom.current > 30) { score += 7; factors.push("Slowing Velocity"); }

    if (hpi90d !== null && hpi90d < -1) { score += 15; factors.push("Softening Prices"); }
    else if (hpi90d !== null && hpi90d < 0) { score += 8; factors.push("Price Cooling"); }

    if (unemploy.current !== null && (unemploy.trend === "stable" || unemploy.trend === "falling")) {
      score += 10; factors.push("Economic Stability");
    } else if (unemploy.current !== null && unemploy.trend === "rising" && unemploy.current > 5) {
      score += 5; factors.push("Economic Pressure");
    }

    const momentum = (mortgage.trend === "rising" ? 5 : 0) + (inventory.trend === "falling" ? 5 : 0)
      + (dom.trend === "rising" ? 5 : 0) + (hpi.trend === "falling" ? 5 : 0);
    score += momentum;
    score = Math.min(100, Math.max(0, score));

    const leadType = score >= 71 ? "seller" : score >= 41 ? "transitional" : "buyer";

    return new Response(JSON.stringify({
      zip,
      state,
      opportunityScore: score,
      leadType,
      topFactors: factors.slice(0, 2),
      metrics: {
        mortgageRate: mortgage.current,
        mortgageTrend: mortgage.trend,
        inventoryCount: inventory.current,
        inventoryTrend: inventory.trend,
        daysOnMarket: dom.current,
        domTrend: dom.trend,
        hpi90dChange: hpi90d,
        unemploymentRate: unemploy.current,
        unemployTrend: unemploy.trend,
        hpiSeriesUsed: hpiRes.seriesUsed,
        unemploySeriesUsed: unemployRes.seriesUsed,
      },
    }), { status: 200, headers: CORS });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "FRED fetch failed" }), { status: 500, headers: CORS });
  }
};

export const config: Config = {
  path: "/api/fred",
};
