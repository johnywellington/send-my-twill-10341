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

    const { domain_group_id, friendly_name, is_default, is_active } = await req.json();

    if (!domain_group_id) {
      throw new Error('domain_group_id is required');
    }

    // If setting as default, unmark others first
    if (is_default === true) {
      await supabase
        .from('sip_provider_config')
        .update({ is_default: false })
        .eq('provider', 'vonage')
        .eq('is_default', true)
        .neq('domain_group_id', domain_group_id);
    }

    // Build update object
    const updates: any = {};
    if (friendly_name !== undefined) updates.friendly_name = friendly_name;
    if (is_default !== undefined) updates.is_default = is_default;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update all config rows for this application
    const { data, error } = await supabase
      .from('sip_provider_config')
      .update(updates)
      .eq('provider', 'vonage')
      .eq('domain_group_id', domain_group_id)
      .select();

    if (error) throw error;

    // Log event
    await supabase.functions.invoke('log-sip-event', {
      body: {
        event_type: 'application_updated',
        event_category: 'application',
        provider: 'vonage',
        user_id: user.id,
        domain_group_id,
        event_data: updates
      }
    });

    return new Response(
      JSON.stringify({ success: true, updated: data?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating Vonage application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
