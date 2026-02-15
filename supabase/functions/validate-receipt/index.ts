import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// App Store Server API endpoints
const APP_STORE_PRODUCTION = "https://buy.itunes.apple.com/verifyReceipt";
const APP_STORE_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt";

// Product IDs
const MONTHLY_PRODUCT_ID = "com.marketcompass.pro.monthly";
const YEARLY_PRODUCT_ID = "com.marketcompass.pro.yearly";
const VALID_PRODUCT_IDS = [MONTHLY_PRODUCT_ID, YEARLY_PRODUCT_ID];

interface ReceiptValidationRequest {
  receiptData: string;
  isRestore?: boolean;
}

async function verifyWithApple(receiptData: string, password: string): Promise<any> {
  // Try production first
  let response = await fetch(APP_STORE_PRODUCTION, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "receipt-data": receiptData,
      password,
      "exclude-old-transactions": true,
    }),
  });

  let result = await response.json();

  // Status 21007 means sandbox receipt sent to production — retry with sandbox
  if (result.status === 21007) {
    response = await fetch(APP_STORE_SANDBOX, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "receipt-data": receiptData,
        password,
        "exclude-old-transactions": true,
      }),
    });
    result = await response.json();
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appStoreSharedSecret = Deno.env.get("APP_STORE_SHARED_SECRET");

    // Create client with user's auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { receiptData, isRestore } = (await req.json()) as ReceiptValidationRequest;

    if (!receiptData) {
      return new Response(JSON.stringify({ error: "Missing receipt data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appStoreSharedSecret) {
      return new Response(JSON.stringify({ error: "App Store shared secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify receipt with Apple
    const appleResult = await verifyWithApple(receiptData, appStoreSharedSecret);

    if (appleResult.status !== 0) {
      return new Response(JSON.stringify({ error: "Invalid receipt", appleStatus: appleResult.status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the latest subscription info
    const latestInfo = appleResult.latest_receipt_info;
    if (!latestInfo || latestInfo.length === 0) {
      return new Response(JSON.stringify({ error: "No subscription found in receipt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get latest active subscription
    const sortedInfo = [...latestInfo].sort(
      (a: any, b: any) => Number(b.expires_date_ms) - Number(a.expires_date_ms)
    );

    const latest = sortedInfo[0];
    const productId = latest.product_id;
    const expiresAt = new Date(Number(latest.expires_date_ms));
    const originalTransactionId = latest.original_transaction_id;
    const isActive = expiresAt > new Date();
    const autoRenew = appleResult.pending_renewal_info?.[0]?.auto_renew_status === "1";

    if (!VALID_PRODUCT_IDS.includes(productId)) {
      return new Response(JSON.stringify({ error: "Unknown product ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to upsert subscription
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const subscriptionData = {
      user_id: user.id,
      status: isActive ? "active" : "expired",
      subscription_product_id: productId,
      subscription_started_at: new Date(Number(latest.purchase_date_ms)).toISOString(),
      subscription_expires_at: expiresAt.toISOString(),
      original_transaction_id: originalTransactionId,
      latest_receipt: receiptData,
      auto_renew_enabled: autoRenew,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      .from("user_subscriptions")
      .upsert(subscriptionData, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to save subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          status: isActive ? "active" : "expired",
          productId,
          expiresAt: expiresAt.toISOString(),
          autoRenewEnabled: autoRenew,
          isRestore: !!isRestore,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Receipt validation error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
