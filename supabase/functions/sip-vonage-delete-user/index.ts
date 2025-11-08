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

    const { sip_user_id } = await req.json();
    
    console.log('[Vonage Delete] Starting deletion for SIP user:', sip_user_id);

    // Get SIP user data
    const { data: sipUser, error: fetchError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('id', sip_user_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !sipUser) {
      throw new Error('SIP user not found or unauthorized');
    }

    console.log('[Vonage Delete] User data:', {
      username: sipUser.sip_username,
      endpoint_id: sipUser.vonage_endpoint_id
    });

    // Delete from Vonage API if we have the endpoint ID
    if (sipUser.vonage_endpoint_id) {
      const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
      const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
      
      // Get application ID from config
      const { data: appConfig } = await supabase
        .from('sip_provider_config')
        .select('config_value')
        .eq('domain_group_id', sipUser.domain_group_id)
        .eq('config_key', 'application_id')
        .single();

      if (appConfig?.config_value) {
        const appId = appConfig.config_value;
        
        const deleteResponse = await fetch(
          `https://api.nexmo.com/v1/applications/${appId}/endpoints/${sipUser.vonage_endpoint_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': 'Basic ' + btoa(`${vonageApiKey}:${vonageApiSecret}`),
            },
          }
        );

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const error = await deleteResponse.text();
          console.warn('[Vonage Delete] Failed to delete endpoint:', error);
        } else {
          console.log('[Vonage Delete] ✓ Endpoint deleted from API');
        }
      } else {
        console.log('[Vonage Delete] ⚠️ Application ID not found, skipping API deletion');
      }
    } else {
      console.log('[Vonage Delete] ⚠️ Missing Endpoint ID, skipping API deletion');
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('sip_users')
      .delete()
      .eq('id', sip_user_id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    console.log('[Vonage Delete] ✓ User deleted from database');

    // Log event
    await supabase.functions.invoke('log-sip-event', {
      body: {
        event_type: 'user_deleted',
        event_category: 'user',
        user_id: user.id,
        domain_group_id: sipUser.domain_group_id,
        provider: 'vonage',
        event_data: {
          username: sipUser.sip_username,
          extension: sipUser.extension,
        }
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User deleted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Vonage Delete] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to delete user'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
