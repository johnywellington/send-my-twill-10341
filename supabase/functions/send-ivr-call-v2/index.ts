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
  voiceName?: string;
  dryRun?: boolean;
  provider?: 'twilio' | 'vonage';
  credentialId?: string;
  actions?: {
    action1?: 'hangup' | 'talk' | 'transfer';
    action1Message?: string;
    action2?: 'hangup' | 'talk' | 'transfer';
    action2Message?: string;
    actionTimeout?: 'repeat' | 'hangup' | 'transfer';
  };
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
      iat: getNumericDate(-10), // clock skew buffer
      nbf: getNumericDate(-10), // clock skew buffer
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
      ncco,
      voiceName,
      dryRun = false,
      provider = 'vonage',
      credentialId,
      actions
    }: IVRV2Request = await req.json();
    
    console.log(`🔑 Provider selected: ${provider}`);
    
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
        console.log(`IVR: Mapped voice '${voiceName}' to language: ${finalLanguage}, style: ${finalStyle}, premium: ${finalPremium}`);
      } else {
        console.warn(`IVR: Unknown voice '${voiceName}', using default parameters`);
      }
    }

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

    // ========== TWILIO IVR ==========
    if (provider === 'twilio') {
      console.log('🟦 Using Twilio IVR API');
      
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      
      console.log(`🔑 Twilio Account SID configured: ${accountSid}`);

      if (!accountSid || !authToken) {
        return new Response(
          JSON.stringify({ error: 'Twilio credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mapear voz Vonage para Twilio
      let twilioVoice = 'Polly.Cristiano';
      let twilioLanguage = language;
      
      if (voiceName) {
        // Mapeamento simples de vozes
        const voiceMap: Record<string, string> = {
          'Camila': 'Polly.Camila',
          'Vitória': 'Polly.Vitoria',
          'Ricardo': 'Polly.Ricardo',
          'Thiago': 'Polly.Thiago',
          'Inês': 'Polly.Ines',
          'Cristiano': 'Polly.Cristiano',
          'Joanna': 'Polly.Joanna',
          'Matthew': 'Polly.Matthew'
        };
        
        twilioVoice = voiceMap[voiceName] || twilioVoice;
        console.log(`Mapped voice '${voiceName}' to Twilio voice: ${twilioVoice}`);
      }

      // Construir URL do TwiML generator
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const twimlUrl = new URL(`${supabaseUrl}/functions/v1/generate-twiml-ivr`);
      
      // Extrair mensagem do NCCO
      const talkAction = ncco.find(action => action.action === 'talk');
      const messageText = talkAction?.text || 'Bem-vindo ao sistema IVR.';
      
      // Extrair configurações de input do NCCO
      const inputAction = ncco.find(action => action.action === 'input');
      const captureInput = !!inputAction;
      const maxDigits = inputAction?.dtmf?.maxDigits?.toString() || '1';
      const inputTimeout = inputAction?.dtmf?.timeOut?.toString() || '10';
      
      // Parâmetros do TwiML
      twimlUrl.searchParams.set('text', messageText);
      twimlUrl.searchParams.set('language', twilioLanguage);
      twimlUrl.searchParams.set('voice', twilioVoice);
      twimlUrl.searchParams.set('capture_input', captureInput.toString());
      twimlUrl.searchParams.set('max_digits', maxDigits);
      twimlUrl.searchParams.set('timeout', inputTimeout);
      twimlUrl.searchParams.set('assistant_number', assistantNumber);
      twimlUrl.searchParams.set('transfer_timeout', transferTimeout.toString());
      twimlUrl.searchParams.set('from_number', from);
      twimlUrl.searchParams.set('supabase_url', supabaseUrl!);
      
      // Adicionar ações se fornecidas
      if (actions) {
        if (actions.action1) twimlUrl.searchParams.set('action1', actions.action1);
        if (actions.action1Message) twimlUrl.searchParams.set('action1_message', actions.action1Message);
        if (actions.action2) twimlUrl.searchParams.set('action2', actions.action2);
        if (actions.action2Message) twimlUrl.searchParams.set('action2_message', actions.action2Message);
      }

      console.log('TwiML URL:', twimlUrl.toString());

      // DRY-RUN para Twilio
      if (dryRun) {
        console.log('🧪 DRY-RUN MODE: Skipping actual Twilio IVR call');
        
        const mockSid = `mock-twilio-ivr-${Date.now()}`;
        
        if (userId) {
          await authSupabase.from('ivr_logs').insert({
            user_id: userId,
            to_number: to,
            from_number: from,
            template_used: template,
            ncco: ncco,
            language: finalLanguage,
            style: finalStyle,
            premium: finalPremium,
            voice_label: voiceName || null,
            status: 'dry-run',
            call_uuid: mockSid,
            conversation_uuid: mockSid,
            provider: 'twilio',
            credential_id: credentialId || null,
          });
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            uuid: mockSid,
            status: 'dry-run',
            conversation_uuid: mockSid,
            version: 'v2',
            provider: 'twilio',
            dryRun: true,
            message: 'Teste realizado sem chamada Twilio IVR real'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fazer chamada para API do Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
      const twilioAuth = btoa(`${accountSid}:${authToken}`);

      const twilioPayload = new URLSearchParams({
        To: to.startsWith('+') ? to : `+${to.replace(/[^0-9]/g, '')}`,
        From: from.startsWith('+') ? from : `+${from.replace(/[^0-9]/g, '')}`,
        Url: twimlUrl.toString(),
        StatusCallback: `${supabaseUrl}/functions/v1/twilio-voice-status`,
        StatusCallbackMethod: 'POST'
      });
      
      // Adicionar múltiplos eventos de status (Twilio aceita múltiplos parâmetros com mesmo nome)
      twilioPayload.append('StatusCallbackEvent', 'initiated');
      twilioPayload.append('StatusCallbackEvent', 'ringing');
      twilioPayload.append('StatusCallbackEvent', 'answered');
      twilioPayload.append('StatusCallbackEvent', 'completed');

      console.log('Twilio IVR Call Payload:', Object.fromEntries(twilioPayload));

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${twilioAuth}`
        },
        body: twilioPayload
      });

      const twilioData = await twilioResponse.json();

      if (!twilioResponse.ok) {
        console.error('Twilio API error:', twilioData);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to initiate Twilio IVR call', 
            details: twilioData 
          }),
          { status: twilioResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Twilio IVR call initiated:', twilioData.sid);

      // Log chamada Twilio IVR
      if (userId) {
        await authSupabase.from('ivr_logs').insert({
          user_id: userId,
          to_number: to,
          from_number: from,
          template_used: template,
          ncco: ncco,
          language: twilioLanguage,
          style: 0,
          premium: false,
          voice_label: voiceName || null,
          status: 'initiated',
          call_uuid: twilioData.sid,
          conversation_uuid: twilioData.sid,
          provider: 'twilio',
          credential_id: credentialId || null,
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          uuid: twilioData.sid,
          status: twilioData.status,
          conversation_uuid: twilioData.sid,
          version: 'v2',
          provider: 'twilio',
          assistant_number: assistantNumber
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== VONAGE IVR (Original) ==========
    console.log('🟩 Using Vonage IVR API');
    
    const applicationId = Deno.env.get('VONAGE_APPLICATION_ID');
    const privateKey = Deno.env.get('VONAGE_PRIVATE_KEY');
    
    console.log(`🔑 Vonage Application ID configured: ${applicationId}`);

    if (!applicationId || !privateKey) {
      console.error('Missing Vonage credentials');
      return new Response(
        JSON.stringify({ error: 'Vonage credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar NCCO com configurações de linguagem, estilo e premium (usar APENAS language + style)
    const processedNCCO = ncco.map(action => {
      if (action.action === 'talk') {
        return {
          ...action,
          language: action.language || finalLanguage,
          style: action.style !== undefined ? action.style : finalStyle,
          premium: action.premium !== undefined ? action.premium : finalPremium
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

    // 🧪 MODO DRY-RUN: Simular IVR V2 sem usar API
    if (dryRun) {
      console.log('🧪 DRY-RUN MODE: Skipping actual IVR V2 call');
      
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      const mockUuid = `mock-ivr-v2-${Date.now()}-${crypto.randomUUID()}`;
      const mockConvUuid = `mock-conv-v2-${Date.now()}-${crypto.randomUUID()}`;
      
      // Log dry-run IVR V2 call
      if (userId) {
      await authSupabase.from('ivr_logs').insert({
          user_id: userId,
          to_number: to,
          from_number: from,
          template_used: template,
          ncco: nccoWithWebhook,
          language: finalLanguage,
          style: finalStyle,
          premium: finalPremium,
          voice_label: voiceName || null,
          status: 'dry-run',
          call_uuid: mockUuid,
          conversation_uuid: mockConvUuid,
          provider: 'vonage',
          credential_id: credentialId || null,
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          uuid: mockUuid,
          status: 'dry-run',
          conversation_uuid: mockConvUuid,
          version: 'v2',
          assistant_number: assistantNumber,
          dryRun: true,
          message: 'Teste realizado sem chamada IVR V2 real'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar JWT
    let jwt: string;
    try {
      jwt = await generateJWT(applicationId, privateKey);
      console.log('JWT generated successfully for V2 call');
      console.log('Using Application ID:', applicationId);
      console.log('Private key length:', privateKey.length, 'chars');
    } catch (error) {
      console.error('Failed to generate JWT:', error);
      console.error('Application ID:', applicationId);
      console.error('Private key format check - starts with:', privateKey.substring(0, 30));
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
      ncco: nccoWithWebhook,
      event_url: [`${supabaseUrl}/functions/v1/vonage-voice-webhook`],
      event_method: 'POST'
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

    // If Unauthorized, regenerate JWT once and retry primary endpoint (handles clock skew/transient auth)
    if (vonageResponse.status === 401) {
      console.warn('401 from primary endpoint - regenerating JWT and retrying once');
      try {
        jwt = await generateJWT(applicationId, privateKey);
        vonageResponse = await fetch('https://api.vonage.com/v1/calls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'LovableVoice-IVR-V2/1.0',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify(vonagePayload)
        });
      } catch (retryErr) {
        console.error('Retry after regenerating JWT failed:', retryErr);
      }
    }

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

    let responseData = await vonageResponse.json();

    if (!vonageResponse.ok) {
      console.error('Vonage API error (V2):', responseData);
      console.error('Status code:', vonageResponse.status);
      console.error('Application ID used:', applicationId);
      
      // Mensagem de erro específica para 401/403
      let errorHint = '';
      if (vonageResponse.status === 401 || vonageResponse.status === 403) {
        errorHint = ' Possible causes: 1) Invalid VONAGE_APPLICATION_ID, 2) Invalid VONAGE_PRIVATE_KEY, 3) Key does not match the application, 4) Application not configured for Voice API. Please verify your Vonage credentials in Secrets.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to make IVR V2 call' + errorHint, 
          details: responseData,
          status_code: vonageResponse.status
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
        language: finalLanguage,
        style: finalStyle,
        premium: finalPremium,
        voice_label: voiceName || null,
        status: 'initiated',
        call_uuid: responseData.uuid,
        conversation_uuid: responseData.conversation_uuid,
        credential_id: credentialId || null,
      };

      const { error: logError } = await authSupabase
        .from('ivr_logs')
        .insert({
          ...logData,
          provider: 'vonage'
        });

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
        provider: 'vonage',
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