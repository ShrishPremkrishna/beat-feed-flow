import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Security headers for enhanced protection
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://hkdsiivrjquuiekygfcu.supabase.co; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';",
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders, ...securityHeaders } 
    });
  }

  try {
    // This function can be used to add security headers to responses
    // For now, it just returns the headers that should be applied
    return new Response(
      JSON.stringify({ 
        message: 'Security headers configured',
        headers: securityHeaders 
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
          ...securityHeaders
        },
      },
    );
  } catch (error) {
    console.error('Security headers function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      },
    );
  }
});