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
    const { context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a real estate market analyst providing concise, actionable insights for a ${context.reportType} report. 

Rules:
- Return EXACTLY 3-4 insights as a JSON array of strings
- Each insight should be 1-2 sentences, specific and data-driven
- Use probabilistic language ("tends to", "typically", "may") — never guarantees
- Reference the specific numbers from the context (prices, percentages, days)
- Focus on strategic actionable information the agent can use
- Do NOT repeat what's already obvious from the report data
- Do NOT give generic advice — make it specific to THIS situation
- Include comparisons to market norms when relevant`;

    const userPrompt = buildUserPrompt(context);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                name: "return_insights",
                description: "Return 3-4 market insights for this report.",
                parameters: {
                  type: "object",
                  properties: {
                    insights: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 3,
                      maxItems: 4,
                    },
                  },
                  required: ["insights"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_insights" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add AI credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ insights: parsed.insights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        const insights = Array.isArray(parsed) ? parsed : parsed.insights;
        if (Array.isArray(insights)) {
          return new Response(JSON.stringify({ insights }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {
        // Not JSON, split by newlines
        const lines = content
          .split("\n")
          .map((l: string) => l.replace(/^\d+\.\s*/, "").replace(/^[-•]\s*/, "").trim())
          .filter((l: string) => l.length > 20);
        if (lines.length >= 2) {
          return new Response(JSON.stringify({ insights: lines.slice(0, 4) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("ai-report-insights error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildUserPrompt(ctx: Record<string, any>): string {
  const parts: string[] = [];
  parts.push(`Report type: ${ctx.reportType}`);
  parts.push(`Location: ${ctx.location}`);
  parts.push(`Property type: ${ctx.propertyType}, Condition: ${ctx.condition}`);
  parts.push(`Current likelihood assessment: ${ctx.likelihood}`);

  if (ctx.reportType === "buyer") {
    parts.push(`Offer price: $${ctx.offerPrice?.toLocaleString()}`);
    if (ctx.referencePrice) parts.push(`Reference/list price: $${ctx.referencePrice?.toLocaleString()}`);
    if (ctx.offerPrice && ctx.referencePrice) {
      const ratio = (ctx.offerPrice / ctx.referencePrice * 100).toFixed(1);
      parts.push(`Offer-to-reference ratio: ${ratio}%`);
    }
    parts.push(`Financing: ${ctx.financingType}, Down payment: ${ctx.downPayment}`);
    parts.push(`Contingencies: ${ctx.contingencies?.join(", ") || "None"}`);
    parts.push(`Closing timeline: ${ctx.closingTimeline} days`);
    parts.push(`Buyer preference: ${ctx.buyerPreference}`);
    if (ctx.marketConditions) parts.push(`Market conditions: ${ctx.marketConditions}`);
    if (ctx.daysOnMarket) parts.push(`Days on market: ${ctx.daysOnMarket}`);
  } else {
    parts.push(`List price: $${ctx.listPrice?.toLocaleString()}`);
    parts.push(`Desired timeframe: ${ctx.timeframe} days`);
    parts.push(`Strategy: ${ctx.strategy}`);
  }

  if (ctx.snapshotLocation) {
    parts.push(`\nMarket data for ${ctx.snapshotLocation}:`);
    parts.push(`- Median DOM: ${ctx.medianDOM} days`);
    parts.push(`- Sale-to-list ratio: ${(ctx.saleToListRatio * 100).toFixed(0)}%`);
    parts.push(`- Inventory: ${ctx.inventorySignal}`);
    if (ctx.isGenericBaseline) parts.push("(Using generic baseline — not location-specific data)");
  }

  return parts.join("\n");
}
