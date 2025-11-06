import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceCallRequest {
  to: string;
  from: string;
  text: string;
  language?: string;
  style?: number;
  premium?: boolean;
}

async function generateJWT(applicationId: string, privateKey: string): Promise<string> {
  try {
    let formattedKey = privateKey.trim();
    if (!formattedKey.includes('BEGIN PRIVATE KEY')) {
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
    }

    const pem = formattedKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['sign']
    );

    const payload = {
      application_id: applicationId,
      iat: getNumericDate(0),
      nbf: getNumericDate(0),
      exp: getNumericDate(60 * 10),
      jti: crypto.randomUUID(),
      acl: {
        paths: {
          "/v1/calls/**": {},
          "/v1/applications/**": {},
          "/v2/applications/**": {}
        }
      }
    } as const;

    const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, cryptoKey);
    return jwt;
  } catch (err) {
    console.error('Error generating JWT:', err);
    throw new Error(`Failed to generate JWT: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔒 AUTENTICAÇÃO OBRIGATÓRIA
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com o token do usuário
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const userId = user.id;
    const { to, from, text, language = "en-US", style = 0, premium = false }: VoiceCallRequest = await req.json();

    if (!to || !from || !text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, from, and text are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const applicationId = Deno.env.get('VONAGE_APPLICATION_ID');
    const privateKey = Deno.env.get('VONAGE_PRIVATE_KEY');

    if (!applicationId || !privateKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Vonage Voice credentials not configured (APPLICATION_ID/PRIVATE_KEY)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(applicationId);
    if (!isUuid) {
      console.error('Invalid VONAGE_APPLICATION_ID format. Expected Application UUID.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid VONAGE_APPLICATION_ID. Use the Application UUID (not API key or name).'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (privateKey.includes('BEGIN PUBLIC KEY')) {
      console.error('Provided key appears to be a PUBLIC key.');
      return new Response(
        JSON.stringify({ success: false, error: 'Private key is a PUBLIC key. Export the application PRIVATE key (PKCS#8).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (privateKey.includes('BEGIN RSA PRIVATE KEY')) {
      console.error('Provided key appears to be PKCS#1 (RSA PRIVATE KEY).');
      return new Response(
        JSON.stringify({ success: false, error: 'Private key is PKCS#1. Export PKCS#8 format (BEGIN PRIVATE KEY).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Making voice call from ${from} to ${to}`);

    const vonagePayload = {
      to: [{ type: "phone", number: (to || '').replace(/[^0-9]/g, '') }],
      from: { type: "phone", number: (from || '').replace(/[^0-9]/g, '') },
      ncco: [{
        action: "talk",
        text: text,
        language: language,
        style: style,
        premium: premium
      }]
    };

    let jwt: string;
    try {
      jwt = await generateJWT(applicationId, privateKey);
      console.log('JWT generated successfully for voice call');
    } catch (e) {
      console.error('Failed to generate JWT for voice call:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate authentication token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let response = await fetch('https://api.vonage.com/v1/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LovableVoice/1.0',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(vonagePayload),
    });

    console.log('Vonage API response status:', response.status);
    console.log('Response Content-Type:', response.headers.get('content-type'));

    if (response.status === 401 || response.status === 404 || response.status === 403) {
      console.warn('Primary host returned', response.status, '- trying alternative hosts');

      const payloadBody = JSON.stringify(vonagePayload);
      const commonHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LovableVoice/1.0',
        'Authorization': `Bearer ${jwt}`,
      } as const;

      const endpoints = [
        'https://api.nexmo.com/v1/calls',
        'https://api-us-1.vonage.com/v1/calls',
        'https://api-eu-1.vonage.com/v1/calls',
      ];

      for (const url of endpoints) {
        console.warn('Trying endpoint:', url);
        const tryResp = await fetch(url, {
          method: 'POST',
          headers: commonHeaders,
          body: payloadBody,
        });
        const ct = tryResp.headers.get('content-type') || '';
        if (tryResp.ok || ct.includes('application/json')) {
          response = tryResp;
          break;
        }
      }
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('Non-JSON response received:', textResponse.substring(0, 500));
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Vonage API returned non-JSON response',
          details: textResponse.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Vonage API error:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          provider: "vonage",
          error: responseData.title || responseData.detail || "Failed to make call",
          code: responseData.type,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Call initiated successfully:', responseData.uuid);

    // Log successful voice call
    if (userId) {
      const logData = {
        user_id: userId,
        to_number: to,
        from_number: from,
        message: text,
        language: language,
        style: style,
        premium: premium,
        status: 'initiated',
        call_uuid: responseData.uuid
      };

      const { error: logError } = await supabase
        .from('voice_logs')
        .insert(logData);

      if (logError) {
        console.error('Error logging voice call:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        uuid: responseData.uuid,
        status: responseData.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error making voice call:', error);
    
    // Try to log failed voice call if we have the necessary data
    try {
      const authHeader2 = req.headers.get('Authorization');
      if (authHeader2) {
        const supabaseUrl2 = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey2 = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase2 = createClient(supabaseUrl2, supabaseKey2, {
          global: { headers: { Authorization: authHeader2 } }
        });
        
        const { data: { user } } = await supabase2.auth.getUser();
        if (user) {
          const requestBody = await req.clone().json();
          const logData = {
            user_id: user.id,
            to_number: requestBody.to || '',
            from_number: requestBody.from || '',
            message: requestBody.text || '',
            language: requestBody.language || 'en-US',
            style: requestBody.style || 0,
            premium: requestBody.premium || false,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          };

          await supabase2.from('voice_logs').insert(logData);
        }
      }
    } catch (logError) {
      console.error('Error logging failed voice call:', logError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
