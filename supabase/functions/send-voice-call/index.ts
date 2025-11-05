import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

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

// Gera JWT para autenticação no Vonage Voice API
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
      sub: applicationId,
      iss: applicationId,
      iat: getNumericDate(0),
      nbf: getNumericDate(0),
      exp: getNumericDate(60 * 15),
      jti: crypto.randomUUID(),
    } as const;

    const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, cryptoKey);
    return jwt;
  } catch (err) {
    console.error('Error generating JWT:', err);
    throw new Error(`Failed to generate JWT: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, from, text, language = "en-US", style = 0, premium = false }: VoiceCallRequest = await req.json();

    // Validate required fields
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

    // Credenciais via Application ID e Private Key
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

    console.log(`Making voice call from ${from} to ${to}`);

    // Prepare Vonage Voice API request
    const vonagePayload = {
      to: [{ type: "phone", number: to }],
      from: { type: "phone", number: from },
      ncco: [{
        action: "talk",
        text: text,
        language: language,
        style: style,
        premium: premium
      }]
    };

    // Gerar JWT e chamar a API (com fallback de host)
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
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(vonagePayload),
    });

    if (response.status === 401 || response.status === 404) {
      console.warn('Primary host returned', response.status, '- trying legacy host api.nexmo.com');
      response = await fetch('https://api.nexmo.com/v1/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(vonagePayload),
      });
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
      );
  }
});