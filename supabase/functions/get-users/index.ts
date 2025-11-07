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

    // Create admin client to access auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get query parameters for filtering
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const roleFilter = url.searchParams.get('role');
    const statusFilter = url.searchParams.get('status');

    // Fetch all profiles
    let profileQuery = supabaseAdmin
      .from('profiles')
      .select('*');

    // Apply status filter
    if (statusFilter === 'active') {
      profileQuery = profileQuery.eq('is_active', true).is('suspended_at', null);
    } else if (statusFilter === 'suspended') {
      profileQuery = profileQuery.not('suspended_at', 'is', null);
    } else if (statusFilter === 'pending') {
      profileQuery = profileQuery.eq('is_active', false).is('suspended_at', null);
    }

    const { data: profiles, error: profilesError } = await profileQuery.order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all user roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all auth users to get emails
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user emails' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine profiles with emails and roles
    let users = profiles.map(profile => {
      const authUser = authUsers.find(u => u.id === profile.user_id);
      const userRole = userRoles?.find(r => r.user_id === profile.user_id);
      return {
        id: profile.id,
        user_id: profile.user_id,
        email: authUser?.email || 'Unknown',
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        is_active: profile.is_active,
        suspended_at: profile.suspended_at,
        suspension_reason: profile.suspension_reason,
        last_login_at: profile.last_login_at,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        role: userRole?.role || 'user'
      };
    });

    // Apply role filter if specified
    if (roleFilter && (roleFilter === 'admin' || roleFilter === 'user')) {
      users = users.filter(u => u.role === roleFilter);
    }

    // Apply search filter
    if (search) {
      users = users.filter(u => 
        u.email.toLowerCase().includes(search) ||
        u.full_name?.toLowerCase().includes(search) ||
        u.phone?.includes(search)
      );
    }

    console.log(`Returning ${users.length} users`);

    return new Response(
      JSON.stringify({ users }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-users function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
