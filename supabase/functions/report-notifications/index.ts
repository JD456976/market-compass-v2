import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailPayload {
  to_email: string;
  subject: string;
  body_html: string;
  body_text?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller's token
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      type,
      report_id,
      sender_name,
      message_snippet,
      report_url,
      scenario_title,
    } = await req.json();

    // Get report info
    const { data: session } = await supabase
      .from("sessions")
      .select("client_name, owner_user_id, share_token")
      .eq("id", report_id)
      .single();

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Report not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailPayload: EmailPayload | null = null;

    if (type === "agent_reply") {
      emailPayload = {
        to_email: "client@pending",
        subject: `New reply on your ${session.client_name} report`,
        body_html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3a4f;">New Reply from Your Agent</h2>
            <p>Your agent has replied on the report for <strong>${session.client_name}</strong>.</p>
            ${message_snippet ? `<blockquote style="border-left: 3px solid #c8842e; padding-left: 12px; color: #666;">${message_snippet}</blockquote>` : ""}
            ${report_url ? `<p><a href="${report_url}" style="display: inline-block; padding: 10px 20px; background: #2d3a4f; color: white; text-decoration: none; border-radius: 6px;">View Report</a></p>` : ""}
          </div>
        `,
        body_text: `Your agent replied on the report for ${session.client_name}. ${message_snippet || ""}`,
        metadata: { type, report_id, sender_name },
      };
    } else if (type === "client_message") {
      let agentEmail = "agent@pending";
      if (session.owner_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", session.owner_user_id)
          .single();
        if (profile?.email) agentEmail = profile.email;
      }

      emailPayload = {
        to_email: agentEmail,
        subject: `Client note on ${session.client_name} report`,
        body_html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3a4f;">New Client Message</h2>
            <p><strong>${sender_name || "A client"}</strong> left a note on the <strong>${session.client_name}</strong> report.</p>
            ${message_snippet ? `<blockquote style="border-left: 3px solid #c8842e; padding-left: 12px; color: #666;">${message_snippet}</blockquote>` : ""}
          </div>
        `,
        body_text: `${sender_name || "A client"} left a note on the ${session.client_name} report. ${message_snippet || ""}`,
        metadata: { type, report_id, sender_name },
      };
    } else if (type === "scenario_submitted") {
      let agentEmail = "agent@pending";
      if (session.owner_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", session.owner_user_id)
          .single();
        if (profile?.email) agentEmail = profile.email;
      }

      emailPayload = {
        to_email: agentEmail,
        subject: `Scenario submitted for review: ${session.client_name}`,
        body_html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3a4f;">Scenario Submitted for Review</h2>
            <p>A client has submitted a scenario${scenario_title ? ` "<strong>${scenario_title}</strong>"` : ""} for the <strong>${session.client_name}</strong> report.</p>
            <p>Log in to your dashboard to review it.</p>
          </div>
        `,
        body_text: `A client submitted a scenario${scenario_title ? ` "${scenario_title}"` : ""} for the ${session.client_name} report.`,
        metadata: { type, report_id, scenario_title },
      };
    } else if (type === "scenario_reviewed") {
      emailPayload = {
        to_email: "client@pending",
        subject: `Your scenario has been reviewed: ${session.client_name}`,
        body_html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3a4f;">Scenario Review Update</h2>
            <p>Your agent has reviewed the scenario you submitted for the <strong>${session.client_name}</strong> report.</p>
            ${report_url ? `<p><a href="${report_url}" style="display: inline-block; padding: 10px 20px; background: #2d3a4f; color: white; text-decoration: none; border-radius: 6px;">View Report</a></p>` : ""}
          </div>
        `,
        body_text: `Your agent reviewed the scenario for the ${session.client_name} report.`,
        metadata: { type, report_id },
      };
    }

    if (emailPayload) {
      const { error: queueError } = await supabase
        .from("email_queue")
        .insert(emailPayload);

      if (queueError) {
        console.error("Failed to queue email:", queueError);
        return new Response(
          JSON.stringify({ success: true, email_queued: false, error: queueError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        fetch(`${supabaseUrl}/functions/v1/send-emails`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }).catch((e) => console.log("Fire-and-forget send-emails:", e));
      } catch (_) {
        // Non-critical
      }

      return new Response(
        JSON.stringify({ success: true, email_queued: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, email_queued: false, reason: "Unknown notification type" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
