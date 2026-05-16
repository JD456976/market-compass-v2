import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  const supabaseUrl =
    Netlify.env.get("VITE_SUPABASE_URL") || Netlify.env.get("SUPABASE_URL") ||
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL ||
    "https://iodskpvxyvrtfuhnxnne.supabase.co";

  const anonKey =
    Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Netlify.env.get("VITE_SUPABASE_ANON_KEY") ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZHNrcHZ4eXZydGZ1aG54bm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTIwMDcsImV4cCI6MjA5NDQ2ODAwN30.5RAHvPtzOGMT-_C6PEmyooQJ24ePTSBGOgA3_YIFjv0";

  if (!supabaseUrl || !anonKey) {
    return new Response(
      JSON.stringify({ error: "Server not configured — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from Netlify env vars" }),
      { status: 500, headers: CORS }
    );
  }

  // Uses anon key only — no service role key required.
  // Profile upsert goes through admin_grant_beta_access() SECURITY DEFINER RPC.
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { email, name, days } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email required" }), { status: 400, headers: CORS });
    }

    const accessDays = Math.max(1, Math.min(365, parseInt(days) || 30));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + accessDays);

    // 1. Send magic link (creates user if new, sends new link if existing)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: name || "",
          beta_access_days: accessDays,
        },
      },
    });

    if (otpError) {
      throw otpError;
    }

    // 2. Grant beta access via security definer RPC (bypasses RLS, no service role needed)
    const { error: rpcError } = await supabase.rpc("admin_grant_beta_access", {
      p_email: email.toLowerCase(),
      p_name: name || "",
      p_days: accessDays,
    });

    if (rpcError) {
      // Non-fatal — magic link was already sent. Log and continue.
      console.error("admin_grant_beta_access RPC error (non-fatal):", rpcError.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Invite sent to ${email}. They'll receive a sign-in link via email. Access: ${accessDays} days.`,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200, headers: CORS }
    );
  } catch (e: any) {
    console.error("invite-user error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Invite failed" }),
      { status: 500, headers: CORS }
    );
  }
};

export const config: Config = {
  path: "/api/invite-user",
};
