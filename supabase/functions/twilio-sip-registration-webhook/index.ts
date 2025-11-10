import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTwilioSignature, formDataToObject } from "../_shared/webhook-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    
    // ✅ VALIDAÇÃO DE ASSINATURA TWILIO
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioSignature || !twilioAuthToken) {
      console.error('[Twilio SIP Registration] Missing signature or auth token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url).href;
    const params = formDataToObject(formData);
    
    const isValid = validateTwilioSignature(twilioAuthToken, twilioSignature, url, params);
    
    if (!isValid) {
      console.error('[Twilio SIP Registration] Invalid signature - potential spoofing attempt');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const registrationData = {
      AccountSid: formData.get('AccountSid') as string,
      CredentialListSid: formData.get('CredentialListSid') as string,
      RegistrationStatus: formData.get('RegistrationStatus') as string,
      UserName: formData.get('UserName') as string,
      ContactUri: formData.get('ContactUri') as string,
      UserAgent: formData.get('UserAgent') as string,
      Timestamp: formData.get('Timestamp') as string,
    };

    console.log('[Twilio SIP Registration]:', registrationData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar SIP user pelo username
    const { data: sipUser, error: userError } = await supabase
      .from('sip_users')
      .select('id, user_id, domain_group_id')
      .eq('sip_username', registrationData.UserName)
      .eq('provider', 'twilio')
      .single();

    if (userError || !sipUser) {
      console.error('[Twilio SIP Registration] User not found:', registrationData.UserName);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    const status = registrationData.RegistrationStatus === 'registered' ? 'registered' : 'unregistered';
    const ipAddress = registrationData.ContactUri?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || null;

    // Atualizar ou criar endpoint
    const { error: endpointError } = await supabase
      .from('sip_endpoints')
      .upsert({
        sip_user_id: sipUser.id,
        provider: 'twilio',
        status,
        ip_address: ipAddress,
        user_agent: registrationData.UserAgent,
        last_seen: new Date().toISOString(),
        expires_at: status === 'registered' 
          ? new Date(Date.now() + 3600000).toISOString()
          : null,
        metadata: {
          credential_list_sid: registrationData.CredentialListSid,
          contact_uri: registrationData.ContactUri,
        }
      }, {
        onConflict: 'sip_user_id,provider'
      });

    if (endpointError) {
      console.error('[Twilio SIP Registration] Endpoint error:', endpointError);
      throw endpointError;
    }

    console.log(`[Twilio SIP Registration] ${registrationData.UserName} - ${status}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Twilio SIP Registration] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
