import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Fetch the public page
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

    // Extract just the text content, strip scripts/styles, limit size
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 8000); // Limit to ~8k chars for AI processing

    if (textContent.length < 100) {
      return new Response(
        JSON.stringify({ error: "Could not extract meaningful content from this page. The site may require JavaScript or be blocking access." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to extract structured data from the page text
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You extract property listing data from public real estate website text. Extract only publicly visible information. Be conservative — only extract fields you are confident about.`,
            },
            {
              role: "user",
              content: `Extract property listing data from this ${parsedUrl.hostname} page text:\n\n${textContent}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_listing_data",
                description: "Extract structured property listing data.",
                parameters: {
                  type: "object",
                  properties: {
                    address: { type: "string", description: "Full property address" },
                    location: { type: "string", description: "City, State ZIP" },
                    propertyType: { type: "string", enum: ["SFH", "Condo", "Townhouse", "Multi-Family"] },
                    condition: { type: "string", enum: ["Renovated", "Updated", "Maintained", "Dated"] },
                    listPrice: { type: "number", description: "List/asking price" },
                    daysOnMarket: { type: "number", description: "Days on market" },
                    bedrooms: { type: "number" },
                    bathrooms: { type: "number" },
                    squareFeet: { type: "number" },
                    yearBuilt: { type: "number" },
                    lotSize: { type: "string" },
                    notes: { type: "string", description: "Key property features or details (brief)" },
                  },
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_listing_data" } },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const extracted = JSON.parse(toolCall.function.arguments);
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(extracted)) {
        if (value !== null && value !== undefined && value !== "") {
          cleaned[key] = value;
        }
      }

      console.log("Extracted fields:", Object.keys(cleaned).length);
      return new Response(
        JSON.stringify({ extracted: cleaned, source: parsedUrl.hostname }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("scrape-listing-url error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
