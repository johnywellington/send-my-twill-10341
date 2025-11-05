import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Função para gerar JWT para autenticação Vonage
function generateJWT(applicationId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (15 * 60); // 15 minutos
  
  // Header
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  
  // Payload
  const payload = {
    application_id: applicationId,
    iat: now,
    exp: exp,
    jti: crypto.randomUUID()
  };
  
  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const message = `${headerB64}.${payloadB64}`;
  
  // Import private key and sign
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  
  // Para ambiente Deno, usamos Web Crypto API
  // Nota: Isso é uma simplificação. Em produção, use uma biblioteca JWT adequada
  const signatureB64 = btoa(message).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${message}.${signatureB64}`;
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

    // Gerar JWT (simplificado - em produção use uma biblioteca adequada)
    // Por enquanto, vamos usar a API Key/Secret como fallback
    const apiKey = Deno.env.get('VONAGE_API_KEY');
    const apiSecret = Deno.env.get('VONAGE_API_SECRET');

    if (!apiKey || !apiSecret) {
      console.error('Missing Vonage API credentials');
      return new Response(
        JSON.stringify({ error: 'Vonage API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fazer requisição para API do Vonage Voice
    const vonageResponse = await fetch('https://api.nexmo.com/v1/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${apiKey}:${apiSecret}`)}`
      },
      body: JSON.stringify({
        to: [{
          type: 'phone',
          number: to
        }],
        from: {
          type: 'phone',
          number: from
        },
        ncco: nccoWithWebhook
      })
    });

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
