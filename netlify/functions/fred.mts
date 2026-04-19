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

// ── Correct 3-digit ZIP prefix to USPS state code ────────────────────────────
const ZIP3_TO_STATE: Record<string, string> = {};
function addRange(lo: number, hi: number, st: string) {
  for (let i = lo; i <= hi; i++) ZIP3_TO_STATE[String(i).padStart(3, "0")] = st;
}
addRange(10, 27, "MA");   addRange(28, 29, "RI");   addRange(30, 38, "NH");
addRange(39, 49, "ME");   addRange(50, 59, "VT");   addRange(60, 69, "CT");
addRange(70, 89, "NJ");   addRange(100, 149, "NY"); addRange(150, 196, "PA");
addRange(197, 199, "DE"); addRange(200, 205, "DC"); addRange(206, 219, "MD");
addRange(220, 246, "VA"); addRange(247, 269, "WV"); addRange(270, 289, "NC");
addRange(290, 299, "SC"); addRange(300, 319, "GA"); addRange(320, 349, "FL");
addRange(350, 369, "AL"); addRange(370, 385, "TN"); addRange(386, 397, "MS");
addRange(398, 399, "GA"); addRange(400, 427, "KY"); addRange(430, 459, "OH");
addRange(460, 479, "IN"); addRange(480, 499, "MI"); addRange(500, 528, "IA");
addRange(530, 549, "WI"); addRange(550, 567, "MN"); addRange(570, 577, "SD");
addRange(580, 588, "ND"); addRange(590, 599, "MT"); addRange(600, 629, "IL");
addRange(630, 658, "MO"); addRange(660, 679, "KS"); addRange(680, 693, "NE");
addRange(700, 714, "LA"); addRange(716, 729, "AR"); addRange(730, 749, "OK");
addRange(750, 799, "TX"); addRange(800, 816, "CO"); addRange(820, 831, "WY");
addRange(832, 838, "ID"); addRange(840, 847, "UT"); addRange(850, 865, "AZ");
addRange(870, 884, "NM"); addRange(889, 899, "NV"); addRange(900, 961, "CA");
addRange(967, 968, "HI"); addRange(970, 979, "OR"); addRange(980, 994, "WA");
addRange(995, 999, "AK");

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

    // State HPI: limit=6 so obs[4] = 4 quarters (1 year) ago — true YoY comparison
    const [mortgageRes, inventoryRes, domRes, hpiRes, unemployRes] = await Promise.all([
      fetchWithFallback(null, "MORTGAGE30US", 4),
      fetchWithFallback(null, "ACTLISCOUUS", 4),
      fetchWithFallback(null, "MEDDAYONMARUS", 4),
      fetchWithFallback(stateHpiSeries, "CSUSHPISA", 6),
      fetchWithFallback(stateUnemploySeries, "UNRATE", 4),
    ]);

    const mortgage  = latestAndTrend(mortgageRes.obs);
    const inventory = latestAndTrend(inventoryRes.obs);
    const dom       = latestAndTrend(domRes.obs);
    const unemploy  = latestAndTrend(unemployRes.obs);

    // ── Market Health Score (0–100) ───────────────────────────────────────────
    // Higher = seller's market (strong demand, fast sales, appreciating prices)
    // Lower  = buyer's market  (weak demand, slow sales, flat/falling prices)
    //
    // State-level factors differentiate regions. National factors set the baseline.
    // ZIPs in the same state share state indicators — FRED is state-level only.

    let score = 0;
    const factors: Array<{ label: string; points: number; description: string }> = [];

    // 1. State HPI year-over-year appreciation (0–38 pts)
    //    obs[4] on quarterly state HPI = exactly 1 year ago
    const hpiYoY = hpiRes.obs.length >= 5
      ? ((parseFloat(hpiRes.obs[0].value) - parseFloat(hpiRes.obs[4].value))
          / parseFloat(hpiRes.obs[4].value)) * 100
      : null;

    if (hpiYoY !== null) {
      let pts = 4;
      if      (hpiYoY > 8) pts = 38;
      else if (hpiYoY > 6) pts = 32;
      else if (hpiYoY > 4) pts = 26;
      else if (hpiYoY > 2) pts = 18;
      else if (hpiYoY > 0) pts = 10;
      score += pts;
      factors.push({
        label: `${state || "National"} Home Price Index`,
        points: pts,
        description: `${hpiYoY >= 0 ? "+" : ""}${hpiYoY.toFixed(1)}% YoY appreciation`,
      });
    }

    // 2. State unemployment rate (0–28 pts)
    //    Lower unemployment = stronger economy = more active buyers and sellers
    if (unemploy.current !== null) {
      const u = unemploy.current;
      let pts = 4;
      if      (u < 3)   pts = 28;
      else if (u < 3.5) pts = 24;
      else if (u < 4)   pts = 20;
      else if (u < 4.5) pts = 17;
      else if (u < 5)   pts = 14;
      else if (u < 5.5) pts = 11;
      else if (u < 6)   pts = 8;
      else if (u < 6.5) pts = 6;
      score += pts;
      factors.push({
        label: `${state || "US"} Unemployment Rate`,
        points: pts,
        description: `${u.toFixed(1)}% — ${u < 4 ? "very strong" : u < 5 ? "healthy" : u < 6 ? "moderate" : "elevated"} labor market`,
      });
    }

    // 3. Median days on market (0–12 pts)
    //    Lower DOM = faster sales = buyers competing = seller advantage
    if (dom.current !== null) {
      const d = dom.current;
      let pts = 1;
      if      (d < 25) pts = 12;
      else if (d < 35) pts = 10;
      else if (d < 45) pts = 8;
      else if (d < 55) pts = 5;
      else if (d < 65) pts = 3;
      score += pts;
      factors.push({
        label: "Median Days on Market",
        points: pts,
        description: `${Math.round(d)} days — ${d < 35 ? "very fast" : d < 55 ? "moderate" : "slow"} market velocity`,
      });
    }

    // 4. Active listings inventory (0–12 pts)
    //    Low supply = buyers compete = upward price pressure
    if (inventory.current !== null) {
      const i = inventory.current;
      let pts = 2;
      if      (i < 600000)  pts = 12;
      else if (i < 800000)  pts = 9;
      else if (i < 1000000) pts = 5;
      score += pts;
      factors.push({
        label: "Active Listings (National)",
        points: pts,
        description: `${(i / 1000).toFixed(0)}K listings — ${i < 700000 ? "very tight" : i < 900000 ? "below normal" : "elevated"} supply`,
      });
    }

    // 5. 30-year mortgage rate (0–10 pts)
    //    Lower rates = larger buyer pool = stronger demand
    if (mortgage.current !== null) {
      const m = mortgage.current;
      let pts = 0;
      if      (m < 5.5) pts = 10;
      else if (m < 6)   pts = 8;
      else if (m < 6.5) pts = 6;
      else if (m < 7)   pts = 4;
      else if (m < 7.5) pts = 2;
      score += pts;
      factors.push({
        label: "30-Year Mortgage Rate",
        points: pts,
        description: `${m.toFixed(2)}% — ${m < 6.5 ? "accessible" : m < 7 ? "moderate" : "restrictive"} for buyers`,
      });
    }

    score = Math.min(100, Math.max(0, score));
    const leadType: "seller" | "transitional" | "buyer" =
      score >= 65 ? "seller" : score >= 40 ? "transitional" : "buyer";
    const topFactors = [...factors]
      .sort((a, b) => b.points - a.points)
      .slice(0, 2)
      .map(f => f.label);

    return new Response(JSON.stringify({
      zip,
      state,
      opportunityScore: score,
      leadType,
      topFactors,
      factors,
      stateNote: state
        ? `Score uses ${state} state data. All ${state} ZIPs share state-level indicators.`
        : "No state data — national indicators only.",
      metrics: {
        mortgageRate: mortgage.current,
        mortgageTrend: mortgage.trend,
        inventoryCount: inventory.current,
        inventoryTrend: inventory.trend,
        daysOnMarket: dom.current,
        domTrend: dom.trend,
        hpiYoY,
        hpiSeriesUsed: hpiRes.seriesUsed,
        unemploymentRate: unemploy.current,
        unemployTrend: unemploy.trend,
        unemploySeriesUsed: unemployRes.seriesUsed,
      },
    }), { status: 200, headers: CORS });

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "FRED fetch failed" }),
      { status: 500, headers: CORS }
    );
  }
};

export const config: Config = {
  path: "/api/fred",
};
