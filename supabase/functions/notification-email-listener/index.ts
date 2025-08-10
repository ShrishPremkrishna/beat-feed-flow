import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function listens for PostgreSQL notifications and triggers email sends
const startEmailListener = async () => {
  console.log("Starting email notification listener...");
  
  // Listen for PostgreSQL notifications
  const channel = supabase.channel('notification-emails');
  
  // This is a simplified version - in production you'd use a more robust listener
  // For now, we'll use the direct API approach where the trigger calls this function
  
  console.log("Email listener initialized");
};

const handler = async (req: Request): Promise<Response> => {
  console.log(`Method: ${req.method}, URL: ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "POST") {
    try {
      const notificationData = await req.json();
      console.log("Received notification for email:", notificationData);

      // Call the send-notification-email function
      const emailResponse = await supabase.functions.invoke('send-notification-email', {
        body: { notification_data: notificationData }
      });

      if (emailResponse.error) {
        console.error("Error calling email function:", emailResponse.error);
        throw new Error(emailResponse.error.message);
      }

      console.log("Email notification triggered successfully");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error: any) {
      console.error("Error processing notification:", error);
      return new Response(JSON.stringify({ 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // For GET requests, start the listener (health check)
  await startEmailListener();
  
  return new Response(JSON.stringify({ 
    status: "Email notification listener is running" 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

serve(handler);