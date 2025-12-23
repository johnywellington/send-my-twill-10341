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

    const { parentCredentialId, subaccountName, useParentBalance, secret } = await req.json();

    // Fetch parent credential
    const { data: parentCredential, error: credError } = await supabaseClient
      .from('provider_credentials')
      .select('*')
      .eq('id', parentCredentialId)
      .single();

    if (credError || !parentCredential) {
      throw new Error('Parent credential not found');
    }

    let subaccountData: any = {};

    if (parentCredential.provider === 'twilio') {
      // Create Twilio subaccount
      const authHeader = btoa(`${parentCredential.account_identifier}:${parentCredential.secret_key}`);
      
      const twilioResponse = await fetch(
        'https://api.twilio.com/2010-04-01/Accounts.json',
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `FriendlyName=${encodeURIComponent(subaccountName)}`,
        }
      );

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        throw new Error(`Twilio API error: ${errorText}`);
      }

      const twilioData = await twilioResponse.json();
      
      subaccountData = {
        subaccount_sid: twilioData.sid,
        subaccount_api_secret: twilioData.auth_token,
        api_metadata: twilioData,
      };

    } else if (parentCredential.provider === 'vonage') {
      // Create Vonage subaccount
      const authHeader = btoa(`${parentCredential.account_identifier}:${parentCredential.secret_key}`);
      
      const vonagePayload: any = {
        name: subaccountName,
        use_primary_account_balance: useParentBalance ?? true,
      };

      if (secret) {
        vonagePayload.secret = secret;
      }

      const vonageResponse = await fetch(
        `https://api.nexmo.com/accounts/${parentCredential.account_identifier}/subaccounts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(vonagePayload),
        }
      );

      if (!vonageResponse.ok) {
        const errorText = await vonageResponse.text();
        throw new Error(`Vonage API error: ${errorText}`);
      }

      const vonageData = await vonageResponse.json();
      
      subaccountData = {
        subaccount_api_key: vonageData.api_key,
        subaccount_api_secret: vonageData.secret || vonageData.api_secret,
        api_metadata: vonageData,
      };
    } else {
      throw new Error('Unsupported provider');
    }

    // Save to database
    const { data: newSubaccount, error: insertError } = await supabaseClient
      .from('provider_subaccounts')
      .insert({
        parent_credential_id: parentCredentialId,
        user_id: user.id,
        provider: parentCredential.provider,
        subaccount_name: subaccountName,
        use_parent_balance: useParentBalance ?? true,
        ...subaccountData,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log(`Subaccount created successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, subaccount: newSubaccount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating subaccount:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});