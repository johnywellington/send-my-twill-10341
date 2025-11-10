import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { app_id, app_name, friendly_name, is_default } = await req.json();

    if (!app_id || !app_name) {
      throw new Error('app_id and app_name are required');
    }

    // Generate domain_group_id
    const domain_group_id = crypto.randomUUID();

    // If setting as default, unmark others
    if (is_default) {
      await supabase
        .from('sip_provider_config')
        .update({ is_default: false })
        .eq('provider', 'vonage')
        .eq('is_default', true);
    }

    // Insert 3 config rows for this application
    const configs = [
      {
        provider: 'vonage',
        config_key: 'app_id',
        config_value: app_id,
        domain_group_id,
        friendly_name: friendly_name || app_name,
        is_default: is_default || false,
        is_active: true,
        created_by: user.id
      },
      {
        provider: 'vonage',
        config_key: 'app_name',
        config_value: app_name,
        domain_group_id,
        friendly_name: friendly_name || app_name,
        is_default: is_default || false,
        is_active: true,
        created_by: user.id
      },
      {
        provider: 'vonage',
        config_key: 'sip_domain',
        config_value: 'sip.nexmo.com',
        domain_group_id,
        friendly_name: friendly_name || app_name,
        is_default: is_default || false,
        is_active: true,
        created_by: user.id
      }
    ];

    const { data, error } = await supabase
      .from('sip_provider_config')
      .insert(configs)
      .select();

    if (error) throw error;

    // Log event
    await supabase.functions.invoke('log-sip-event', {
      body: {
        event_type: 'application_created',
        event_category: 'application',
        provider: 'vonage',
        user_id: user.id,
        domain_group_id,
        event_data: {
          app_id,
          app_name,
          friendly_name
        }
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        domain_group_id,
        app_id,
        app_name 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Vonage application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
