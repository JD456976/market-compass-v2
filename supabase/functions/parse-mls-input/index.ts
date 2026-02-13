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
    // Authenticate the caller
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
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, content, reportType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a real estate MLS listing data extractor. Extract structured property data from user input.

Extract these fields when available:
- location: Full address or city/state
- propertyType: One of "SFH", "Condo", "Townhouse", "Multi-Family", "Land", "Commercial"
- condition: One of "Renovated", "Updated", "Maintained", "Dated"
- listPrice: Number (just the numeric value, no formatting)
- daysOnMarket: Number
- notes: Any additional relevant details as a brief string

Only return fields you can confidently extract. Omit uncertain fields.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (type === "image") {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract MLS listing data from this image for a ${reportType} report. Look for address, price, property type, days on market, condition, and any relevant details.`,
          },
          {
            type: "image_url",
            image_url: { url: content },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Extract MLS listing data from this spoken description for a ${reportType} report:\n\n"${content}"`,
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: type === "image" ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview",
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "extract_listing_data",
                description: "Extract structured MLS listing data from input.",
                parameters: {
                  type: "object",
                  properties: {
                    location: { type: "string", description: "Property address or city/state" },
                    propertyType: { type: "string", enum: ["SFH", "Condo", "Townhouse", "Multi-Family", "Land", "Commercial"] },
                    condition: { type: "string", enum: ["Renovated", "Updated", "Maintained", "Dated"] },
                    listPrice: { type: "number", description: "List price as a number" },
                    daysOnMarket: { type: "number", description: "Days on market" },
                    notes: { type: "string", description: "Additional relevant details" },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const extracted = JSON.parse(toolCall.function.arguments);
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(extracted)) {
        if (value !== null && value !== undefined && value !== '') {
          cleaned[key] = value;
        }
      }
      return new Response(JSON.stringify({ extracted: cleaned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("parse-mls-input error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
