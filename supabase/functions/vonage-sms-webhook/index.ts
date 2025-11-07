import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VonageSmsWebhook {
  'message-id': string;
  status: string;
  to: string;
  'err-code'?: string;
  'message-timestamp'?: string;
}

const statusMap: Record<string, string> = {
  'delivered': 'delivered',
  'accepted': 'sent',
  'buffered': 'sent',
  'failed': 'failed',
  'rejected': 'failed',
  'expired': 'failed',
};

const errorMessages: Record<string, string> = {
  '0': 'Delivered',
  '1': 'Unknown',
  '2': 'Temporary absent subscriber',
  '3': 'Permanent error',
  '4': 'Call barred by user',
  '5': 'Portability error',
  '6': 'Anti-spam rejection',
  '7': 'Handset busy',
  '8': 'Network error',
  '9': 'Illegal number',
  '10': 'Invalid message',
  '11': 'Unroutable',
  '12': 'Destination unreachable',
  '13': 'Subscriber age restriction',
  '14': 'Number blocked',
  '15': 'Pre-paid insufficient funds',
  '16': 'Quota exceeded',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let webhookData: VonageSmsWebhook;

    // Accept multiple formats: JSON, GET params, or form-urlencoded
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json') && req.method === 'POST') {
      // JSON format
      webhookData = await req.json();
    } else if (req.method === 'GET') {
      // GET request - extract from query parameters
      const url = new URL(req.url);
      webhookData = {
        'message-id': url.searchParams.get('messageId') || url.searchParams.get('message-id') || '',
        status: url.searchParams.get('status') || '',
        to: url.searchParams.get('to') || '',
        'err-code': url.searchParams.get('err-code') || undefined,
        'message-timestamp': url.searchParams.get('message-timestamp') || undefined
      };
    } else {
      // POST with form-urlencoded
      const formData = await req.formData();
      webhookData = {
        'message-id': formData.get('messageId')?.toString() || formData.get('message-id')?.toString() || '',
        status: formData.get('status')?.toString() || '',
        to: formData.get('to')?.toString() || '',
        'err-code': formData.get('err-code')?.toString() || undefined,
        'message-timestamp': formData.get('message-timestamp')?.toString() || undefined
      };
    }

    console.log('Vonage SMS Webhook received:', webhookData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const status = statusMap[webhookData.status] || 'failed';
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (webhookData['err-code'] && webhookData['err-code'] !== '0') {
      const errorMsg = errorMessages[webhookData['err-code']] || 'Unknown error';
      updateData.error_message = `Error ${webhookData['err-code']}: ${errorMsg}`;
    }

    const { error } = await supabase
      .from('sms_logs')
      .update(updateData)
      .eq('external_id', webhookData['message-id'])
      .eq('provider', 'vonage');

    if (error) {
      console.error('Error updating SMS log:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`SMS ${webhookData['message-id']} updated to status: ${status}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in vonage-sms-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
