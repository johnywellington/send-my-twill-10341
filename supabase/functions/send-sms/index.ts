import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsRequest {
  to: string;
  from: string;
  body: string;
  provider?: "twilio" | "vonage";
  dryRun?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SMS Send Request Started ===');

    // 🔒 AUTENTICAÇÃO OBRIGATÓRIA
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Criar cliente Supabase com o token do usuário
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verificar se o usuário está autenticado (usar token explícito para evitar AuthSessionMissingError)
    const jwt = authHeader.replace('Bearer', '').trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { to, from, body, provider = "twilio", dryRun = false }: SmsRequest = await req.json();

    console.log('SMS details:', { to, from, bodyLength: body.length, provider, dryRun });

    // ✅ VALIDAÇÃO DE INPUTS
    if (!to || !from || !body) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios faltando: destinatário, remetente ou mensagem' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validar formato de telefone de destino (E.164: +[país][número])
    // Exige mínimo de 10 dígitos totais para evitar números muito curtos
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    
    // Validar Sender ID alfanumérico (3-11 caracteres, apenas letras e números)
    const senderIdRegex = /^[A-Za-z0-9]{3,11}$/;
    
    // Função para validar "from" (aceita número E.164 OU Sender ID alfanumérico)
    const isValidFrom = (from: string): boolean => {
      const cleanFrom = from.replace(/\s/g, '');
      // Para números, usar regex mais permissivo (mínimo 7 dígitos para alguns países)
      const fromPhoneRegex = /^\+?[1-9]\d{6,14}$/;
      return fromPhoneRegex.test(cleanFrom) || senderIdRegex.test(cleanFrom);
    };

    // Validar "to" (destino sempre deve ser número E.164 completo)
    const cleanTo = to.replace(/\s/g, '');
    if (!phoneRegex.test(cleanTo)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Número de destino inválido. Use formato internacional completo com código do país (ex: +351911019866 para Portugal, +5511999999999 para Brasil). Mínimo 10 dígitos.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Validar "from" (aceita número E.164 OU Sender ID alfanumérico)
    if (!isValidFrom(from)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Formato de origem inválido. Use um Sender ID (3-11 caracteres alfanuméricos) ou número internacional (+351911019860)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validar tamanho da mensagem (máximo 1600 caracteres = 10 SMS)
    if (body.length > 1600) {
      return new Response(
        JSON.stringify({ success: false, error: 'Mensagem muito longa. Máximo: 1600 caracteres' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('✅ Validation passed - User:', user.id, 'Provider:', provider);
    
    const userId = user.id;
    let response;
    
    // 🧪 MODO DRY-RUN: Simular envio sem chamar API
    if (dryRun) {
      console.log('🧪 DRY-RUN MODE: Skipping actual SMS send');
      
      // Simular latência (50-200ms)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
      
      const mockMessageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Log dry-run SMS
      if (userId) {
        await supabase.from('sms_logs').insert({
          user_id: userId,
          to_number: to,
          from_number: from,
          message: body,
          provider: provider,
          status: 'dry-run',
          external_id: mockMessageId
        });
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          messageSid: mockMessageId,
          status: 'dry-run',
          provider: provider,
          dryRun: true,
          message: 'Teste realizado sem envio real'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    if (provider === "vonage") {
      // Get Vonage credentials from environment
      const apiKey = Deno.env.get('VONAGE_API_KEY');
      const apiSecret = Deno.env.get('VONAGE_API_SECRET');

      if (!apiKey || !apiSecret) {
        console.error('Missing Vonage credentials');
        return new Response(
          JSON.stringify({ success: false, error: 'Credenciais Vonage não configuradas' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      console.log('Using Vonage provider');

      // Send SMS via Vonage
      const vonageUrl = 'https://rest.nexmo.com/sms/json';
      const webhookUrl = `${supabaseUrl}/functions/v1/vonage-sms-webhook`;
      
      const vonageResponse = await fetch(vonageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          to: to.replace('+', ''),
          from: from.replace('+', ''),
          text: body,
          callback: webhookUrl,
        }),
      });

      const vonageData = await vonageResponse.json();

      if (!vonageResponse.ok || vonageData.messages?.[0]?.status !== "0") {
        console.error('Vonage API error:', vonageData);
        const errorText = vonageData.messages?.[0]?.['error-text'] || 'Failed to send SMS via Vonage';
        return new Response(
          JSON.stringify({ success: false, provider: 'vonage', error: errorText, code: vonageData.messages?.[0]?.status }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('SMS sent successfully via Vonage:', vonageData.messages[0]['message-id']);

      response = {
        success: true,
        messageSid: vonageData.messages[0]['message-id'],
        status: 'sent',
        provider: 'vonage'
      };
    } else {
      // Get Twilio credentials from environment
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (!accountSid || !authToken) {
        console.error('Missing Twilio credentials');
        return new Response(
          JSON.stringify({ success: false, error: 'Credenciais Twilio não configuradas. Por favor, configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN.' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      console.log('Using Twilio provider');

      // Create Twilio API request
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const webhookUrl = `${supabaseUrl}/functions/v1/twilio-sms-webhook`;
      
      // Normalizar números para formato E.164 (Twilio exige + no início)
      const normalizedTo = to.startsWith('+') ? to : `+${to}`;
      const normalizedFrom = from.startsWith('+') ? from : `+${from}`;
      
      const formData = new URLSearchParams();
      formData.append('To', normalizedTo);
      formData.append('From', normalizedFrom);
      formData.append('Body', body);
      formData.append('StatusCallback', webhookUrl);

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio API error:', twilioData);
      const status = typeof twilioData.status === 'number' ? twilioData.status : 400;
      return new Response(
        JSON.stringify({ success: false, provider: 'twilio', code: twilioData.code, error: twilioData.message || 'Failed to send SMS via Twilio' }),
        { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

      console.log('SMS sent successfully via Twilio:', twilioData.sid);

      response = {
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
        provider: 'twilio'
      };
    }

    // Log successful SMS
    if (userId) {
      const logData = {
        user_id: userId,
        to_number: to,
        from_number: from,
        message: body,
        provider: provider,
        status: 'sent',
        external_id: response.messageSid
      };

      const { error: logError } = await supabase
        .from('sms_logs')
        .insert(logData);

      if (logError) {
        console.error('Error logging SMS:', logError);
      }
    }

    console.log('SMS sent successfully');
    console.log('=== SMS Send Request Completed ===');

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-sms function:', error);
    
    // Try to log failed SMS if we have the necessary data
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
            message: requestBody.body || '',
            provider: requestBody.provider || 'twilio',
            status: 'failed',
            error_message: error.message
          };

          await supabase2.from('sms_logs').insert(logData);
        }
      }
    } catch (logError) {
      console.error('Error logging failed SMS:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
