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
// Correct 3-digit ZIP prefix → USPS state code
// ZIP prefix = zip.substring(0,3) e.g. "94110" → "941" → CA
const ZIP3_TO_STATE: Record<string, string> = {};
function addRange(lo: number, hi: number, st: string) {
  for (let i = lo; i <= hi; i++) ZIP3_TO_STATE[String(i).padStart(3, "0")] = st;
}
// New England
addRange(10, 27, "MA");   // 010–027: Massachusetts
addRange(28, 29, "RI");   // 028–029: Rhode Island
addRange(30, 38, "NH");   // 030–038: New Hampshire
addRange(39, 49, "ME");   // 039–049: Maine
addRange(50, 59, "VT");   // 050–059: Vermont
addRange(60, 69, "CT");   // 060–069: Connecticut
addRange(70, 89, "NJ");   // 070–089: New Jersey
// Mid-Atlantic
addRange(100, 149, "NY"); // 100–149: New York
addRange(150, 196, "PA"); // 150–196: Pennsylvania
addRange(197, 199, "DE"); // 197–199: Delaware
addRange(200, 205, "DC"); // 200–205: District of Columbia
addRange(206, 219, "MD"); // 206–219: Maryland
addRange(220, 246, "VA"); // 220–246: Virginia
addRange(247, 269, "WV"); // 247–269: West Virginia
// Southeast
addRange(270, 289, "NC"); // 270–289: North Carolina
addRange(290, 299, "SC"); // 290–299: South Carolina
addRange(300, 319, "GA"); // 300–319: Georgia
addRange(320, 349, "FL"); // 320–349: Florida
addRange(350, 369, "AL"); // 350–369: Alabama
addRange(370, 385, "TN"); // 370–385: Tennessee
addRange(386, 397, "MS"); // 386–397: Mississippi
addRange(398, 399, "GA"); // 398–399: Georgia (continued)
// Border/Midwest
addRange(400, 427, "KY"); // 400–427: Kentucky
addRange(430, 459, "OH"); // 430–459: Ohio
addRange(460, 479, "IN"); // 460–479: Indiana
addRange(480, 499, "MI"); // 480–499: Michigan
// Midwest
addRange(500, 528, "IA"); // 500–528: Iowa
addRange(530, 549, "WI"); // 530–549: Wisconsin
addRange(550, 567, "MN"); // 550–567: Minnesota
addRange(570, 577, "SD"); // 570–577: South Dakota
addRange(580, 588, "ND"); // 580–588: North Dakota
addRange(590, 599, "MT"); // 590–599: Montana
addRange(600, 629, "IL"); // 600–629: Illinois
addRange(630, 658, "MO"); // 630–658: Missouri
addRange(660, 679, "KS"); // 660–679: Kansas
addRange(680, 693, "NE"); // 680–693: Nebraska
// South Central
addRange(700, 714, "LA"); // 700–714: Louisiana
addRange(716, 729, "AR"); // 716–729: Arkansas
addRange(730, 749, "OK"); // 730–749: Oklahoma
addRange(750, 799, "TX"); // 750–799: Texas
// Mountain
addRange(800, 816, "CO"); // 800–816: Colorado
addRange(820, 831, "WY"); // 820–831: Wyoming
addRange(832, 838, "ID"); // 832–838: Idaho
addRange(840, 847, "UT"); // 840–847: Utah
addRange(850, 865, "AZ"); // 850–865: Arizona
addRange(870, 884, "NM"); // 870–884: New Mexico
addRange(889, 899, "NV"); // 889–899: Nevada
// West
addRange(900, 961, "CA"); // 900–961: California
addRange(967, 968, "HI"); // 967–968: Hawaii
addRange(970, 979, "OR"); // 970–979: Oregon
addRange(980, 994, "WA"); // 980–994: Washington
addRange(995, 999, "AK"); // 995–999: Alaska

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
