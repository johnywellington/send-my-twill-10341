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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Extrair credentialId do body (opcional)
    const body = req.method === 'POST' ? await req.json() : {};
    const credentialId = body.credentialId;

    let accountSid: string | undefined;
    let authToken: string | undefined;

    if (credentialId) {
      // Buscar credencial específica
      const { data: credential, error: credError } = await supabaseClient
        .from('provider_credentials')
        .select('*')
        .eq('id', credentialId)
        .eq('provider', 'twilio')
        .single();

      if (credError || !credential) {
        console.error('[Twilio Account Check] Credencial não encontrada:', credError);
        throw new Error('Credencial não encontrada');
      }

      const secretKey = credential.secret_key;
      if (!secretKey) {
        throw new Error('Secret key não configurada para esta credencial');
      }

      accountSid = Deno.env.get(`CRED_${secretKey}_SID`);
      authToken = Deno.env.get(`CRED_${secretKey}_TOKEN`);
    } else {
      // Fallback para credenciais globais
      accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    }

    if (!accountSid || !authToken) {
      console.warn('[Twilio Account Check] Credentials not configured, assuming full account');
      return new Response(
        JSON.stringify({ 
          success: true,
          trial: false, // Assume full account when credentials not configured
          status: 'unknown',
          message: 'Credenciais não configuradas - assumindo conta completa'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
