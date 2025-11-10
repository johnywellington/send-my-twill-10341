import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.log('User is not admin:', user.id, roleData);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user_id to delete from request body
    const { user_id: targetUserId } = await req.json();

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (targetUserId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get target user info before deletion (for logging)
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', targetUserId)
      .single();

    const { data: { user: targetAuthUser } } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

    // Delete all user-related data manually before deleting auth user
    console.log('Deleting user data for:', targetUserId);
    
    // Delete in order of dependencies
    await supabaseAdmin.from('webhook_health_checks').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('voice_logs').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('user_activity_logs').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('usage_analytics').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('sync_logs').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('sms_logs').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('sip_users').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('sip_routes').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('sip_connectivity_tests').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('sip_call_logs').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('received_sms').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('received_calls').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('provider_credentials').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('phone_numbers').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('message_templates').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('ivr_transfer_params').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('ivr_responses').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('ivr_logs').delete().eq('user_id', targetUserId);
    
    // Delete contact group members (need to get group IDs first)
    const { data: userGroups } = await supabaseAdmin
      .from('contact_groups')
      .select('id')
      .eq('user_id', targetUserId);
    
    if (userGroups && userGroups.length > 0) {
      const groupIds = userGroups.map(g => g.id);
      await supabaseAdmin.from('contact_group_members').delete().in('group_id', groupIds);
    }
    
    await supabaseAdmin.from('contacts').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('contact_groups').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('bulk_send_logs').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('api_validation_logs').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', targetUserId);

    console.log('User data deleted, now deleting auth user');

    // Delete user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the deletion activity
    const { error: logError } = await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'user_deleted',
        description: `Admin deleted user: ${targetAuthUser?.email || 'Unknown'}`,
        metadata: {
          deleted_user_id: targetUserId,
          deleted_user_email: targetAuthUser?.email,
          deleted_user_name: targetProfile?.full_name,
          performed_by: user.email
        }
      });

    if (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the deletion if logging fails
    }

    console.log(`User deleted: ${targetUserId} by admin: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        deleted_user: {
          id: targetUserId,
          email: targetAuthUser?.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
