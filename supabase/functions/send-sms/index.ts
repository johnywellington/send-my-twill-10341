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

    const { to, from, body, provider = "twilio" }: SmsRequest = await req.json();

    console.log('SMS details:', { to, from, bodyLength: body.length, provider });

    // ✅ VALIDAÇÃO DE INPUTS
    if (!to || !from || !body) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios faltando: destinatário, remetente ou mensagem' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validar formato de telefone de destino (E.164: +[país][número])
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    
    // Validar Sender ID alfanumérico (3-11 caracteres, apenas letras e números)
    const senderIdRegex = /^[A-Za-z0-9]{3,11}$/;
    
    // Função para validar "from" (aceita número E.164 OU Sender ID alfanumérico)
    const isValidFrom = (from: string): boolean => {
      const cleanFrom = from.replace(/\s/g, '');
      return phoneRegex.test(cleanFrom) || senderIdRegex.test(cleanFrom);
    };

    // Validar "to" (destino sempre deve ser número E.164)
    if (!phoneRegex.test(to.replace(/\s/g, ''))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Formato de número de destino inválido. Use formato internacional: +5511999999999' }),
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
    let response;
    
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
      
      const formData = new URLSearchParams();
      formData.append('To', to);
      formData.append('From', from);
      formData.append('Body', body);

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
