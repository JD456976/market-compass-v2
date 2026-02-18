import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FUB_API_BASE = 'https://api.followupboss.com/v1';

// Push a contact note / event to FUB representing a market analysis
async function pushMarketAnalysisToFUB(apiKey: string, payload: {
  zip: string;
  cityState: string | null;
  opportunityScore: number;
  leadType: string;
  topFactor: string;
  briefText: string;
  previousScore: number | null;
}) {
  const authHeader = 'Basic ' + btoa(apiKey + ':');

  // 1. Create or find a "MarketCompass Lead Finder" event in FUB
  const eventBody = {
    type: 'Market Analysis',
    source: 'MarketCompass Lead Finder',
    note: payload.briefText,
    tags: [
      `MC:${payload.leadType}-market`,
      `MC:score-${payload.opportunityScore}`,
      `MC:zip-${payload.zip}`,
    ],
  };

  const eventsRes = await fetch(`${FUB_API_BASE}/events`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!eventsRes.ok) {
    const errText = await eventsRes.text();
    throw new Error(`FUB events API error [${eventsRes.status}]: ${errText}`);
  }

  const eventData = await eventsRes.json();

  // 2. If score changed significantly, create a task for the agent
  if (payload.previousScore !== null) {
    const delta = payload.opportunityScore - payload.previousScore;
    const absDelta = Math.abs(delta);

    // Only create task if score changed by >= threshold (handled by caller)
    const taskBody = {
      name: `MarketCompass Alert: ${payload.zip}${payload.cityState ? ` (${payload.cityState})` : ''} score ${delta > 0 ? 'up' : 'down'} ${absDelta} pts`,
      note: `Score changed from ${payload.previousScore} → ${payload.opportunityScore} (${delta > 0 ? '+' : ''}${delta} pts). Lead type: ${payload.leadType}. Top signal: ${payload.topFactor}. Review now: MarketCompass Lead Finder.`,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due tomorrow
    };

    await fetch(`${FUB_API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(taskBody),
    });
  }

  return { success: true, eventId: eventData.id };
}

// Push a bulk CSV-scored lead list to FUB as contacts with tags
async function pushCSVLeadsToFUB(apiKey: string, leads: Array<{
  address: string;
  zip: string;
  score: number | null;
  leadType: string | null;
  topSignal: string | null;
}>) {
  const authHeader = 'Basic ' + btoa(apiKey + ':');
  const highScoreLeads = leads.filter(l => l.score !== null && l.score >= 71);

  const results = [];
  for (const lead of highScoreLeads.slice(0, 50)) { // Safety cap
    const personBody = {
      name: lead.address,
      tags: [
        'MarketCompass Import',
        `MC:${lead.leadType ?? 'unknown'}-market`,
        `MC:score-${lead.score}`,
        `MC:zip-${lead.zip}`,
      ],
      source: 'MarketCompass Lead Finder',
    };

    const res = await fetch(`${FUB_API_BASE}/people`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(personBody),
    });

    if (res.ok) {
      const data = await res.json();
      results.push({ address: lead.address, fubId: data.id, success: true });
    } else {
      results.push({ address: lead.address, success: false });
    }
  }

  return { success: true, pushed: results.length, results };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { action, apiKey, ...rest } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: 'action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate API key by hitting FUB /me ───────────────────────────────
    if (action === 'validate') {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'apiKey is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const testRes = await fetch(`${FUB_API_BASE}/me`, {
        headers: {
          Authorization: 'Basic ' + btoa(apiKey + ':'),
          Accept: 'application/json',
        },
      });
      if (!testRes.ok) {
        return new Response(JSON.stringify({ valid: false, error: 'Invalid API key or FUB account not accessible' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const me = await testRes.json();

      // Save connection to DB — store only hint (last 4 chars)
      const hint = apiKey.slice(-4);
      await supabase
        .from('crm_connections')
        .upsert({
          user_id: user.id,
          crm_type: 'follow_up_boss',
          api_key_hint: hint,
          is_active: true,
        }, { onConflict: 'user_id,crm_type' });

      // Store actual API key as a Supabase secret (per-user, via metadata)
      // We store it in user metadata since we can't create per-user secrets
      // The edge function will read it from there
      await supabase.auth.updateUser({
        data: { fub_api_key: apiKey },
      });

      return new Response(JSON.stringify({ valid: true, account: me.name || me.email || 'Connected', hint }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For all other actions, retrieve the stored API key from user metadata
    const { data: { user: fullUser } } = await supabase.auth.getUser(token);
    const storedApiKey = fullUser?.user_metadata?.fub_api_key;

    if (!storedApiKey) {
      return new Response(JSON.stringify({ error: 'No Follow Up Boss API key configured. Please connect your account first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Push market analysis ──────────────────────────────────────────────
    if (action === 'push_analysis') {
      const result = await pushMarketAnalysisToFUB(storedApiKey, rest);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Push CSV leads ────────────────────────────────────────────────────
    if (action === 'push_csv_leads') {
      const { leads } = rest;
      if (!Array.isArray(leads)) {
        return new Response(JSON.stringify({ error: 'leads array is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await pushCSVLeadsToFUB(storedApiKey, leads);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Disconnect ────────────────────────────────────────────────────────
    if (action === 'disconnect') {
      await supabase
        .from('crm_connections')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('crm_type', 'follow_up_boss');

      await supabase.auth.updateUser({
        data: { fub_api_key: null },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('FUB integration error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
