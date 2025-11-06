import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IVRV2Request {
  to: string;
  from: string;
  assistantNumber: string;
  transferTimeout?: number;
  language?: string;
  style?: number;
  premium?: boolean;
  template: string;
  ncco: any[];
}

async function generateJWT(applicationId: string, privateKey: string): Promise<string> {
  try {
    let formattedKey = privateKey.trim();
    
    if (!formattedKey.includes('BEGIN PRIVATE KEY')) {
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
    }
    
    const pemContents = formattedKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
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
    const authSupabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authSupabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authSupabase = createClient(authSupabaseUrl, authSupabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const userId = user.id;
    const { 
      to, 
      from, 
      assistantNumber,
      transferTimeout = 30,
      language = "pt-PT", 
      style = 2, 
      premium = false, 
      template, 
      ncco 
    }: IVRV2Request = await req.json();

    console.log('IVR V2 Call Request:', { to, from, assistantNumber, transferTimeout, template });

    // ✅ VALIDAÇÃO DE INPUTS
    if (!to || !from || !assistantNumber || !ncco || !Array.isArray(ncco) || ncco.length === 0) {
      console.error('Missing required fields:', { to, from, assistantNumber, hasNCCO: !!ncco });
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: to, from, assistantNumber, ncco (deve ser array)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato de telefone (E.164)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to.replace(/\s/g, ''))) {
      return new Response(
        JSON.stringify({ error: 'Formato de número de destino inválido. Use formato E.164' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!phoneRegex.test(assistantNumber.replace(/\s/g, ''))) {
      return new Response(
        JSON.stringify({ error: 'Formato de número do assistente inválido. Use formato E.164 (ex: 351912345678)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Validation passed - User:', user.id, 'Template:', template);

    const applicationId = Deno.env.get('VONAGE_APPLICATION_ID');
    const privateKey = Deno.env.get('VONAGE_PRIVATE_KEY');

    if (!applicationId || !privateKey) {
      console.error('Missing Vonage credentials');
      return new Response(
        JSON.stringify({ error: 'Vonage credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar NCCO com configurações de linguagem, estilo e premium
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

    // Injetar webhook V2 com parâmetros de transferência
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const nccoWithWebhook = processedNCCO.map(action => {
      if (action.action === 'input' && supabaseUrl) {
        // Adicionar parâmetros como query string para o webhook
        const webhookUrl = new URL(`${supabaseUrl}/functions/v1/ivr-webhook-v2`);
        webhookUrl.searchParams.set('assistant_number', assistantNumber);
        webhookUrl.searchParams.set('transfer_timeout', transferTimeout.toString());
        webhookUrl.searchParams.set('from_number', from);
        
        return {
          ...action,
          eventUrl: [webhookUrl.toString()],
          eventMethod: 'POST'
        };
      }
      return action;
    });

    console.log('Processed NCCO V2:', JSON.stringify(nccoWithWebhook, null, 2));

    // Gerar JWT
    let jwt: string;
    try {
      jwt = await generateJWT(applicationId, privateKey);
      console.log('JWT generated successfully for V2 call');
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

    // Fazer chamada para Vonage API
    const vonagePayload = {
      to: [{ type: 'phone', number: to.replace(/[^0-9]/g, '') }],
      from: { type: 'phone', number: from.replace(/[^0-9]/g, '') },
      ncco: nccoWithWebhook
    };

    console.log('Vonage API Payload:', JSON.stringify(vonagePayload, null, 2));

    let vonageResponse = await fetch('https://api.vonage.com/v1/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LovableVoice-IVR-V2/1.0',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify(vonagePayload)
    });

    // Fallback para hosts alternativos se necessário
    if (vonageResponse.status === 401 || vonageResponse.status === 404 || vonageResponse.status === 403) {
      console.warn('Primary host returned', vonageResponse.status, '- trying alternative hosts');

      const endpoints = [
        'https://api.nexmo.com/v1/calls',
        'https://api-us-1.vonage.com/v1/calls',
        'https://api-eu-1.vonage.com/v1/calls'
      ];

      const commonHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LovableVoice-IVR-V2/1.0',
        'Authorization': `Bearer ${jwt}`
      };

      for (const url of endpoints) {
        console.warn('Trying endpoint:', url);
        const tryResp = await fetch(url, {
          method: 'POST',
          headers: commonHeaders,
          body: JSON.stringify(vonagePayload),
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
      console.error('Non-JSON response received (IVR V2):', textResponse.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Vonage API returned non-JSON response', details: textResponse.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await vonageResponse.json();

    if (!vonageResponse.ok) {
      console.error('Vonage API error (V2):', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to make IVR V2 call', 
          details: responseData 
        }),
        { status: vonageResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('IVR V2 call initiated successfully:', responseData);

    // Log successful IVR V2 call
    if (userId) {
      const logData = {
        user_id: userId,
        to_number: to,
        from_number: from,
        template_used: template,
        ncco: nccoWithWebhook,
        language: language,
        style: style,
        premium: premium,
        status: 'initiated',
        call_uuid: responseData.uuid,
        conversation_uuid: responseData.conversation_uuid
      };

      const { error: logError } = await authSupabase
        .from('ivr_logs')
        .insert(logData);

      if (logError) {
        console.error('Error logging IVR V2 call:', logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        uuid: responseData.uuid,
        status: responseData.status,
        conversation_uuid: responseData.conversation_uuid,
        version: 'v2',
        assistant_number: assistantNumber
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-ivr-call-v2 function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});