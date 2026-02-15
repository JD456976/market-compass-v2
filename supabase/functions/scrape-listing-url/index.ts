import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Extract a number from text, returning undefined if not found */
function extractNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(val)) return val;
    }
  }
  return undefined;
}

/** Extract first match string */
function extractString(text: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

/** Deterministic property data extraction from HTML text */
function extractListingData(html: string, hostname: string) {
  // Strip scripts/styles, get text
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Also try JSON-LD structured data
  const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  let jsonLd: any = {};
  for (const block of jsonLdMatches) {
    try {
      const content = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item["@type"] === "SingleFamilyResidence" || item["@type"] === "Product" || item["@type"] === "RealEstateListing" || item["@type"] === "Residence" || item["@type"] === "Place") {
          jsonLd = { ...jsonLd, ...item };
        }
      }
    } catch { /* ignore */ }
  }

  // Address
  let address = jsonLd?.address?.streetAddress || jsonLd?.name;
  if (!address) {
    address = extractString(text, [
      /(\d+\s+[A-Z][a-zA-Z]+(?:\s+[A-Za-z]+){1,4}(?:,\s*(?:Unit|Apt|#)\s*\S+)?)\s*,\s*[A-Z][a-z]/,
    ]);
  }

  // Location (City, State ZIP)
  let location = undefined;
  if (jsonLd?.address) {
    const a = jsonLd.address;
    location = [a.addressLocality, a.addressRegion, a.postalCode].filter(Boolean).join(", ");
  }
  if (!location) {
    location = extractString(text, [
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5})/,
    ]);
  }

  // Price
  let listPrice = jsonLd?.offers?.price ? parseFloat(jsonLd.offers.price) : undefined;
  if (!listPrice) {
    listPrice = extractNumber(text, [
      /\$\s*([\d,]+(?:\.\d+)?)\s*/,
      /(?:list|asking|price|sale)\s*(?:price)?\s*:?\s*\$?\s*([\d,]+)/i,
    ]);
  }

  // Bedrooms
  let bedrooms = jsonLd?.numberOfRooms ? parseInt(jsonLd.numberOfRooms) : undefined;
  if (!bedrooms) {
    bedrooms = extractNumber(text, [
      /(\d+)\s*(?:bed|br|bedroom)/i,
      /(?:bed|br|bedroom)s?\s*:?\s*(\d+)/i,
    ]);
  }

  // Bathrooms
  let bathrooms = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i,
    /(?:bath|ba|bathroom)s?\s*:?\s*(\d+(?:\.\d+)?)/i,
  ]);

  // Square feet
  let squareFeet = jsonLd?.floorSize?.value ? parseFloat(jsonLd.floorSize.value) : undefined;
  if (!squareFeet) {
    squareFeet = extractNumber(text, [
      /([\d,]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i,
      /(?:living\s*area|floor\s*area|size)\s*:?\s*([\d,]+)/i,
    ]);
  }

  // Year built
  const yearBuilt = extractNumber(text, [
    /(?:year\s*built|built\s*in|built)\s*:?\s*(\d{4})/i,
  ]);

  // Days on market
  const daysOnMarket = extractNumber(text, [
    /(\d+)\s*(?:days?\s*on\s*(?:market|zillow|redfin|realtor|trulia))/i,
    /(?:DOM|days\s*on\s*market)\s*:?\s*(\d+)/i,
  ]);

  // Lot size
  const lotSize = extractString(text, [
    /(?:lot\s*size|lot)\s*:?\s*([\d,.]+\s*(?:acres?|sq\.?\s*ft|sqft))/i,
  ]);

  // Property type detection
  let propertyType: string | undefined;
  const textLower = text.toLowerCase();
  if (/\bcondo(?:minium)?\b/i.test(textLower)) propertyType = "Condo";
  else if (/\btownho(?:use|me)\b/i.test(textLower)) propertyType = "Townhouse";
  else if (/\bmulti.?family\b/i.test(textLower)) propertyType = "Multi-Family";
  else if (/\bsingle.?family\b/i.test(textLower)) propertyType = "SFH";

  // Condition hints
  let condition: string | undefined;
  if (/\b(?:renovated|newly\s*renovated|gut\s*rehab)\b/i.test(textLower)) condition = "Renovated";
  else if (/\b(?:updated|recently\s*updated|modern)\b/i.test(textLower)) condition = "Updated";
  else if (/\b(?:dated|needs\s*work|fixer|as.is)\b/i.test(textLower)) condition = "Dated";
  else if (/\b(?:well.maintained|maintained|good\s*condition|move.in\s*ready)\b/i.test(textLower)) condition = "Maintained";

  // Build cleaned result
  const result: Record<string, any> = {};
  if (address) result.address = address;
  if (location) result.location = location;
  if (propertyType) result.propertyType = propertyType;
  if (condition) result.condition = condition;
  if (listPrice && listPrice > 1000) result.listPrice = listPrice;
  if (daysOnMarket !== undefined) result.daysOnMarket = daysOnMarket;
  if (bedrooms) result.bedrooms = bedrooms;
  if (bathrooms) result.bathrooms = bathrooms;
  if (squareFeet && squareFeet > 100) result.squareFeet = squareFeet;
  if (yearBuilt && yearBuilt > 1600 && yearBuilt <= new Date().getFullYear()) result.yearBuilt = yearBuilt;
  if (lotSize) result.lotSize = lotSize;

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL is from allowed listing sites
    const parsedUrl = new URL(url.trim());
    const allowedHosts = [
      "zillow.com", "www.zillow.com",
      "redfin.com", "www.redfin.com",
      "realtor.com", "www.realtor.com",
      "trulia.com", "www.trulia.com",
      "homes.com", "www.homes.com",
    ];
    if (!allowedHosts.some(h => parsedUrl.hostname.endsWith(h))) {
      return new Response(
        JSON.stringify({ error: "Only Zillow, Redfin, Realtor.com, Trulia, and Homes.com URLs are supported." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching listing URL:", url);

    const pageResponse = await fetch(url.trim(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketCompass/1.0)",
        "Accept": "text/html",
      },
    });

    if (!pageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Could not fetch listing page (${pageResponse.status}). The site may be blocking automated access.` }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await pageResponse.text();

    if (html.length < 500) {
      return new Response(
        JSON.stringify({ error: "Could not extract meaningful content from this page. The site may require JavaScript or be blocking access." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deterministic regex + JSON-LD extraction (no AI)
    const extracted = extractListingData(html, parsedUrl.hostname);

    if (Object.keys(extracted).length === 0) {
      return new Response(
        JSON.stringify({ error: "Could not extract listing details. The site may require JavaScript rendering. Try the Paste tab instead." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Extracted fields:", Object.keys(extracted).length);
    return new Response(
      JSON.stringify({ extracted, source: parsedUrl.hostname }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-listing-url error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
