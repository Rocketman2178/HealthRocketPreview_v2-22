import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { client_user_id, data, event_type, team_id, user_id } =
      await req.json();

    console.log("Vital webhook received:", { event_type, client_user_id, user_id });

    // Handle provider connection events
    if (event_type === 'provider.connection.created') {
      try {
        const { data: webhookResult, error: webhookError } = await supabase
          .rpc('handle_vital_webhook', {
            payload: {
              user_id: client_user_id,
              provider: data.provider,
              status: 'active'
            }
          });

        if (webhookError) {
          console.error("Error handling webhook:", webhookError);
          throw webhookError;
        }
        
        console.log("Updated device connection status to active:", webhookResult);
      } catch (err) {
        console.error("Error updating device status:", err);
      }
    }

    // Handle different webhook events
    switch (event_type) {
      case "daily.data.profile.created":
      case "historical.data.profile.created": {
        // Process new health data
        const { error: metricsError } = await supabase
          .from("health_metrics")
          .insert({
            user_id,
            ...data,
            source: "vital",
          });

        if (metricsError) throw metricsError;
        break;
      }

      // Add more event handlers as needed
      default: {
        console.log(`Unhandled event type: ${event_type}`);
      }
    }

    return new Response(JSON.stringify({ success: true, event: event_type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});