import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify the caller's token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured — emails will remain queued.");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "No email provider configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch up to 20 queued emails
    const { data: emails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "queued")
      .neq("to_email", "client@pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error("Failed to fetch email queue:", fetchError);
      throw new Error("Queue fetch failed");
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "No emails to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const email of emails) {
      try {
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Market Compass <notifications@resend.dev>";

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email.to_email],
            subject: email.subject,
            html: email.body_html,
            text: email.body_text || undefined,
          }),
        });

        if (res.ok) {
          await supabase
            .from("email_queue")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", email.id);
          sentCount++;
        } else {
          const errBody = await res.text();
          console.error(`Resend error for ${email.id}:`, res.status, errBody);
          await supabase
            .from("email_queue")
            .update({ status: "failed", error: `${res.status}: ${errBody.substring(0, 200)}` })
            .eq("id", email.id);
          errorCount++;
        }
      } catch (sendErr) {
        console.error(`Send error for ${email.id}:`, sendErr);
        await supabase
          .from("email_queue")
          .update({
            status: "failed",
            error: sendErr instanceof Error ? sendErr.message : "Unknown send error",
          })
          .eq("id", email.id);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors: errorCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-emails error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
