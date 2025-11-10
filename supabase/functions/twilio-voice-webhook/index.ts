import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { validateTwilioSignature, formDataToObject } from "../_shared/webhook-validation.ts";

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
    
    // ✅ VALIDAÇÃO DE ASSINATURA TWILIO
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioSignature || !twilioAuthToken) {
      console.error('[Twilio Voice Webhook] Missing signature or auth token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url).href;
    const params = formDataToObject(formData);
    
    const isValid = validateTwilioSignature(twilioAuthToken, twilioSignature, url, params);
    
    if (!isValid) {
      console.error('[Twilio Voice Webhook] Invalid signature - potential spoofing attempt');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and sanitize webhook data
    const callSid = formData.get('CallSid')?.toString().trim().substring(0, 100) || '';
    const callStatus = formData.get('CallStatus')?.toString().trim().toLowerCase().substring(0, 50) || '';
    const to = formData.get('To')?.toString().trim().substring(0, 50) || '';
    const from = formData.get('From')?.toString().trim().substring(0, 50) || '';
    const callDuration = formData.get('CallDuration')?.toString().trim() || undefined;
    const errorCode = formData.get('ErrorCode')?.toString().trim().substring(0, 20) || undefined;
    const errorMessage = formData.get('ErrorMessage')?.toString().trim().substring(0, 500) || undefined;
    
    // Validate CallSid format (Twilio format: CA + 32 hex chars)
    if (!callSid || !/^CA[0-9a-f]{32}$/i.test(callSid)) {
      console.error('Invalid CallSid format:', callSid);
      return new Response(JSON.stringify({ error: 'Invalid CallSid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const webhookData: TwilioVoiceWebhook = {
      CallSid: callSid,
      CallStatus: callStatus,
      To: to,
      From: from,
      CallDuration: callDuration,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage,
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
