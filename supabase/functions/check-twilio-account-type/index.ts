import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      console.error('[Twilio Account Check] Missing credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Credenciais Twilio não configuradas',
          trial: true, // Assume trial por segurança
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[Twilio Account Check] Checking account type for:', accountSid.substring(0, 10) + '...');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Twilio Account Check] API error:', error);
      throw new Error(`Twilio API error: ${response.status}`);
    }

    const account = await response.json();

    const isTrial = account.type === 'Trial';
    const status = account.status;
    const friendlyName = account.friendly_name;

    console.log('[Twilio Account Check] Account info:', {
      type: account.type,
      status,
      isTrial,
      friendlyName,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        trial: isTrial,
        status,
        friendlyName,
        accountSid: accountSid.substring(0, 10) + '...' // Parcial por segurança
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Twilio Account Check] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        trial: true, // Assume trial em caso de erro por segurança
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
