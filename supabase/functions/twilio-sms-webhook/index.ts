import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioSmsWebhook {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

const statusMap: Record<string, string> = {
  'queued': 'sent',
  'sent': 'sent',
  'delivered': 'delivered',
  'undelivered': 'failed',
  'failed': 'failed',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const webhookData: TwilioSmsWebhook = {
      MessageSid: formData.get('MessageSid') as string,
      MessageStatus: formData.get('MessageStatus') as string,
      To: formData.get('To') as string,
      From: formData.get('From') as string,
      ErrorCode: formData.get('ErrorCode') as string || undefined,
      ErrorMessage: formData.get('ErrorMessage') as string || undefined,
    };

    console.log('Twilio SMS Webhook received:', webhookData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const status = statusMap[webhookData.MessageStatus] || webhookData.MessageStatus;
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (webhookData.ErrorCode || webhookData.ErrorMessage) {
      updateData.error_message = `Error ${webhookData.ErrorCode}: ${webhookData.ErrorMessage}`;
    }

    const { error } = await supabase
      .from('sms_logs')
      .update(updateData)
      .eq('external_id', webhookData.MessageSid)
      .eq('provider', 'twilio');

    if (error) {
      console.error('Error updating SMS log:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`SMS ${webhookData.MessageSid} updated to status: ${status}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in twilio-sms-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
