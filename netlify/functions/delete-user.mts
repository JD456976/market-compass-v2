import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });

  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL");
  const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

  // Verify the calling user is an admin via their JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

  try {
    const { userId, profileId } = await req.json();
    if (!userId) return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: CORS });

    // Verify caller is admin via Supabase RPC
    const callerClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });
    const { data: isAdmin, error: adminError } = await callerClient.rpc('is_admin_user');
    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: CORS });
    }

    // If we have service role key, do a full delete
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl!, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

      // Delete profile first (FK constraint)
      if (profileId) await adminClient.from("profiles").delete().eq("id", profileId);

      // Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ ok: true, full_delete: true }), { status: 200, headers: CORS });
    }

    // Fallback: no service role key — hard-revoke access
    const revokeClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });
    await revokeClient.from("profiles").update({
      beta_access_active: false,
      beta_access_expires_at: new Date(0).toISOString(),
      is_deleted: true,
    }).eq("user_id", userId);

    return new Response(JSON.stringify({ ok: true, full_delete: false, note: "Access revoked — add SUPABASE_SERVICE_ROLE_KEY to Netlify env for full auth deletion" }), { status: 200, headers: CORS });

  } catch (e: any) {
    console.error("delete-user error:", e);
    return new Response(JSON.stringify({ error: e.message || "Delete failed" }), { status: 500, headers: CORS });
  }
};

export const config: Config = {
  path: "/api/delete-user",
};
