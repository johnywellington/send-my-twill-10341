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

    const { domain_group_id, force } = await req.json();

    if (!domain_group_id) {
      throw new Error('domain_group_id is required');
    }

    // Check if application has active users
    const { data: users, error: usersError } = await supabase
      .from('sip_users')
      .select('id')
      .eq('provider', 'vonage')
      .eq('domain_group_id', domain_group_id)
      .eq('is_active', true);

    if (usersError) throw usersError;

    if (users && users.length > 0 && !force) {
      throw new Error(`Cannot delete application with ${users.length} active users. Set force=true to proceed.`);
    }

    // Check if it's default
    const { data: configs } = await supabase
      .from('sip_provider_config')
      .select('is_default')
      .eq('domain_group_id', domain_group_id)
      .limit(1)
      .single();

    if (configs?.is_default && !force) {
      throw new Error('Cannot delete default application. Set another as default first or use force=true.');
    }

    // Soft delete: mark as inactive
    const { data, error } = await supabase
      .from('sip_provider_config')
      .update({ is_active: false, is_default: false })
      .eq('provider', 'vonage')
      .eq('domain_group_id', domain_group_id)
      .select();

    if (error) throw error;

    // Also deactivate associated users
    await supabase
      .from('sip_users')
      .update({ is_active: false })
      .eq('domain_group_id', domain_group_id);

    // Log event
    await supabase.functions.invoke('log-sip-event', {
      body: {
        event_type: 'application_deleted',
        event_category: 'application',
        provider: 'vonage',
        user_id: user.id,
        domain_group_id,
        event_data: {
          soft_delete: true,
          users_count: users?.length || 0
        }
      }
    });

    return new Response(
      JSON.stringify({ success: true, deleted: data?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting Vonage application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
