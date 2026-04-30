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

async function tryDelete(client: ReturnType<typeof createClient>, table: string, col: string, val: string) {
  try { await (client.from(table as any).delete() as any).eq(col, val); } catch { /* ok */ }
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });

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

  if (!supabaseUrl || !anonKey)
    return new Response(
      JSON.stringify({ error: "Supabase not configured — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from Netlify env vars" }),
      { status: 500, headers: CORS }
    );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader)
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

  try {
    const { userId, profileId } = await req.json();
    if (!userId)
      return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: CORS });

    // Verify caller identity and admin status
    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    if (userId === caller.id)
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), { status: 400, headers: CORS });

    // Check admin via RPC, fall back to owner email list
    let isAdmin = false;
    try {
      const { data } = await callerClient.rpc("is_admin_user");
      isAdmin = !!data;
    } catch { /* RPC may not exist in this project */ }
    if (!isAdmin)
      isAdmin = OWNER_EMAILS.some(e => e.toLowerCase() === caller.email?.toLowerCase());
    if (!isAdmin)
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: CORS });

    // ── Full delete path (requires service role key) ──────────────────────────
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Clean up related tables
      await tryDelete(adminClient, "beta_activations", "user_id", userId);
      await tryDelete(adminClient, "owner_devices", "user_id", userId);
      await tryDelete(adminClient, "user_roles", "user_id", userId);
      await tryDelete(adminClient, "user_entitlements", "user_id", userId);

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
          JSON.stringify({ ok: true, warning: `Profile removed. Supabase auth account could not be deleted: ${deleteError.message}` }),
          { status: 200, headers: CORS }
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
    }

    // ── Fallback: no service role key ─────────────────────────────────────────
    // Try 1: hard DELETE using caller's JWT (works if RLS policy allows admin delete)
    // NOTE: Supabase RLS silently blocks deletes (no error, just 0 rows affected)
    // We use the Prefer: return=representation header to detect 0 rows deleted
    let hardDeleteWorked = false;
    try {
      const deleteQuery = profileId
        ? callerClient.from("profiles" as any).delete().eq("id", profileId).select("id")
        : callerClient.from("profiles" as any).delete().eq("user_id", userId).select("id");
      const { data: deleted, error: delErr } = await (deleteQuery as any);
      if (!delErr && deleted && (deleted as any[]).length > 0) {
        hardDeleteWorked = true;
      } else if (!delErr) {
        console.log("Hard DELETE: no error but 0 rows deleted (RLS silently blocked)");
      } else {
        console.log("Hard DELETE failed:", delErr.message);
      }
    } catch (e) {
      console.log("Hard DELETE threw:", e);
    }

    if (hardDeleteWorked) {
      // Also clean up roles + entitlements
      await tryDelete(callerClient, "user_roles", "user_id", userId);
      await tryDelete(callerClient, "user_entitlements", "user_id", userId);
      return new Response(
        JSON.stringify({ ok: true, warning: "Profile deleted. Add SUPABASE_SERVICE_ROLE_KEY to Netlify env vars to also remove the Supabase auth account." }),
        { status: 200, headers: CORS }
      );
    }

    // Try 2: soft-mark via UPDATE — sets beta_access_source = 'admin_deleted'
    // The frontend filters these out, so the user effectively disappears
    const softMarkPayload = {
      beta_access_active: false,
      beta_access_expires_at: new Date(0).toISOString(),
      beta_access_source: "admin_deleted",
      is_suspended: true,
    };

    let softMarkWorked = false;
    try {
      const updateQuery = profileId
        ? callerClient.from("profiles" as any).update(softMarkPayload as any).eq("id", profileId)
        : callerClient.from("profiles" as any).update(softMarkPayload as any).eq("user_id", userId);
      const { error: updateErr } = await (updateQuery as any);
      if (!updateErr) softMarkWorked = true;
      else console.log("Soft-mark UPDATE failed:", updateErr.message);
    } catch (e) {
      console.log("Soft-mark threw:", e);
    }

    if (softMarkWorked) {
      await tryDelete(callerClient, "user_roles", "user_id", userId);
      await tryDelete(callerClient, "user_entitlements", "user_id", userId);
      return new Response(
        JSON.stringify({ ok: true, warning: "User access revoked and hidden from admin panel. Add SUPABASE_SERVICE_ROLE_KEY to Netlify env vars for full permanent deletion." }),
        { status: 200, headers: CORS }
      );
    }

    // All approaches failed — return a real error
    return new Response(
      JSON.stringify({ error: "Could not delete or revoke this user — Supabase RLS is blocking the operation. Please add SUPABASE_SERVICE_ROLE_KEY to your Netlify environment variables." }),
      { status: 500, headers: CORS }
    );

  } catch (e: any) {
    console.error("delete-user error:", e);
    return new Response(JSON.stringify({ error: e.message || "Delete failed" }), { status: 500, headers: CORS });
  }
};

export const config: Config = { path: "/api/delete-user" };
