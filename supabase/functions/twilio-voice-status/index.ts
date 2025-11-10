import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { validateTwilioSignature, formDataToObject } from "../_shared/webhook-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioStatusWebhook {
  CallSid: string;
  CallStatus: string;
  CallDuration?: string;
  From: string;
  To: string;
  Direction?: string;
  Timestamp?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

const statusMap: Record<string, string> = {
  'queued': 'initiated',
  'initiated': 'initiated',
  'ringing': 'ringing',
  'in-progress': 'answered',
  'completed': 'completed',
  'busy': 'failed',
  'failed': 'failed',
  'no-answer': 'failed',
  'canceled': 'failed',
};

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    
    // ✅ VALIDAÇÃO DE ASSINATURA TWILIO
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioSignature || !twilioAuthToken) {
      console.error('[Twilio Voice Status] Missing signature or auth token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url).href;
    const params = formDataToObject(formData);
    
    const isValid = validateTwilioSignature(twilioAuthToken, twilioSignature, url, params);
    
    if (!isValid) {
      console.error('[Twilio Voice Status] Invalid signature - potential spoofing attempt');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const webhookData: TwilioStatusWebhook = {
      CallSid: formData.get('CallSid') as string,
      CallStatus: formData.get('CallStatus') as string,
      CallDuration: formData.get('CallDuration') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Direction: formData.get('Direction') as string,
      Timestamp: formData.get('Timestamp') as string,
      ErrorCode: formData.get('ErrorCode') as string,
      ErrorMessage: formData.get('ErrorMessage') as string,
    };

    console.log('Twilio Voice Status Webhook received:', webhookData);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Map Twilio status to our internal status
    const status = statusMap[webhookData.CallStatus] || 'unknown';

    // Prepare update data
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString(),
    };

    // Add duration if available and call is completed
    if (webhookData.CallDuration && status === 'completed') {
      updateData.duration = parseInt(webhookData.CallDuration, 10);
    }

    // Add error message if call failed
    if (status === 'failed' && (webhookData.ErrorMessage || webhookData.ErrorCode)) {
      updateData.error_message = webhookData.ErrorMessage || `Error code: ${webhookData.ErrorCode}`;
    }

    // Update voice_logs table by call_uuid (Twilio CallSid)
    const { data, error } = await supabase
      .from('voice_logs')
      .update(updateData)
      .eq('call_uuid', webhookData.CallSid)
      .select();

    if (error) {
      console.error('Error updating voice_logs:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || data.length === 0) {
      console.warn(`No voice_logs entry found for CallSid: ${webhookData.CallSid}`);
    } else {
      console.log(`Voice call ${webhookData.CallSid} updated to status: ${status}`);
    }

    // Return TwiML response (Twilio expects 200 OK)
    return new Response(
      JSON.stringify({ success: true, status: status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in twilio-voice-status:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

serve(handler);
