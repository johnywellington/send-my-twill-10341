import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { corsHeaders } from '../_shared/cors.ts';

// Password validation schema
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!PASSWORD_REGEX.uppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!PASSWORD_REGEX.lowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!PASSWORD_REGEX.number.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!PASSWORD_REGEX.special.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { valid: errors.length === 0, errors };
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function sanitizeInput(input: string, maxLength: number): string {
  return input.trim().substring(0, maxLength);
}

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

    // Get current user and verify admin
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
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, full_name, phone, role, is_active } = await req.json();

    // Validate required fields
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format or email too long (max 255 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (role && !['admin', 'user'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be "admin" or "user"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email, 255);
    const sanitizedFullName = full_name ? sanitizeInput(full_name, 100) : null;
    const sanitizedPhone = phone ? sanitizeInput(phone, 20) : null;

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Creating user:', sanitizedEmail);

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: sanitizedFullName || sanitizedEmail.split('@')[0]
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('User created with ID:', userId);

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: sanitizedFullName,
        phone: sanitizedPhone,
        is_active: is_active !== undefined ? is_active : true,
        last_login_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Set user role
    const userRole = role || 'user';
    const { error: roleError2 } = await supabaseAdmin
      .from('user_roles')
      .update({ role: userRole })
      .eq('user_id', userId);

    if (roleError2) {
      console.error('Error setting user role:', roleError2);
      return new Response(
        JSON.stringify({ error: 'Failed to set user role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log activity
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action_type: 'user_created',
        description: `Usuário criado pelo admin ${user.email}`,
        metadata: {
          created_by: user.id,
          created_by_email: user.email,
          role: userRole,
          is_active: is_active !== undefined ? is_active : true
        }
      });

    console.log('User created successfully:', sanitizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        email: sanitizedEmail
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-user-admin function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
