import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailData {
  notification_id: string;
  recipient_email: string;
  notification_type: string;
  title: string;
  content: string | null;
  action_url: string | null;
  actor_display_name: string;
  created_at: string;
}

const generateEmailHTML = (data: NotificationEmailData) => {
  const baseUrl = "https://hkdsiivrjquuiekygfcu.supabase.co"; // Your app URL
  const actionUrl = data.action_url ? `${baseUrl}${data.action_url}` : baseUrl;
  
  const emailContent = data.notification_type === 'new_post' 
    ? `${data.actor_display_name} shared a new post on Beatify!`
    : `${data.actor_display_name} sent you a message on Beatify!`;

  const ctaText = data.notification_type === 'new_post' 
    ? "View Post" 
    : "View Message";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Notification - Beatify</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Beatify</h1>
          <p style="color: #ffffff; margin: 8px 0 0 0; opacity: 0.9;">New Notification</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
            ${data.title}
          </h2>
          
          <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
            ${emailContent}
          </p>
          
          ${data.content ? `
            <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 0 0 24px 0; border-radius: 4px;">
              <p style="color: #374151; margin: 0; font-style: italic; font-size: 14px;">
                "${data.content}"
              </p>
            </div>
          ` : ''}
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${actionUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              ${ctaText}
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0; text-align: center;">
            Don't want to receive these emails? 
            <a href="${baseUrl}/settings" style="color: #667eea; text-decoration: none;">Update your notification preferences</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            © 2025 Beatify. Made with ❤️ for music creators.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log(`Method: ${req.method}, URL: ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_data }: { notification_data: NotificationEmailData } = await req.json();
    
    console.log("Processing notification email:", {
      type: notification_data.notification_type,
      recipient: notification_data.recipient_email,
      title: notification_data.title
    });

    // Only send emails for specific notification types
    if (!['new_post', 'message'].includes(notification_data.notification_type)) {
      console.log("Skipping email - notification type not enabled for email");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!notification_data.recipient_email) {
      console.error("No recipient email provided");
      return new Response(JSON.stringify({ error: "No recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHTML = generateEmailHTML(notification_data);
    const subject = notification_data.notification_type === 'new_post' 
      ? `${notification_data.actor_display_name} shared a new post on Beatify`
      : `New message from ${notification_data.actor_display_name} on Beatify`;

    const emailResponse = await resend.emails.send({
      from: "Beatify <notifications@resend.dev>", // Change this to your verified domain
      to: [notification_data.recipient_email],
      subject: subject,
      html: emailHTML,
    });

    console.log("Email sent successfully:", emailResponse);

    // Mark email as sent in database (optional - you could add an email_sent field to notifications)
    await supabase
      .from('notifications')
      .update({ 
        metadata: { 
          ...notification_data, 
          email_sent: true, 
          email_sent_at: new Date().toISOString() 
        }
      })
      .eq('id', notification_data.notification_id);

    return new Response(JSON.stringify({ 
      success: true, 
      email_id: emailResponse.data?.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);