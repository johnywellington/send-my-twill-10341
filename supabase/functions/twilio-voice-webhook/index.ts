import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioVoiceWebhook {
  CallSid: string;
  CallStatus: string;
  To: string;
  From: string;
  CallDuration?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

const statusMap: Record<string, string> = {
  'queued': 'initiated',
  'ringing': 'ringing',
  'in-progress': 'in-progress',
  'completed': 'completed',
  'busy': 'failed',
  'failed': 'failed',
  'no-answer': 'failed',
  'canceled': 'failed',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const webhookData: TwilioVoiceWebhook = {
      CallSid: formData.get('CallSid') as string,
      CallStatus: formData.get('CallStatus') as string,
      To: formData.get('To') as string,
      From: formData.get('From') as string,
      CallDuration: formData.get('CallDuration') as string || undefined,
      ErrorCode: formData.get('ErrorCode') as string || undefined,
      ErrorMessage: formData.get('ErrorMessage') as string || undefined,
    };

    console.log('Twilio Voice Webhook received:', webhookData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const status = statusMap[webhookData.CallStatus] || webhookData.CallStatus;
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (webhookData.CallDuration) {
      updateData.duration = parseInt(webhookData.CallDuration);
    }

    if (webhookData.ErrorCode || webhookData.ErrorMessage) {
      updateData.error_message = `Error ${webhookData.ErrorCode}: ${webhookData.ErrorMessage}`;
    }

    const { error } = await supabase
      .from('voice_logs')
      .update(updateData)
      .eq('call_uuid', webhookData.CallSid);

    if (error) {
      console.error('Error updating voice log:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Voice call ${webhookData.CallSid} updated to status: ${status}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in twilio-voice-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
