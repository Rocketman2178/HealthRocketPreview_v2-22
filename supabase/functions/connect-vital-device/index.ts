import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import {VitalClient, VitalEnvironment } from "https://esm.sh/@tryvital/vital-node@3.1.216";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const vitalClient = new VitalClient({
      apiKey: Deno.env.get('VITAL_API_KEY')!,
      environment: VitalEnvironment.Sandbox,
      region: 'us', 
      timeout: 30000 // Increase timeout to 30 seconds
    })
    // Get user ID and provider from request
    const { user_id, provider ,device_email} = await req.json()
    if (!user_id || !provider) {
      throw new Error('User ID and provider are required')
    }
    
    // Get user email from auth.users for logging purposes
    const { data: authData } = await supabase.auth.admin.getUserById(user_id);
    const userEmail = authData?.user?.email || device_email;
    const userName = authData?.user?.user_metadata?.name || "Health Rocket User";
    console.log(`Processing connection for user ${user_id} with email ${userEmail}, name: ${userName}`);

    // Get Vital user ID
    const { data: user } = await supabase
      .from('users')
      .select('vital_user_id, email')
      .eq('id', user_id)
      .single()

    if (!user?.vital_user_id) {
      // Create Vital user if not exists
      try {
        console.log("No Vital user ID found, creating new Vital user");
        
        // First try to get the user's email
        if (!userEmail) {
          throw new Error('User email not found');
        }
        
        const { data } = await supabase.functions.invoke('create-vital-user', {
          body: { user_id, email: userEmail },
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!data?.vitalUser?.userId) {
          throw new Error('Failed to create Vital user');
        }
        
        user.vital_user_id = data.vitalUser.userId;
        console.log("Created new Vital user with ID:", user.vital_user_id);
      } catch (createError) {
        console.error('Error creating Vital user:', createError);
        throw new Error(`Failed to create Vital user: ${createError.message}`);
      }
    }

    // Create connection link
    // Create connection link
    try {
      const redirectUrl = `${req.headers.get('origin')}/vital-response?state=success&provider=${provider}`;
      console.log(`Creating link with redirectUrl: ${redirectUrl}, provider: ${provider}`);
      
      // Log the Vital user ID and provider for debugging
      console.log(`Creating link for Vital user ID: ${user.vital_user_id}, provider: ${provider}`);
     
      const link = await vitalClient.link.token({
        userId: user.vital_user_id,
        provider,
        email: userEmail, // Use user's actual email from auth
        clientUserKey: userName, // Add name for better identification
        redirectUrl: redirectUrl,
      });
     
      console.log("Link created successfully:", link);

      // Store device connection
      const { error: deviceError } = await supabase
        .from('user_devices')
        .insert({
          user_id,
          vital_user_id: user.vital_user_id,
          provider,
          status: 'pending',
          device_email,
          metadata: {
            link_token: link.linkToken,
            redirect_url: redirectUrl
          }
        });

      if (deviceError) throw deviceError;

      return new Response(
        JSON.stringify({ 
          success: true,
          link: link,
          vital_user_id: user.vital_user_id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (linkError) {
      console.error('Error creating Vital link:', linkError);
     
     // If we get the "user does not exist in this team" error, try to recreate the user
     if (linkError.message && linkError.message.includes("does not or no longer exists in this team")) {
       try {
         console.log("User does not exist in team, attempting to recreate Vital user");
         
         // Delete the user from Vital if possible
         try {
           await vitalClient.user.delete(user.vital_user_id);
           console.log("Successfully deleted existing Vital user");
         } catch (deleteError) {
           console.log("Error deleting Vital user (may not exist):", deleteError);
         }
         
         // Create a new Vital user
         const newVitalUser = await vitalClient.user.create({
           clientUserId: user_id,
           email: userEmail, // Use user's actual email from auth
           clientUserKey: userName // Add name for better identification
         });
         
         console.log("Created new Vital user:", newVitalUser);
         
         // Update the user record with the new Vital user ID
         const { error: updateError } = await supabase
           .from('users')
           .update({ vital_user_id: newVitalUser.userId })
           .eq('id', user_id);
           
         if (updateError) {
           console.error("Error updating user with new Vital user ID:", updateError);
         }
         
         // Try creating the link again with the new user ID
         const redirectUrl = `${req.headers.get('origin')}/vital-response?state=success&provider=${provider}`;
         const newLink = await vitalClient.link.token({
           userId: newVitalUser.userId,
           provider,
           email: userEmail, // Use user's actual email from auth
           clientUserKey: userName, // Add name for better identification
           redirectUrl: redirectUrl,
         });
         
         console.log("Link created successfully with new Vital user:", newLink);
         
         // Store device connection with new Vital user ID
         const { error: deviceError } = await supabase
           .from('user_devices')
           .insert({
             user_id,
             vital_user_id: newVitalUser.userId,
             provider,
             status: 'pending',
             device_email,
             metadata: {
               link_token: newLink.linkToken,
               redirect_url: redirectUrl
             }
           });

         if (deviceError) {
           console.error("Error storing device connection:", deviceError);
         }

         return new Response(
           JSON.stringify({ 
             success: true,
             link: newLink,
             vital_user_id: newVitalUser.userId,
             recreated: true
           }),
           { 
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
             status: 200 
           }
         );
       } catch (recreateError) {
         console.error("Error recreating Vital user:", recreateError);
         throw new Error(`Failed to recreate Vital user: ${recreateError.message}`);
       }
     }
     
      // Log the error and throw a more user-friendly message
      throw new Error(`Failed to create connection link: ${linkError.message}`);
    }
  } catch (error) {
    console.error('Error in connect-vital-device:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})