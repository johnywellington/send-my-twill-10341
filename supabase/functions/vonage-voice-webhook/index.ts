import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VonageVoiceWebhook {
  uuid: string;
  conversation_uuid: string;
  status: string;
  to: string;
  from: string;
  duration?: string;
  reason?: string;
  timestamp?: string;
}

const statusMap: Record<string, string> = {
  'started': 'initiated',
  'ringing': 'ringing',
  'answered': 'in-progress',
  'completed': 'completed',
  'busy': 'failed',
  'failed': 'failed',
  'rejected': 'failed',
  'timeout': 'failed',
  'unanswered': 'failed',
  'cancelled': 'failed',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData: VonageVoiceWebhook = await req.json();

    console.log('Vonage Voice Webhook received:', webhookData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const status = statusMap[webhookData.status] || webhookData.status;
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (webhookData.duration) {
      updateData.duration = parseInt(webhookData.duration);
    }

    if (webhookData.reason && status === 'failed') {
      updateData.error_message = `Call failed: ${webhookData.reason}`;
    }

    // Try to update by call_uuid first
    let { error } = await supabase
      .from('voice_logs')
      .update(updateData)
      .eq('call_uuid', webhookData.uuid);

    // If not found, try by conversation_uuid
    if (error) {
      const result = await supabase
        .from('voice_logs')
        .update(updateData)
        .eq('call_uuid', webhookData.conversation_uuid);
      
      if (result.error) {
        console.error('Error updating voice log:', result.error);
        return new Response(JSON.stringify({ error: result.error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ALSO UPDATE ivr_logs for IVR calls
    const { error: ivrError } = await supabase
      .from('ivr_logs')
      .update(updateData)
      .eq('call_uuid', webhookData.uuid);

    if (!ivrError) {
      console.log(`IVR log ${webhookData.uuid} updated to status: ${status}`);
    } else {
      // If not found by call_uuid, try by conversation_uuid
      await supabase
        .from('ivr_logs')
        .update(updateData)
        .eq('conversation_uuid', webhookData.conversation_uuid);
    }

    console.log(`Voice call ${webhookData.uuid} updated to status: ${status}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in vonage-voice-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
