import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { listing, buyers } = await req.json();
    if (!listing || !Array.isArray(buyers) || buyers.length === 0) {
      return new Response(JSON.stringify({ error: "Missing listing or buyers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const listingSummary = [
      `Address: ${listing.address}`,
      `Price: $${Number(listing.price).toLocaleString()}`,
      listing.bedrooms && `Bedrooms: ${listing.bedrooms}`,
      listing.bathrooms && `Bathrooms: ${listing.bathrooms}`,
      listing.sqft && `Sqft: ${listing.sqft}`,
      listing.neighborhood && `Neighborhood: ${listing.neighborhood}`,
      listing.propertyType && `Type: ${listing.propertyType}`,
      listing.keyFeatures && `Key features: ${listing.keyFeatures}`,
      listing.description && `Description: ${listing.description}`,
    ].filter(Boolean).join("\n");

    const buyerSummaries = buyers.map((b: any, i: number) => {
      return [
        `Buyer ${i + 1}: ${b.name}`,
        b.budgetMax && `  Budget max: $${Number(b.budgetMax).toLocaleString()}`,
        b.minBedrooms && `  Min bedrooms: ${b.minBedrooms}`,
        b.preferredAreas && `  Preferred areas: ${b.preferredAreas}`,
        b.mustHaveFeatures && `  Must-haves: ${b.mustHaveFeatures}`,
        b.timeline && `  Timeline: ${b.timeline}`,
        b.notes && `  Notes: ${b.notes}`,
      ].filter(Boolean).join("\n");
    }).join("\n\n");

    const systemPrompt = `You are a real estate buyer-listing matching expert. You will receive a listing and a set of buyer profiles. Score each buyer 0-100 for how well the listing fits them. Give a concise 1-sentence reason. Flag the top 3 scorers as "Hot Match" (isHotMatch: true). Return ONLY valid JSON.`;

    const userPrompt = `LISTING:\n${listingSummary}\n\nBUYERS:\n${buyerSummaries}\n\nReturn a JSON array: [{buyerName, score, reason, isHotMatch}]. No markdown, no explanation — just the JSON array.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_matches",
              description: "Return buyer match results as structured data",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        buyerName: { type: "string" },
                        score: { type: "number" },
                        reason: { type: "string" },
                        isHotMatch: { type: "boolean" },
                      },
                      required: ["buyerName", "score", "reason", "isHotMatch"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_matches" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let matches;
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      matches = parsed.matches;
    } else {
      // Fallback: try parsing content as JSON
      const content = aiData.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      matches = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("buyer-match error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
