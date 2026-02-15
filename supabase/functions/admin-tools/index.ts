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

  // The handle_new_user trigger auto-creates profile + user_roles.
  // Update them to match reviewer params instead of inserting duplicates.
  await adminClient.from("profiles").update({
    full_name,
    email_verified: true,
  }).eq("user_id", userId);

  // Update the role (trigger defaults to 'agent')
  await adminClient.from("user_roles").update({
    role: role as string,
  }).eq("user_id", userId);

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

  // ── 1. Seed Agent Profile ─────────────────────────────────────────────────
  await adminClient.from("profiles").update({
    full_name: "Jason Craig",
    brokerage: "Chinatti Realty Group",
    phone: "(617) 555-0142",
    email_verified: true,
  }).eq("user_id", agentUserId);
  log.push("Updated agent profile");

  // ── 2. Seed Agent Branding ────────────────────────────────────────────────
  await adminClient.from("agent_branding").upsert({
    user_id: agentUserId,
    primary_color: "#2d3a4a",
    accent_color: "#c8842e",
    footer_text: "Prepared by Chinatti Realty Group · Market Compass™",
    report_template: "modern",
    social_links: { website: "https://chinattirealty.com" },
  }, { onConflict: "user_id" });
  log.push("Seeded agent branding");

  // ── 3. Seed Market Profiles ───────────────────────────────────────────────
  const marketProfiles = [
    {
      owner_user_id: agentUserId,
      label: "Greater Boston – SFH",
      location: "Boston Metro, MA",
      property_type: "SFH",
      typical_sale_to_list: "Above",
      typical_dom: "Fast",
      multiple_offers_frequency: "Common",
      contingency_tolerance: "Low",
    },
    {
      owner_user_id: agentUserId,
      label: "Cambridge Condos",
      location: "Cambridge, MA",
      property_type: "Condo",
      typical_sale_to_list: "Near",
      typical_dom: "Normal",
      multiple_offers_frequency: "Sometimes",
      contingency_tolerance: "Medium",
    },
  ];
  const { data: insertedProfiles } = await adminClient.from("market_profiles").insert(marketProfiles).select("id");
  log.push(`Created ${insertedProfiles?.length || 0} market profiles`);
  const profileId1 = insertedProfiles?.[0]?.id;
  const profileId2 = insertedProfiles?.[1]?.id;

  // ── 4. Create Demo Sessions (correct field names & enums) ─────────────────
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  const sellerSessions = [
    {
      owner_user_id: agentUserId,
      session_type: "Seller",
      client_name: "Sarah & Mark Thompson",
      location: "Brookline, MA",
      property_type: "SFH",
      condition: "Updated",
      selected_market_profile_id: profileId1 || null,
      seller_inputs: {
        seller_selected_list_price: 875000,
        desired_timeframe: "60",
        strategy_preference: "Balanced",
        agent_notes: "Strong curb appeal. Renovated kitchen will command premium. Recommend aggressive pricing given spring market.",
      },
      share_link_created: true,
      share_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      created_at: daysAgo(5),
      updated_at: daysAgo(1),
    },
    {
      owner_user_id: agentUserId,
      session_type: "Seller",
      client_name: "David Chen",
      location: "Newton, MA",
      property_type: "Condo",
      condition: "Renovated",
      selected_market_profile_id: profileId2 || null,
      seller_inputs: {
        seller_selected_list_price: 625000,
        desired_timeframe: "90+",
        strategy_preference: "Maximize price",
        agent_notes: "Top-floor unit with city views. In-unit laundry and garage parking are strong differentiators.",
      },
      share_link_created: true,
      share_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      created_at: daysAgo(12),
      updated_at: daysAgo(3),
    },
  ];

  const buyerSessions = [
    {
      owner_user_id: agentUserId,
      session_type: "Buyer",
      client_name: "Emily & James Rodriguez",
      location: "Cambridge, MA",
      property_type: "SFH",
      condition: "Maintained",
      selected_market_profile_id: profileId1 || null,
      buyer_inputs: {
        offer_price: 750000,
        reference_price: 799000,
        financing_type: "Conventional",
        down_payment_percent: "20+",
        contingencies: ["Inspection", "Financing"],
        closing_timeline: "21-30",
        buyer_preference: "Balanced",
        market_conditions: "Hot",
        days_on_market: 8,
        agent_notes: "Strong pre-approval. Flexible on closing date. Escalation clause up to $825K discussed.",
      },
      share_link_created: true,
      share_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      created_at: daysAgo(3),
      updated_at: daysAgo(0),
    },
    {
      owner_user_id: agentUserId,
      session_type: "Buyer",
      client_name: "Michael Park",
      location: "Somerville, MA",
      property_type: "Condo",
      condition: "Maintained",
      selected_market_profile_id: profileId2 || null,
      buyer_inputs: {
        offer_price: 450000,
        reference_price: 475000,
        financing_type: "Conventional",
        down_payment_percent: "10-19",
        contingencies: ["Inspection"],
        closing_timeline: "31-45",
        buyer_preference: "Price-protective",
        market_conditions: "Balanced",
        days_on_market: 22,
        agent_notes: "First-time buyer. Conservative approach — prioritize protecting value over speed.",
      },
      share_link_created: false,
      created_at: daysAgo(1),
      updated_at: daysAgo(0),
    },
  ];

  const allSessions = [...sellerSessions, ...buyerSessions];
  const { data: insertedSessions, error: sessErr } = await adminClient
    .from("sessions")
    .insert(allSessions)
    .select("id, client_name, share_token, session_type");

  if (sessErr) {
    return jsonResponse({ error: `Failed to create sessions: ${sessErr.message}` }, 500);
  }
  log.push(`Created ${insertedSessions?.length || 0} demo sessions`);

  // ── 5. Create Client Reviewer Account ─────────────────────────────────────
  const clientEmail = `reviewer-client-${crypto.randomUUID().slice(0, 6)}@demo.marketcompass.app`;
  let clientUserId: string | null = null;

  try {
    const { data: clientUser, error: clientErr } = await adminClient.auth.admin.createUser({
      email: clientEmail,
      password: "ReviewerDemo2025!",
      email_confirm: true,
      user_metadata: { full_name: "Sarah Thompson", is_reviewer: true },
    });

    if (!clientErr && clientUser?.user) {
      clientUserId = clientUser.user.id;

      // Update profile and role
      await adminClient.from("profiles").update({
        full_name: "Sarah Thompson",
        email_verified: true,
      }).eq("user_id", clientUserId);

      await adminClient.from("user_roles").update({
        role: "client",
      }).eq("user_id", clientUserId);

      // Link client to agent
      await adminClient.from("agent_clients").insert({
        agent_user_id: agentUserId,
        client_user_id: clientUserId,
      });

      log.push(`Created client reviewer: ${clientEmail} / ReviewerDemo2025!`);
    } else {
      log.push(`Warning: Could not create client reviewer: ${clientErr?.message}`);
    }
  } catch (e) {
    log.push(`Warning: Client creation error: ${String(e)}`);
  }

  // ── 6. Seed View Analytics ────────────────────────────────────────────────
  const sharedSessions = (insertedSessions || []).filter(s => s.share_token);
  for (const s of sharedSessions) {
    const viewCount = Math.floor(Math.random() * 8) + 3;
    const views = Array.from({ length: viewCount }, (_, i) => ({
      report_id: s.id,
      share_token: s.share_token,
      viewer_id: clientUserId || `demo-viewer-${crypto.randomUUID().slice(0, 8)}`,
      device_type: i % 3 === 0 ? "desktop" : "mobile",
      viewed_at: new Date(now.getTime() - Math.random() * 7 * 86400000).toISOString(),
    }));
    await adminClient.from("shared_report_views").insert(views);
  }
  log.push("Added view analytics to all shared sessions");

  // ── 7. Seed Messages on ALL shared sessions ───────────────────────────────
  const messageTemplates = [
    {
      agent: "Hi! I've prepared this market analysis for your review. The data reflects current conditions in your target area. Let me know if you have questions.",
      client: "Thanks so much! The pricing breakdown is really helpful. Can we discuss the timing strategy this week?",
      agentReply: "Absolutely! Based on current inventory levels, I'd recommend we move within the next 2 weeks. I'll call you tomorrow to discuss details.",
    },
    {
      agent: "Here's your updated analysis. I've factored in the recent comparable sale on Elm Street which strengthens our position.",
      client: "This looks great. I'm curious about the competing offers section — do you think we should adjust our approach?",
      agentReply: "Good question. Given the 3 active competing listings, I'd suggest we stay firm on price but offer flexible closing. Let's talk through the options.",
    },
    {
      agent: "Your buyer analysis is ready. I've included risk scenarios so you can see how different offer strategies play out.",
      client: "The risk breakdown is eye-opening. I feel more confident about the escalation clause strategy you suggested.",
      agentReply: "Great to hear! The data supports going up to your comfort max. I've noted a few contingency options we should discuss before submitting.",
    },
  ];

  for (let i = 0; i < sharedSessions.length; i++) {
    const s = sharedSessions[i];
    const msgs = messageTemplates[i % messageTemplates.length];
    const senderId = clientUserId || "demo-client-1";

    await adminClient.from("report_messages").insert([
      {
        report_id: s.id,
        sender_id: agentUserId,
        sender_role: "agent",
        body: msgs.agent,
        created_at: daysAgo(4 - i),
      },
      {
        report_id: s.id,
        sender_id: senderId,
        sender_role: "client",
        body: msgs.client,
        created_at: daysAgo(3 - i),
        read_by_agent_at: i === 0 ? daysAgo(2) : null, // First session read, others unread
      },
      {
        report_id: s.id,
        sender_id: agentUserId,
        sender_role: "agent",
        body: msgs.agentReply,
        created_at: daysAgo(2 - i),
      },
    ]);
  }
  log.push(`Added conversations to ${sharedSessions.length} shared sessions`);

  // ── 8. Seed Report Notes ──────────────────────────────────────────────────
  for (const s of (insertedSessions || [])) {
    await adminClient.from("report_notes").insert([
      {
        report_id: s.id,
        author_type: "agent",
        author_name: "Jason Craig",
        content: s.session_type === "Seller"
          ? "Client is motivated but flexible on timeline. Focus on maximizing net proceeds."
          : "First showing went well. Client is pre-approved and ready to move quickly.",
        is_pinned: true,
      },
      {
        report_id: s.id,
        author_type: "agent",
        author_name: "Jason Craig",
        content: "Follow up scheduled for next week. Review comparable adjustments before then.",
        is_pinned: false,
      },
    ]);
  }
  log.push("Added notes to all sessions");

  // ── 9. Seed Report Scenarios (client what-if submissions) ─────────────────
  const scenarioSenderId = clientUserId || "demo-client-1";
  for (const s of sharedSessions) {
    const payload = s.session_type === "Seller"
      ? { seller_selected_list_price: 850000, desired_timeframe: "30", strategy_preference: "Prioritize speed" }
      : { offer_price: 780000, financing_type: "Conventional", down_payment_percent: "20+", contingencies: ["Inspection"], closing_timeline: "21-30", buyer_preference: "Must win" };

    await adminClient.from("report_scenarios").insert([
      {
        report_id: s.id,
        created_by_id: scenarioSenderId,
        created_by_role: "client",
        title: s.session_type === "Seller" ? "What if we price lower for speed?" : "Aggressive offer scenario",
        scenario_payload: payload,
        note_to_agent: s.session_type === "Seller"
          ? "What if we dropped the price $25K to sell faster? We'd like to close before summer."
          : "Would waiving the financing contingency and offering $780K give us a real shot?",
        submitted_to_agent: true,
        submitted_at: daysAgo(2),
        reviewed_status: "pending",
      },
    ]);
  }
  log.push(`Added client scenarios to ${sharedSessions.length} sessions`);

  // ── 10. Seed Report Feedback ──────────────────────────────────────────────
  if (sharedSessions.length > 0) {
    await adminClient.from("report_feedback").insert([
      {
        report_id: sharedSessions[0].id,
        share_token: sharedSessions[0].share_token,
        viewer_id: clientUserId || "demo-viewer-1",
        rating: "helpful",
        comment: "Very thorough analysis. The competing offers section was especially useful for understanding our position.",
      },
    ]);
    if (sharedSessions.length > 1) {
      await adminClient.from("report_feedback").insert([
        {
          report_id: sharedSessions[1].id,
          share_token: sharedSessions[1].share_token,
          viewer_id: clientUserId || "demo-viewer-2",
          rating: "very_helpful",
          comment: "Love the scenario explorer! Being able to model different strategies before our meeting saved a lot of time.",
        },
      ]);
    }
    log.push("Added client feedback");
  }

  return jsonResponse({
    success: true,
    log,
    sessions_created: insertedSessions?.length || 0,
    client_reviewer: clientUserId ? { email: clientEmail, password: "ReviewerDemo2025!" } : null,
  });
}
