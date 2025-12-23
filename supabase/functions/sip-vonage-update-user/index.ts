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

    const { sip_user_id, display_name, is_active } = await req.json();

    if (!sip_user_id) {
      throw new Error('sip_user_id is required');
    }

    // Build update object
    const updates: any = { updated_at: new Date().toISOString() };
    if (display_name !== undefined) updates.display_name = display_name;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update user in database
    // Note: Vonage PSIP doesn't allow editing username/password after creation
    const { data, error } = await supabase
      .from('sip_users')
      .update(updates)
      .eq('id', sip_user_id)
      .eq('provider', 'vonage')
      .select()
      .single();

    if (error) throw error;

    // Log event
    await supabase.functions.invoke('log-sip-event', {
      body: {
        event_type: 'user_updated',
        event_category: 'user',
        provider: 'vonage',
        user_id: user.id,
        sip_user_id,
        event_data: updates
      }
    });

    return new Response(
      JSON.stringify({ success: true, user: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating Vonage user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
