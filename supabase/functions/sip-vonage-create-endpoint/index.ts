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

    const { username, password, extension, display_name } = await req.json();

    // Get Vonage config
    const { data: configs } = await supabase
      .from('sip_provider_config')
      .select('config_key, config_value')
      .eq('provider', 'vonage')
      .in('config_key', ['app_id', 'sip_domain']);

    const configMap = configs?.reduce((acc, c) => ({ ...acc, [c.config_key]: c.config_value }), {} as Record<string, string>) || {};

    if (!configMap.app_id || !configMap.sip_domain) {
      throw new Error('Vonage not configured. Please run setup first.');
    }

    const vonageKey = Deno.env.get('VONAGE_API_KEY');
    const vonageSecret = Deno.env.get('VONAGE_API_SECRET');

    // Create SIP endpoint
    const endpointResponse = await fetch(
      `https://api.nexmo.com/v1/applications/${configMap.app_id}/endpoints`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${vonageKey}:${vonageSecret}`),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          extension,
        }),
      }
    );

    const endpoint = await endpointResponse.json();

    // Insert into database
    const { data: sipUser, error: insertError } = await supabase
      .from('sip_users')
      .insert({
        user_id: user.id,
        provider: 'vonage',
        sip_username: username,
        sip_password: password,
        sip_domain: configMap.sip_domain,
        extension,
        display_name,
        vonage_endpoint_id: endpoint.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sip_user: sipUser,
        sip_uri: `sip:${extension}@${configMap.sip_domain}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Vonage SIP endpoint:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});