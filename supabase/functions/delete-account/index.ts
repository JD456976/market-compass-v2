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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user's token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Use service role to delete all user data
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user's sessions (and cascading data like messages, notes, scenarios, views, feedback)
    await adminClient.from("report_messages").delete().eq("sender_id", userId);
    await adminClient.from("report_scenarios").delete().eq("created_by_id", userId);
    
    // Delete sessions owned by user
    const { data: userSessions } = await adminClient
      .from("sessions")
      .select("id")
      .eq("owner_user_id", userId);

    if (userSessions && userSessions.length > 0) {
      const sessionIds = userSessions.map((s) => s.id);
      await adminClient.from("report_messages").delete().in("report_id", sessionIds);
      await adminClient.from("report_notes").delete().in("report_id", sessionIds);
      await adminClient.from("report_scenarios").delete().in("report_id", sessionIds);
      await adminClient.from("report_feedback").delete().in("report_id", sessionIds);
      await adminClient.from("shared_report_views").delete().in("report_id", sessionIds);
      await adminClient.from("property_documents").delete().in("session_id", sessionIds);
      await adminClient.from("sessions").delete().eq("owner_user_id", userId);
    }

    // Delete client relationships
    await adminClient.from("agent_clients").delete().eq("agent_user_id", userId);
    await adminClient.from("agent_clients").delete().eq("client_user_id", userId);
    await adminClient.from("client_invitations").delete().eq("agent_user_id", userId);

    // Delete branding & profiles
    await adminClient.from("agent_branding").delete().eq("user_id", userId);
    await adminClient.from("market_profiles").delete().eq("owner_user_id", userId);
    await adminClient.from("market_scenarios").delete().eq("owner_user_id", userId);
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
