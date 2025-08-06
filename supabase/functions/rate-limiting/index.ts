import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitRequest {
  user_identifier: string;
  action_type: string;
  max_attempts?: number;
  window_minutes?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { user_identifier, action_type, max_attempts = 10, window_minutes = 15 }: RateLimitRequest = await req.json()

    // Use the database function we created
    const { data, error } = await supabaseClient.rpc('check_rate_limit', {
      user_identifier,
      action_type,
      max_attempts,
      window_minutes
    })

    if (error) {
      console.error('Rate limit check error:', error)
      return new Response(
        JSON.stringify({ error: 'Rate limit check failed', allowed: false }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    return new Response(
      JSON.stringify({ 
        allowed: data,
        user_identifier,
        action_type
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (error) {
    console.error('Rate limiting function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', allowed: false }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  }
})