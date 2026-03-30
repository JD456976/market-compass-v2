import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { medianPrice, priceChange, dom, listToSale, activeListings, monthsSupply, marketCondition, audience } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a senior real estate copywriter. You receive market statistics and produce exactly 3 pieces of content in a single JSON response. Never fabricate data — only cite the numbers given.`;

    const userPrompt = `Market stats:
- Median Sale Price: $${medianPrice}
- Price Change (YoY): ${priceChange}
- Days on Market: ${dom}
- List-to-Sale Ratio: ${listToSale}
- Active Listings: ${activeListings}
- Months of Supply: ${monthsSupply}
- Market Condition: ${marketCondition}

Write for: ${audience || "Buyers & Sellers"}

Return a JSON object with exactly these 3 keys:
1. "email" — a 180-220 word professional market update email ending with a soft CTA inviting the reader to reach out. Include a subject line at the top.
2. "social" — an 80-100 word punchy social media post with 4-5 relevant hashtags at the end.
3. "summary" — a single sentence of 20-35 words capturing the key market takeaway.

Respond ONLY with the JSON object, no markdown fences, no commentary.`;

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
              name: "return_narrative",
              description: "Return the 3 narrative pieces as structured JSON",
              parameters: {
                type: "object",
                properties: {
                  email: { type: "string", description: "180-220 word professional email with subject line and soft CTA" },
                  social: { type: "string", description: "80-100 word social media post with 4-5 hashtags" },
                  summary: { type: "string", description: "Single sentence 20-35 word key takeaway" },
                },
                required: ["email", "social", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_narrative" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse AI response:", content);
        return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("market-narrative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
