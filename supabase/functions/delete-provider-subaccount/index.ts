import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { subaccountId } = await req.json();

    // Fetch subaccount with parent credential
    const { data: subaccount, error: fetchError } = await supabaseClient
      .from('provider_subaccounts')
      .select(`
        *,
        parent_credential:provider_credentials!parent_credential_id(*)
      `)
      .eq('id', subaccountId)
      .single();

    if (fetchError || !subaccount) {
      throw new Error('Subaccount not found');
    }

    const parentCredential = subaccount.parent_credential;

    if (subaccount.provider === 'twilio' && subaccount.subaccount_sid) {
      // Close Twilio subaccount
      const authHeader = btoa(`${parentCredential.account_identifier}:${parentCredential.secret_key}`);
      
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${subaccount.subaccount_sid}.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'Status=closed',
        }
      );

      if (!twilioResponse.ok) {
        console.warn('Failed to close Twilio subaccount via API:', await twilioResponse.text());
      }

    } else if (subaccount.provider === 'vonage' && subaccount.subaccount_api_key) {
      // Delete Vonage subaccount
      const authHeader = btoa(`${parentCredential.account_identifier}:${parentCredential.secret_key}`);
      
      const vonageResponse = await fetch(
        `https://api.nexmo.com/accounts/${parentCredential.account_identifier}/subaccounts/${subaccount.subaccount_api_key}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${authHeader}`,
          },
        }
      );

      if (!vonageResponse.ok) {
        console.warn('Failed to delete Vonage subaccount via API:', await vonageResponse.text());
      }
    }

    // Delete from database (cascade will handle logs)
    const { error: deleteError } = await supabaseClient
      .from('provider_subaccounts')
      .delete()
      .eq('id', subaccountId);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`Subaccount deleted successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting subaccount:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});