import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupRequest {
  provider: 'twilio' | 'vonage' | 'both';
  setAsDefault?: boolean;
  twilioConfig?: {
    friendlyName: string;
    domainName: string;
    displayName?: string;
  };
  vonageConfig?: {
    name: string;
    displayName?: string;
    answerUrl: string;
    eventUrl: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { provider, twilioConfig, vonageConfig, setAsDefault }: SetupRequest = await req.json();
    const results: any = {};

    // Setup Twilio
    if (provider === 'twilio' || provider === 'both') {
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (!twilioSid || !twilioToken) {
        throw new Error('Twilio credentials not configured');
      }

      if (!twilioConfig) {
        throw new Error('Twilio configuration required');
      }

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/Domains.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            FriendlyName: twilioConfig.friendlyName,
            DomainName: twilioConfig.domainName,
          }),
        }
      );

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        throw new Error(`Twilio API error: ${errorText}`);
      }

      const twilioData = await twilioResponse.json();
      const domainGroupId = crypto.randomUUID();

      // Se setAsDefault = true, desmarcar outros domínios como default
      if (setAsDefault) {
        await supabase
          .from('sip_provider_config')
          .update({ is_default: false })
          .eq('provider', 'twilio');
      }

      // Inserir novo domínio (não mais upsert!)
      await supabase.from('sip_provider_config').insert([
        { 
          domain_group_id: domainGroupId,
          provider: 'twilio', 
          config_key: 'sip_domain', 
          config_value: twilioData.domain_name,
          friendly_name: twilioConfig.displayName || twilioConfig.domainName,
          is_default: setAsDefault || false,
          created_by: user.id 
        },
        { 
          domain_group_id: domainGroupId,
          provider: 'twilio', 
          config_key: 'sip_domain_sid', 
          config_value: twilioData.sid,
          friendly_name: twilioConfig.displayName || twilioConfig.domainName,
          is_default: setAsDefault || false,
          created_by: user.id 
        },
      ]);

      results.twilio = {
        domain_group_id: domainGroupId,
        domain_name: twilioData.domain_name,
        sid: twilioData.sid,
        friendly_name: twilioConfig.displayName || twilioConfig.domainName,
      };
    }

    // Setup Vonage
    if (provider === 'vonage' || provider === 'both') {
      const vonageKey = Deno.env.get('VONAGE_API_KEY');
      const vonageSecret = Deno.env.get('VONAGE_API_SECRET');

      if (!vonageKey || !vonageSecret) {
        throw new Error('Vonage credentials not configured');
      }

      if (!vonageConfig) {
        throw new Error('Vonage configuration required');
      }

      const vonageResponse = await fetch('https://api.nexmo.com/v2/applications', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${vonageKey}:${vonageSecret}`),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: vonageConfig.name,
          capabilities: {
            voice: {
              webhooks: {
                answer_url: { 
                  address: vonageConfig.answerUrl, 
                  http_method: 'GET' 
                },
                event_url: { 
                  address: vonageConfig.eventUrl, 
                  http_method: 'POST' 
                },
              },
            },
          },
        }),
      });

      if (!vonageResponse.ok) {
        const errorText = await vonageResponse.text();
        throw new Error(`Vonage API error: ${errorText}`);
      }

      const vonageData = await vonageResponse.json();
      const domainGroupId = crypto.randomUUID();

      // Se setAsDefault = true, desmarcar outros apps como default
      if (setAsDefault) {
        await supabase
          .from('sip_provider_config')
          .update({ is_default: false })
          .eq('provider', 'vonage');
      }

      // Inserir nova app (não mais upsert!)
      await supabase.from('sip_provider_config').insert([
        { 
          domain_group_id: domainGroupId,
          provider: 'vonage', 
          config_key: 'app_id', 
          config_value: vonageData.id,
          friendly_name: vonageConfig.displayName || vonageConfig.name,
          is_default: setAsDefault || false,
          created_by: user.id 
        },
        { 
          domain_group_id: domainGroupId,
          provider: 'vonage', 
          config_key: 'app_name', 
          config_value: vonageData.name,
          friendly_name: vonageConfig.displayName || vonageConfig.name,
          is_default: setAsDefault || false,
          created_by: user.id 
        },
        { 
          domain_group_id: domainGroupId,
          provider: 'vonage', 
          config_key: 'sip_domain', 
          config_value: 'sip.nexmo.com',
          friendly_name: vonageConfig.displayName || vonageConfig.name,
          is_default: setAsDefault || false,
          created_by: user.id 
        },
      ]);

      results.vonage = {
        domain_group_id: domainGroupId,
        app_id: vonageData.id,
        app_name: vonageData.name,
        sip_domain: 'sip.nexmo.com',
        friendly_name: vonageConfig.displayName || vonageConfig.name,
      };
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});