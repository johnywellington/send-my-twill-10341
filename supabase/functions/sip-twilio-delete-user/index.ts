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
    
    console.log('[Twilio Delete] Starting deletion for SIP user:', sip_user_id);

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

    console.log('[Twilio Delete] User data:', {
      username: sipUser.sip_username,
      credlist_sid: sipUser.twilio_credlist_sid,
      credential_sid: sipUser.twilio_credential_sid
    });

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    // Delete from Twilio API if we have the IDs
    if (sipUser.twilio_credential_sid && sipUser.twilio_credlist_sid) {
      // Delete Credential
      const credDeleteResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists/${sipUser.twilio_credlist_sid}/Credentials/${sipUser.twilio_credential_sid}.json`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
          },
        }
      );

      if (!credDeleteResponse.ok && credDeleteResponse.status !== 404) {
        const error = await credDeleteResponse.text();
        console.warn('[Twilio Delete] Failed to delete credential:', error);
      } else {
        console.log('[Twilio Delete] ✓ Credential deleted');
      }

      // Delete CredentialList
      const listDeleteResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists/${sipUser.twilio_credlist_sid}.json`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
          },
        }
      );

      if (!listDeleteResponse.ok && listDeleteResponse.status !== 404) {
        const error = await listDeleteResponse.text();
        console.warn('[Twilio Delete] Failed to delete credential list:', error);
      } else {
        console.log('[Twilio Delete] ✓ CredentialList deleted');
      }
    } else {
      console.log('[Twilio Delete] ⚠️ Missing Twilio IDs, skipping API deletion');
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('sip_users')
      .delete()
      .eq('id', sip_user_id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    console.log('[Twilio Delete] ✓ User deleted from database');

    // Log event
    await supabase.functions.invoke('log-sip-event', {
      body: {
        event_type: 'user_deleted',
        event_category: 'user',
        user_id: user.id,
        domain_group_id: sipUser.domain_group_id,
        provider: 'twilio',
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
    console.error('[Twilio Delete] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to delete user'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
