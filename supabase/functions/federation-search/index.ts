import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentEmail = user.email;
    if (!agentEmail) {
      return new Response(JSON.stringify({ error: "No email in token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const federationSecret = Deno.env.get("FEDERATION_SECRET");
    if (!federationSecret) {
      throw new Error("FEDERATION_SECRET is not configured");
    }

    const dealPilotUrl = Deno.env.get("DEAL_PILOT_SUPABASE_URL");
    if (!dealPilotUrl) {
      throw new Error("DEAL_PILOT_SUPABASE_URL is not configured");
    }

    const trimmedBase = dealPilotUrl.trim().replace(/\/+$/, "");
    const withoutFunctionsPath = trimmedBase.includes("/functions/v1")
      ? trimmedBase.split("/functions/v1")[0]
      : trimmedBase;
    const normalizedBase = withoutFunctionsPath.replace(".supabase.com", ".supabase.co");

    const endpoint = `${normalizedBase}/functions/v1/federation-api`;
    console.log(`Calling Deal Pilot federation API: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-federation-secret": federationSecret,
      },
      body: JSON.stringify({
        action: "search_clients",
        agent_email: agentEmail,
        query,
      }),
    });

    const responseText = await response.text();
    console.log(`Deal Pilot response status: ${response.status}, body preview: ${responseText.substring(0, 200)}`);

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Deal Pilot returned non-JSON response:", responseText.substring(0, 500));
      return new Response(JSON.stringify({ 
        error: "Deal Pilot federation endpoint is not available. Make sure the federation-api function is deployed on Deal Pilot." 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Federation search error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
