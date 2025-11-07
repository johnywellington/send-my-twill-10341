import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

  const { username, password, extension, display_name, domain_group_id } = await req.json();
  
  console.log('Creating Twilio SIP user with domain_group_id:', domain_group_id);

    // Get Twilio SIP Domain from config (use domain_group_id if provided, otherwise use default)
    let sipDomain: string;
    let domainGroupId: string;

    if (domain_group_id) {
      // Usar domínio específico
      const { data: domainConfig } = await supabase
        .from('sip_provider_config')
        .select('config_value, domain_group_id')
        .eq('domain_group_id', domain_group_id)
        .eq('config_key', 'sip_domain')
        .single();
      
      if (!domainConfig) {
        throw new Error('Specified Twilio SIP domain not found');
      }
      sipDomain = domainConfig.config_value;
      domainGroupId = domainConfig.domain_group_id;
    } else {
      // Usar domínio padrão
      const { data: domainConfig } = await supabase
        .from('sip_provider_config')
        .select('config_value, domain_group_id')
        .eq('provider', 'twilio')
        .eq('config_key', 'sip_domain')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (!domainConfig) {
        throw new Error('No default Twilio SIP domain configured. Please run setup first.');
      }
      sipDomain = domainConfig.config_value;
      domainGroupId = domainConfig.domain_group_id;
    }
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    // Create CredentialList
    const credListResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          FriendlyName: `SIP User ${username}`,
        }),
      }
    );

    const credList = await credListResponse.json();

    // Add Credential to list
    const credResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists/${credList.sid}/Credentials.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          Username: username,
          Password: password,
        }),
      }
    );

    const credential = await credResponse.json();

    // Insert into database
    const { data: sipUser, error: insertError } = await supabase
      .from('sip_users')
      .insert({
        user_id: user.id,
        provider: 'twilio',
        sip_username: username,
        sip_password: password,
        sip_domain: sipDomain,
        extension,
        display_name,
        twilio_credential_sid: credential.sid,
        domain_group_id: domainGroupId || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sip_user: sipUser,
        sip_uri: `sip:${username}@${sipDomain}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Twilio SIP user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});