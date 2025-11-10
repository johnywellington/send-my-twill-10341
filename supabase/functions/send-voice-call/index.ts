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
  voiceName?: string;
  provider?: string;
  dryRun?: boolean;
  credentialId?: string;
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
    const requestBody = await req.json();
    
    // ✅ VALIDAÇÃO ROBUSTA DE INPUTS
    const validationErrors: string[] = [];
    
    // Validate provider
    const provider = (requestBody.provider || 'vonage').toString().trim().toLowerCase();
    if (!['twilio', 'vonage'].includes(provider)) {
      validationErrors.push('Provider must be either "twilio" or "vonage"');
    }
    
    // Validate to (destination number)
    const to = requestBody.to?.toString().trim();
    if (!to || to.length < 8 || to.length > 20) {
      validationErrors.push('Destination number must be 8-20 characters');
    } else if (!/^\+?[0-9\s\-\(\)]+$/.test(to)) {
      validationErrors.push('Destination number contains invalid characters');
    }
    
    // Validate from (caller ID)
    const from = requestBody.from?.toString().trim();
    if (!from || from.length < 8 || from.length > 20) {
      validationErrors.push('Caller ID must be 8-20 characters');
    } else if (!/^\+?[0-9\s\-\(\)]+$/.test(from)) {
      validationErrors.push('Caller ID contains invalid characters');
    }
    
    // Validate message text
    const text = requestBody.text?.toString().trim();
    if (!text || text.length === 0) {
      validationErrors.push('Message cannot be empty');
    } else if (text.length > 5000) {
      validationErrors.push('Message must be less than 5000 characters');
    }
    
    // Validate language
    const language = (requestBody.language || 'en-US').toString().trim();
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) {
      validationErrors.push('Invalid language code format');
    }
    
    // Validate style
    const style = typeof requestBody.style === 'number' ? requestBody.style : 0;
    if (style < 0 || style > 10) {
      validationErrors.push('Style must be between 0 and 10');
    }
    
    // Validate other fields
    const premium = requestBody.premium === true;
    const dryRun = requestBody.dryRun === true;
    const voiceName = requestBody.voiceName?.toString().trim().substring(0, 100);
    
    // Validate credentialId if provided
    const credentialId = requestBody.credentialId?.toString().trim();
    if (credentialId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentialId)) {
      validationErrors.push('Invalid credential ID format');
    }
    
    // Return validation errors
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Validation failed', 
          details: validationErrors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Request params:', { provider, credentialId, to, from });
    console.log('Provider selected:', provider);
    
    // Se voiceName foi fornecido, mapear para parâmetros Vonage válidos
    let finalLanguage = language;
    let finalStyle = style;
    let finalPremium = premium;
    
    if (voiceName) {
      // Mapeamento de vozes customizadas para parâmetros Vonage válidos
      const voiceMapping: Record<string, { language: string; style: number; premium: boolean }> = {
        'Camila': { language: 'pt-BR', style: 0, premium: true },
        'Vitória': { language: 'pt-BR', style: 1, premium: true },
        'Ricardo': { language: 'pt-BR', style: 2, premium: true },
        'Thiago': { language: 'pt-BR', style: 3, premium: true },
        'Inês': { language: 'pt-PT', style: 0, premium: true },
        'Cristiano': { language: 'pt-PT', style: 1, premium: true }
      };
      
      const voiceParams = voiceMapping[voiceName];
      if (voiceParams) {
        finalLanguage = voiceParams.language;
        finalStyle = voiceParams.style;
        finalPremium = voiceParams.premium;
        console.log(`Mapped voice '${voiceName}' to language: ${finalLanguage}, style: ${finalStyle}, premium: ${finalPremium}`);
      } else {
        console.warn(`Unknown voice '${voiceName}', using default parameters`);
      }
    }

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

    // ============ TWILIO VOICE API BRANCH ============
    if (provider === 'twilio') {
      console.log('🟦 Using Twilio Voice API');
      
      // Carregar credenciais dinamicamente baseado no credentialId
      let accountSid: string | undefined;
      let authToken: string | undefined;

      if (credentialId) {
        console.log(`🔑 Loading Twilio credentials from credentialId: ${credentialId}`);
        
        // Buscar a credential do banco
        const { data: credential, error: credError } = await supabase
          .from('provider_credentials')
          .select('secret_key, account_identifier')
          .eq('id', credentialId)
          .eq('provider', 'twilio')
          .eq('is_active', true)
          .single();

        if (credError || !credential) {
          console.error('Failed to load credential:', credError);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Credencial não encontrada ou inativa',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const secretKey = credential.secret_key;
        
        // Se é legacy, usar secrets globais
        if (secretKey === 'legacy_twilio') {
          accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
          authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        } else if (secretKey) {
          // Usar secrets específicos da credencial
          accountSid = Deno.env.get(`CRED_${secretKey}_sid`);
          authToken = Deno.env.get(`CRED_${secretKey}_token`);
        }
      } else {
        // Fallback para credenciais globais (legacy)
        accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      }
      
      console.log(`🔑 Twilio Account SID configurado: ${accountSid}`);
      
      if (!accountSid || !authToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Twilio credentials not configured (ACCOUNT_SID/AUTH_TOKEN)',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Map voice to Twilio Polly voices
      let twilioVoice = 'Polly.Joanna'; // default
      if (language === 'pt-BR') {
        if (voiceName === 'Camila') twilioVoice = 'Polly.Camila';
        else if (voiceName === 'Vitória') twilioVoice = 'Polly.Vitoria';
        else if (voiceName === 'Ricardo') twilioVoice = 'Polly.Ricardo';
        else if (voiceName === 'Thiago') twilioVoice = 'Polly.Ricardo';
        else twilioVoice = style === 1 ? 'Polly.Vitoria' : 'Polly.Camila';
      } else if (language === 'pt-PT') {
        if (voiceName === 'Cristiano') twilioVoice = 'Polly.Cristiano';
        else if (voiceName === 'Inês') twilioVoice = 'Polly.Ines';
        else twilioVoice = style === 1 ? 'Polly.Cristiano' : 'Polly.Ines';
      } else if (language === 'en-GB') {
        twilioVoice = 'Polly.Emma';
      } else if (language === 'es-ES') {
        twilioVoice = 'Polly.Lucia';
      } else if (language === 'es-US') {
        twilioVoice = 'Polly.Lupe';
      } else if (language === 'fr-FR') {
        twilioVoice = 'Polly.Celine';
      }

      console.log(`Mapped to Twilio voice: ${twilioVoice}`);

      // Build webhook URLs
      const twimlUrl = `${supabaseUrl}/functions/v1/generate-twiml?text=${encodeURIComponent(text)}&language=${encodeURIComponent(language)}&voice=${encodeURIComponent(twilioVoice)}`;
      const statusUrl = `${supabaseUrl}/functions/v1/twilio-voice-status`;

      console.log(`Making Twilio voice call from ${from} to ${to}`);

      // Call Twilio Voice API
      const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
      
      const twilioResponse = await fetch(twilioApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Url: twimlUrl,
          StatusCallback: statusUrl,
          StatusCallbackEvent: 'initiated ringing answered completed',
        }),
      });

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        console.error('Twilio API error:', errorText);
        
        // Log failed voice call
        await supabase.from('voice_logs').insert({
          user_id: userId,
          to_number: to,
          from_number: from,
          message: text,
          language: finalLanguage,
          status: 'failed',
          error_message: `Twilio API error: ${errorText}`,
          provider: 'twilio',
          voice_label: voiceName || null,
          credential_id: credentialId || null,
        });
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Twilio API error: ${twilioResponse.status}`,
            details: errorText,
            provider: 'twilio',
          }),
          { status: twilioResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const twilioData = await twilioResponse.json();
      console.log('Twilio call initiated:', twilioData.sid);

      // Log successful voice call
      await supabase.from('voice_logs').insert({
        user_id: userId,
        to_number: to,
        from_number: from,
        message: text,
        language: finalLanguage,
        status: 'initiated',
        call_uuid: twilioData.sid,
        provider: 'twilio',
        voice_label: voiceName || null,
        credential_id: credentialId || null,
      });

      return new Response(
        JSON.stringify({
          success: true,
          uuid: twilioData.sid,
          status: twilioData.status,
          provider: 'twilio',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ VONAGE VOICE API BRANCH (EXISTING CODE) ============
    console.log('🟪 Using Vonage Voice API');
    
    // Carregar credenciais dinamicamente baseado no credentialId
    let applicationId: string | undefined;
    let privateKey: string | undefined;

    if (credentialId) {
      console.log(`🔑 Loading Vonage credentials from credentialId: ${credentialId}`);
      
      // Buscar a credential do banco
      const { data: credential, error: credError } = await supabase
        .from('provider_credentials')
        .select('secret_key, account_identifier')
        .eq('id', credentialId)
        .eq('provider', 'vonage')
        .eq('is_active', true)
        .single();

      if (credError || !credential) {
        console.error('Failed to load credential:', credError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Credencial não encontrada ou inativa',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const secretKey = credential.secret_key;
      
      // Se é legacy, usar secrets globais
      if (secretKey === 'legacy_vonage') {
        applicationId = Deno.env.get('VONAGE_APPLICATION_ID');
        privateKey = Deno.env.get('VONAGE_PRIVATE_KEY');
      } else if (secretKey) {
        // Usar secrets específicos da credencial
        applicationId = Deno.env.get(`CRED_${secretKey}_app_id`);
        privateKey = Deno.env.get(`CRED_${secretKey}_private_key`);
      }
    } else {
      // Fallback para credenciais globais (legacy)
      applicationId = Deno.env.get('VONAGE_APPLICATION_ID');
      privateKey = Deno.env.get('VONAGE_PRIVATE_KEY');
    }
    
    console.log(`🔑 Vonage Application ID configurado: ${applicationId}`);

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

    console.log(`Making voice call from ${from} to ${to} with language: ${finalLanguage}, style: ${finalStyle}, premium: ${finalPremium}, dryRun: ${dryRun}`);

    // 🧪 MODO DRY-RUN: Simular chamada sem usar API
    if (dryRun) {
      console.log('🧪 DRY-RUN MODE: Skipping actual voice call');
      
      // Simular latência (100-300ms)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      const mockUuid = `mock-uuid-${Date.now()}-${crypto.randomUUID()}`;
      
      // Log dry-run voice call
      if (userId) {
        await supabase.from('voice_logs').insert({
          user_id: userId,
          to_number: to,
          from_number: from,
          message: text,
          language: finalLanguage,
          style: finalStyle,
          premium: finalPremium,
          voice_label: voiceName || null,
          status: 'dry-run',
          call_uuid: mockUuid,
          provider: provider || 'vonage',
          credential_id: credentialId || null,
        });
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          uuid: mockUuid,
          status: 'dry-run',
          dryRun: true,
          message: 'Teste realizado sem chamada real'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eventUrl = `${supabaseUrl}/functions/v1/vonage-voice-webhook`;

    // Criar payload Vonage usando APENAS language + style
    const vonagePayload = {
      to: [{ type: "phone", number: (to || '').replace(/[^0-9]/g, '') }],
      from: { type: "phone", number: (from || '').replace(/[^0-9]/g, '') },
      event_url: [eventUrl],
      ncco: [{
        action: "talk",
        text: text,
        language: finalLanguage,
        style: finalStyle,
        premium: finalPremium
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

    let responseData = await response.json();

    if (!response.ok) {
      // Enhanced error logging with rate limit details
      const rateLimitHeaders = {
        limit: response.headers.get('X-RateLimit-Limit'),
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: response.headers.get('X-RateLimit-Reset')
      };
      
      console.error('Vonage API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        rateLimitHeaders,
        timestamp: new Date().toISOString(),
        to,
        from
      });

      // Log failed voice call
      if (userId) {
        await supabase.from('voice_logs').insert({
          user_id: userId,
          to_number: to,
          from_number: from,
          message: text,
          language: finalLanguage,
          style: finalStyle,
          premium: finalPremium,
          status: 'failed',
          error_message: responseData.title || responseData.detail || "Failed to make call",
          voice_label: voiceName || undefined,
          provider: 'vonage',
          credential_id: credentialId || null,
        });
      }

      const isRetryable = response.status === 429 || response.status === 403;
      
      return new Response(
        JSON.stringify({
          success: false,
          provider: "vonage",
          error: responseData.title || responseData.detail || "Failed to make call",
          code: responseData.type,
          status: response.status,
          retryable: isRetryable,
          rateLimitInfo: rateLimitHeaders
        }),
        {
          status: response.status,
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
        language: finalLanguage,
        style: finalStyle,
        premium: finalPremium,
        voice_label: voiceName || null,
        status: 'initiated',
        call_uuid: responseData.uuid,
        provider: 'vonage',
        credential_id: credentialId || null,
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
        provider: 'vonage'
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
