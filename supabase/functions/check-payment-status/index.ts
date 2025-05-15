import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

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

    // Get session ID from request
    const { sessionId } = await req.json()
    if (!sessionId) throw new Error('Session ID is required')

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (!session) throw new Error('Session not found')

    // Get user ID from session metadata
    const userId = session.metadata?.userId
    if (!userId) throw new Error('User ID not found in session metadata')

    // If payment successful, update user subscription
    if (session.payment_status === 'paid') {
      // Get subscription details
      let subscriptionId = session.subscription
      if (!subscriptionId) throw new Error('No subscription ID found in session')

      const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
      
      // Update or create subscription record
      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          plan_id: subscription.items.data[0].price.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end
        })

      if (upsertError) throw upsertError

      // Update user's plan status
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          plan: 'Pro Plan',
          plan_status: 'Active',
          subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString()
        })
        .eq('id', userId)

      if (updateError) throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentStatus: session.payment_status,
        userId: session.metadata?.userId,
        customerId: session.customer,
        subscriptionId: session.subscription
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error checking payment status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})