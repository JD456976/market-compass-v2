import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

const OWNER_EMAILS = [
  "craig219@comcast.net",
  "jason.craig@chinattirealty.com",
  "jdog45@gmail.com",
  "claude.dev@chinattirealty.com",
];

async function tryDelete(
  client: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string
): Promise<void> {
  try { await (client.from(table as any).delete() as any).eq(column, value); } catch { /* ok */ }
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });

  // Support all likely env var name variants with process.env fallbacks
  const supabaseUrl =
    Netlify.env.get("VITE_SUPABASE_URL") || Netlify.env.get("SUPABASE_URL") ||
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

  const serviceRoleKey =
    Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY") || Netlify.env.get("SERVICE_ROLE_KEY") ||
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

  const anonKey =
    Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Netlify.env.get("VITE_SUPABASE_ANON_KEY") ||
    Netlify.env.get("SUPABASE_ANON_KEY") ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return new Response(
      JSON.stringify({ error: "Supabase not configured — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from Netlify env vars" }),
      { status: 500, headers: CORS }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader)
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

  try {
    const { userId, profileId } = await req.json();
    if (!userId)
      return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: CORS });

    // Verify caller identity + admin status
    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    // Check admin via RPC first, fall back to owner email list
    let isAdmin = false;
    try {
      const { data } = await callerClient.rpc("is_admin_user");
      isAdmin = !!data;
    } catch { /* RPC may not exist */ }

    if (!isAdmin) {
      isAdmin = OWNER_EMAILS.some(e => e.toLowerCase() === caller.email?.toLowerCase());
    }
    if (!isAdmin)
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: CORS });

    if (userId === caller.id)
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), { status: 400, headers: CORS });

    // Full delete with service role key
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Clean up MC-specific tables
      await tryDelete(adminClient, "beta_activations", "user_id", userId);
      await tryDelete(adminClient, "owner_devices", "user_id", userId);
      await tryDelete(adminClient, "user_roles", "user_id", userId);

      // Hard delete profile row
      if (profileId) {
        await adminClient.from("profiles").delete().eq("id", profileId);
      } else {
        await adminClient.from("profiles").delete().eq("user_id", userId);
      }

      // Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("Auth delete failed:", deleteError.message);
        return new Response(
          JSON.stringify({ ok: true, warning: "Profile removed but Supabase auth account could not be deleted: " + deleteError.message }),
          { status: 200, headers: CORS }
        );
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
    }

    // No service role key — hard-delete profile row + revoke access using caller's JWT
    // (relies on admin-level RLS policies)
    if (profileId) {
      await callerClient.from("profiles" as any).delete().eq("id", profileId);
    } else {
      await callerClient.from("profiles" as any).delete().eq("user_id", userId);
    }
    await tryDelete(callerClient, "user_roles", "user_id", userId);

    return new Response(
      JSON.stringify({
        ok: true,
        warning: "Profile and access removed. Add SUPABASE_SERVICE_ROLE_KEY to Netlify env vars to also delete the Supabase auth account.",
      }),
      { status: 200, headers: CORS }
    );

  } catch (e: any) {
    console.error("delete-user error:", e);
    return new Response(JSON.stringify({ error: e.message || "Delete failed" }), { status: 500, headers: CORS });
  }
};

export const config: Config = {
  path: "/api/delete-user",
};
