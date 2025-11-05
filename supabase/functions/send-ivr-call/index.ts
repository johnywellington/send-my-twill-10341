import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IVRRequest {
  to: string;
  from: string;
  language?: string;
  style?: number;
  premium?: boolean;
  template: string;
  ncco: any[];
}

// Função para gerar JWT para autenticação Vonage usando djwt
async function generateJWT(applicationId: string, privateKey: string): Promise<string> {
  try {
    // Garantir que a private key está no formato correto
    let formattedKey = privateKey.trim();
    
    // Se não tiver os headers, adicionar
    if (!formattedKey.includes('BEGIN PRIVATE KEY')) {
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
    }
    
    // Importar a chave privada usando Web Crypto API
    // Remover headers e quebras de linha
    const pemContents = formattedKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    // Decodificar base64
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Importar como CryptoKey
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      true,
      ['sign']
    );
    
    // Criar payload (Vonage Voice JWT)
    const payload = {
      application_id: applicationId,
      iat: getNumericDate(0), // now
      nbf: getNumericDate(0),
      exp: getNumericDate(60 * 10), // 10 minutos
      jti: crypto.randomUUID(),
      acl: {
        paths: {
          "/v1/calls/**": {},
          "/v1/applications/**": {},
          "/v2/applications/**": {}
        }
      }
    } as const;
    
    // Gerar JWT
    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      payload,
      cryptoKey
    );
    
    return jwt;
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw new Error(`Failed to generate JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, from, language = "pt-BR", style = 2, premium = false, template, ncco }: IVRRequest = await req.json();

    // Validar campos obrigatórios
    if (!to || !from || !ncco || !Array.isArray(ncco) || ncco.length === 0) {
      console.error('Missing required fields:', { to, from, hasNCCO: !!ncco });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, from, and ncco are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter credenciais do Vonage
    const applicationId = Deno.env.get('VONAGE_APPLICATION_ID');
    const privateKey = Deno.env.get('VONAGE_PRIVATE_KEY');

    if (!applicationId || !privateKey) {
      console.error('Missing Vonage credentials');
      return new Response(
        JSON.stringify({ error: 'Vonage credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Application ID (UUID) and Private Key format
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(applicationId);
    if (!isUuid) {
      console.error('Invalid VONAGE_APPLICATION_ID format (expected Application UUID)');
      return new Response(
        JSON.stringify({ error: 'Invalid VONAGE_APPLICATION_ID. Use the Application UUID (not API key or name).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (privateKey.includes('BEGIN PUBLIC KEY')) {
      console.error('Provided key appears to be a PUBLIC key.');
      return new Response(
        JSON.stringify({ error: 'Provided key is PUBLIC. Export the application PRIVATE key (PKCS#8).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (privateKey.includes('BEGIN RSA PRIVATE KEY')) {
      console.error('Provided key appears to be PKCS#1 (RSA PRIVATE KEY).');
      return new Response(
        JSON.stringify({ error: 'Private key is PKCS#1. Export PKCS#8 format (BEGIN PRIVATE KEY).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Making IVR call from ${from} to ${to} with template: ${template}`);

    // Processar NCCO para adicionar configurações de idioma, estilo e premium
    const processedNCCO = ncco.map(action => {
      if (action.action === 'talk') {
        return {
          ...action,
          language: action.language || language,
          style: action.style !== undefined ? action.style : style,
          premium: action.premium !== undefined ? action.premium : premium
        };
      }
      return action;
    });

    // Adicionar eventUrl ao webhook se houver ações de input
    const projectRef = Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0];
    const nccoWithWebhook = processedNCCO.map(action => {
      if (action.action === 'input' && projectRef) {
        return {
          ...action,
          eventUrl: [`${Deno.env.get('SUPABASE_URL')}/functions/v1/ivr-webhook`]
        };
      }
      return action;
    });

    console.log('Processed NCCO:', JSON.stringify(nccoWithWebhook, null, 2));

    // Gerar JWT para autenticação
    let jwt: string;
    try {
      jwt = await generateJWT(applicationId, privateKey);
      console.log('JWT generated successfully');
    } catch (error) {
      console.error('Failed to generate JWT:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate authentication token',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fazer requisição para API do Vonage Voice (tenta domínio moderno)
    let vonageResponse = await fetch('https://api.vonage.com/v1/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LovableVoice/1.0',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        to: [{ type: 'phone', number: (to || '').replace(/[^0-9]/g, '') }],
        from: { type: 'phone', number: (from || '').replace(/[^0-9]/g, '') },
        ncco: nccoWithWebhook
      })
    });

    // Fallback para domínio legacy se necessário
    if (vonageResponse.status === 401 || vonageResponse.status === 404 || vonageResponse.status === 403) {
      console.warn('Primary host returned', vonageResponse.status, '- trying alternative hosts');

      const payloadBody = JSON.stringify({
        to: [{ type: 'phone', number: (to || '').replace(/[^0-9]/g, '') }],
        from: { type: 'phone', number: (from || '').replace(/[^0-9]/g, '') },
        ncco: nccoWithWebhook
      });

      const commonHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LovableVoice/1.0',
        'Authorization': `Bearer ${jwt}`
      } as const;

      const endpoints = [
        'https://api.nexmo.com/v1/calls',
        'https://api-us-1.vonage.com/v1/calls',
        'https://api-eu-1.vonage.com/v1/calls'
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
          vonageResponse = tryResp;
          break;
        }
      }
    }

    const contentType = vonageResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await vonageResponse.text();
      console.error('Non-JSON response received (IVR):', textResponse.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Vonage API returned non-JSON response', details: textResponse.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await vonageResponse.json();

    if (!vonageResponse.ok) {
      console.error('Vonage API error:', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to make IVR call', 
          details: responseData 
        }),
        { status: vonageResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('IVR call initiated successfully:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        uuid: responseData.uuid,
        status: responseData.status,
        conversation_uuid: responseData.conversation_uuid
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-ivr-call function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
