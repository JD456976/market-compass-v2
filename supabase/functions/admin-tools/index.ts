import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAILS = [
  "jason.craig@chinattirealty.com",
  "jdog45@gmail.com",
];

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

    // Verify the calling user is admin
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

    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    switch (action) {
      case "wipe_database": {
        return await wipeDatabase(adminClient, user.id);
      }
      case "create_reviewer": {
        return await createReviewer(adminClient, params, user.id);
      }
      case "list_reviewers": {
        return await listReviewers(adminClient);
      }
      case "delete_reviewer": {
        return await deleteReviewer(adminClient, params.reviewer_user_id);
      }
      case "generate_demo_data": {
        return await generateDemoData(adminClient, params.agent_user_id);
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("admin-tools error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Wipe Database ──────────────────────────────────────────────────────────

async function wipeDatabase(adminClient: ReturnType<typeof createClient>, adminUserId: string) {
  const log: string[] = [];

  try {
    // Get all users except admin
    const { data: allUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const usersToDelete = (allUsers?.users || []).filter(u => u.id !== adminUserId);

    // Delete ALL data from dependent tables first (order matters for FK constraints)
    // Use a dummy filter that matches everything: gt("id", "00000000-...")
    const tablesToWipe = [
      "report_messages",
      "report_notes",
      "report_scenarios",
      "report_feedback",
      "shared_report_views",
      "property_documents",
      "email_queue",
    ];

    for (const table of tablesToWipe) {
      const { error } = await adminClient.from(table).delete().gt("created_at", "1970-01-01");
      if (error) log.push(`Warning: ${table}: ${error.message}`);
      else log.push(`Cleared ${table}`);
    }

    // Delete ALL sessions (including admin's)
    const { error: sessErr } = await adminClient.from("sessions").delete().gt("created_at", "1970-01-01");
    if (sessErr) log.push(`Warning: sessions: ${sessErr.message}`);
    else log.push("Cleared ALL sessions");

    // Delete ALL client relationships
    await adminClient.from("agent_clients").delete().gt("created_at", "1970-01-01");
    log.push("Cleared agent_clients");

    await adminClient.from("client_invitations").delete().gt("created_at", "1970-01-01");
    log.push("Cleared client_invitations");

    // Delete branding/market data for ALL users (including admin)
    await adminClient.from("agent_branding").delete().gt("created_at", "1970-01-01");
    log.push("Cleared agent_branding");

    await adminClient.from("market_profiles").delete().gt("created_at", "1970-01-01");
    log.push("Cleared market_profiles");

    await adminClient.from("market_scenarios").delete().eq("is_built_in", false);
    log.push("Cleared custom market_scenarios");

    // Delete profiles & roles for non-admin users only (keep admin account)
    for (const u of usersToDelete) {
      await adminClient.from("user_roles").delete().eq("user_id", u.id);
      await adminClient.from("profiles").delete().eq("user_id", u.id);
    }
    log.push(`Cleared profiles/roles for ${usersToDelete.length} users`);

    // Delete auth users
    let deleteCount = 0;
    for (const u of usersToDelete) {
      const { error: delErr } = await adminClient.auth.admin.deleteUser(u.id);
      if (!delErr) deleteCount++;
      else log.push(`Warning: Could not delete user ${u.email}: ${delErr.message}`);
    }
    log.push(`Deleted ${deleteCount} auth users`);

    return jsonResponse({ success: true, log });
  } catch (err) {
    log.push(`Error: ${String(err)}`);
    return jsonResponse({ success: false, log }, 500);
  }
}

// ─── Create Reviewer ────────────────────────────────────────────────────────

async function createReviewer(
  adminClient: ReturnType<typeof createClient>,
  params: { email: string; password: string; full_name: string; role: "agent" | "client"; agent_user_id?: string },
  adminUserId: string
) {
  const { email, password, full_name, role, agent_user_id } = params;

  if (!email || !password || !full_name || !role) {
    return jsonResponse({ error: "Missing required fields: email, password, full_name, role" }, 400);
  }

  // Create auth user
  const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm for reviewers
    user_metadata: { full_name, is_reviewer: true },
  });

  if (createErr) {
    return jsonResponse({ error: `Failed to create user: ${createErr.message}` }, 400);
  }

  const userId = newUser.user.id;

  // Create profile
  await adminClient.from("profiles").insert({
    user_id: userId,
    email,
    full_name,
    email_verified: true,
  });

  // Assign role
  await adminClient.from("user_roles").insert({
    user_id: userId,
    role: role as string,
  });

  // If client role, link to specified agent (or admin)
  if (role === "client" && agent_user_id) {
    await adminClient.from("agent_clients").insert({
      agent_user_id,
      client_user_id: userId,
    });
  }

  return jsonResponse({
    success: true,
    user: { id: userId, email, full_name, role },
  });
}

// ─── List Reviewers ─────────────────────────────────────────────────────────

async function listReviewers(adminClient: ReturnType<typeof createClient>) {
  // Get all users with is_reviewer metadata
  const { data: allUsers, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const reviewers = (allUsers?.users || [])
    .filter(u => u.user_metadata?.is_reviewer === true)
    .map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || "",
      created_at: u.created_at,
    }));

  // Get roles for reviewers
  const reviewerIds = reviewers.map(r => r.id);
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", reviewerIds.length > 0 ? reviewerIds : ["none"]);

  const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));

  return jsonResponse({
    reviewers: reviewers.map(r => ({
      ...r,
      role: roleMap.get(r.id) || "unknown",
    })),
  });
}

// ─── Delete Reviewer ────────────────────────────────────────────────────────

async function deleteReviewer(adminClient: ReturnType<typeof createClient>, reviewerUserId: string) {
  if (!reviewerUserId) {
    return jsonResponse({ error: "Missing reviewer_user_id" }, 400);
  }

  // Verify this is actually a reviewer
  const { data: userData } = await adminClient.auth.admin.getUserById(reviewerUserId);
  if (!userData?.user?.user_metadata?.is_reviewer) {
    return jsonResponse({ error: "User is not a reviewer account" }, 400);
  }

  // Delete all related data
  await adminClient.from("report_messages").delete().eq("sender_id", reviewerUserId);
  await adminClient.from("report_scenarios").delete().eq("created_by_id", reviewerUserId);

  const { data: userSessions } = await adminClient
    .from("sessions")
    .select("id")
    .eq("owner_user_id", reviewerUserId);

  if (userSessions && userSessions.length > 0) {
    const sessionIds = userSessions.map(s => s.id);
    await adminClient.from("report_messages").delete().in("report_id", sessionIds);
    await adminClient.from("report_notes").delete().in("report_id", sessionIds);
    await adminClient.from("report_scenarios").delete().in("report_id", sessionIds);
    await adminClient.from("report_feedback").delete().in("report_id", sessionIds);
    await adminClient.from("shared_report_views").delete().in("report_id", sessionIds);
    await adminClient.from("property_documents").delete().in("session_id", sessionIds);
    await adminClient.from("sessions").delete().eq("owner_user_id", reviewerUserId);
  }

  await adminClient.from("agent_clients").delete().eq("agent_user_id", reviewerUserId);
  await adminClient.from("agent_clients").delete().eq("client_user_id", reviewerUserId);
  await adminClient.from("client_invitations").delete().eq("agent_user_id", reviewerUserId);
  await adminClient.from("agent_branding").delete().eq("user_id", reviewerUserId);
  await adminClient.from("market_profiles").delete().eq("owner_user_id", reviewerUserId);
  await adminClient.from("market_scenarios").delete().eq("owner_user_id", reviewerUserId);
  await adminClient.from("user_roles").delete().eq("user_id", reviewerUserId);
  await adminClient.from("profiles").delete().eq("user_id", reviewerUserId);

  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(reviewerUserId);
  if (deleteErr) {
    return jsonResponse({ error: `Failed to delete auth user: ${deleteErr.message}` }, 500);
  }

  return jsonResponse({ success: true });
}

// ─── Generate Demo Data ─────────────────────────────────────────────────────

async function generateDemoData(adminClient: ReturnType<typeof createClient>, agentUserId: string) {
  if (!agentUserId) {
    return jsonResponse({ error: "Missing agent_user_id" }, 400);
  }

  const log: string[] = [];

  // Create sample seller sessions
  const sellerSessions = [
    {
      owner_user_id: agentUserId,
      session_type: "Seller",
      client_name: "Sarah & Mark Thompson",
      location: "Brookline, MA",
      property_type: "Single Family",
      condition: "Good",
      seller_inputs: {
        askingPrice: 875000,
        daysOnMarket: 14,
        priceReductions: 0,
        showingTraffic: "high",
        competingListings: 3,
        uniqueFeatures: "Renovated kitchen, hardwood floors throughout, finished basement",
        motivation: "relocating",
        timeline: "60days",
      },
      share_link_created: true,
      share_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    },
    {
      owner_user_id: agentUserId,
      session_type: "Seller",
      client_name: "David Chen",
      location: "Newton, MA",
      property_type: "Condo",
      condition: "Excellent",
      seller_inputs: {
        askingPrice: 625000,
        daysOnMarket: 7,
        priceReductions: 0,
        showingTraffic: "very_high",
        competingListings: 1,
        uniqueFeatures: "Top floor unit, city views, in-unit laundry, garage parking",
        motivation: "upsizing",
        timeline: "90days",
      },
      share_link_created: true,
      share_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    },
  ];

  // Create sample buyer sessions
  const buyerSessions = [
    {
      owner_user_id: agentUserId,
      session_type: "Buyer",
      client_name: "Emily & James Rodriguez",
      location: "Cambridge, MA",
      property_type: "Single Family",
      condition: "Good",
      buyer_inputs: {
        offerPrice: 750000,
        listPrice: 799000,
        downPaymentPercent: 20,
        preApproved: true,
        contingencies: ["inspection", "financing"],
        competingOffers: 2,
        closingTimeline: "30days",
        escalationClause: true,
        escalationMax: 825000,
      },
      share_link_created: true,
      share_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    },
    {
      owner_user_id: agentUserId,
      session_type: "Buyer",
      client_name: "Michael Park",
      location: "Somerville, MA",
      property_type: "Condo",
      condition: "Fair",
      buyer_inputs: {
        offerPrice: 450000,
        listPrice: 475000,
        downPaymentPercent: 15,
        preApproved: true,
        contingencies: ["inspection"],
        competingOffers: 0,
        closingTimeline: "45days",
        escalationClause: false,
      },
      share_link_created: false,
    },
  ];

  const allSessions = [...sellerSessions, ...buyerSessions];
  const { data: insertedSessions, error: sessErr } = await adminClient
    .from("sessions")
    .insert(allSessions)
    .select("id, client_name, share_token");

  if (sessErr) {
    return jsonResponse({ error: `Failed to create sessions: ${sessErr.message}` }, 500);
  }

  log.push(`Created ${insertedSessions?.length || 0} demo sessions`);

  // Add some demo view events for shared sessions
  const sharedSessions = (insertedSessions || []).filter(s => s.share_token);
  for (const s of sharedSessions) {
    const viewCount = Math.floor(Math.random() * 8) + 2;
    const views = Array.from({ length: viewCount }, (_, i) => ({
      report_id: s.id,
      share_token: s.share_token,
      viewer_id: `demo-viewer-${crypto.randomUUID().slice(0, 8)}`,
      device_type: i % 3 === 0 ? "desktop" : "mobile",
      viewed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    await adminClient.from("shared_report_views").insert(views);
  }
  log.push("Added demo view analytics");

  // Add some demo messages
  if (sharedSessions.length > 0) {
    const firstSession = sharedSessions[0];
    await adminClient.from("report_messages").insert([
      {
        report_id: firstSession.id,
        sender_id: agentUserId,
        sender_role: "agent",
        body: "Hi! I've shared this market analysis for your review. Let me know if you have any questions about the pricing strategy.",
      },
      {
        report_id: firstSession.id,
        sender_id: "demo-client-1",
        sender_role: "client",
        body: "Thanks for the report! The comparable analysis is really helpful. Could we discuss the timing strategy this week?",
      },
      {
        report_id: firstSession.id,
        sender_id: agentUserId,
        sender_role: "agent",
        body: "Absolutely! Based on the current market conditions, I'd recommend we move within the next 2 weeks. I'll call you tomorrow to discuss.",
      },
    ]);
    log.push("Added demo conversation");
  }

  return jsonResponse({ success: true, log, sessions_created: insertedSessions?.length || 0 });
}
