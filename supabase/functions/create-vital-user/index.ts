import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  VitalClient,
  VitalEnvironment,
  VitalRegion,
} from "https://esm.sh/@tryvital/vital-node@3.1.216";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      console.error(`Attempt ${retries} failed:`, error);
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      delay = delay * (1.5 + Math.random() * 0.5);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

serve(async (req) => {
  // HANDLE CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // CREATE SUPABASE CLIENT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log the request for debugging
    console.log("Creating Vital user, request received");
    
    // Get API key and log its presence (not the actual key)
    const apiKey = Deno.env.get("VITAL_API_KEY");
    console.log(`API key exists: ${!!apiKey}, length: ${apiKey?.length || 0}`);
    
    if (!apiKey) {
      throw new Error("VITAL_API_KEY environment variable is not set");
    }

    //GET USER ID FROM REQUEST
    const { user_id } = await req.json();
    if (!user_id) throw new Error("User ID is required");
    
    console.log(`Creating Vital user for user_id: ${user_id}`);
    
    // Check if user already has a vital_user_id
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("vital_user_id")
      .eq("id", user_id)
      .single();
      
    if (userCheckError && userCheckError.code !== "PGRST116") {
      console.error("Error checking existing user:", userCheckError);
    }
    
    // If user already has a vital_user_id, try to clean it up first
    if (existingUser?.vital_user_id) {
      console.log(`User already has vital_user_id: ${existingUser.vital_user_id}, will try to recreate`);
      
      try {
        // Create a temporary client to delete the existing user
        const tempClient = new VitalClient({
          apiKey,
          environment: VitalEnvironment.Sandbox,
          region: VitalRegion.US,
          timeout: 60000, // 60 seconds
        });
        
        // Try to delete the existing user (ignore errors)
        await tempClient.user.delete(existingUser.vital_user_id).catch(e => {
          console.log(`Error deleting existing Vital user: ${e.message}`);
        });
        
        console.log("Attempted to clean up existing Vital user");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
        // Continue anyway, as we'll try to create a new user
      }
    }

    // Initialize Vital client with explicit region and longer timeout
    const vitalClient = new VitalClient({
      apiKey,
      environment: VitalEnvironment.Sandbox,
      region: VitalRegion.US,
      timeout: 60000, // 60 seconds
    });
    
    // CREATE VITAL USER with retry logic
    console.log("Attempting to create Vital user with retries");
    const vitalUser = await retryWithBackoff(async () => {
      // Include gender if available from user metadata
      const gender = user.user_metadata?.gender || null;
      
      return await vitalClient.user.create({
        clientUserId: user_id,
        gender: gender,
      });
    });
    
    console.log(`Vital user created successfully: ${vitalUser.userId}`);

    // UPDATE USER WITH VITAL ID
    const { error: updateError } = await supabase
      .from("users")
      .update({ vital_user_id: vitalUser.userId })
      .eq("id", user_id);

    if (updateError) {
      console.error("Error updating user with vital_user_id:", updateError);
      throw updateError;
    }
    
    console.log("User updated with vital_user_id successfully");

    return new Response(
      JSON.stringify({
        success: true,
        vitalUser: vitalUser,
        vital_user_id: vitalUser.userId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-vital-user function:", error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});