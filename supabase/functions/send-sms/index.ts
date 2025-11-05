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
    
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authenticated:', user.id);

    const { to, from, body, provider = "twilio" }: SmsRequest = await req.json();

    console.log('SMS details:', { to, from, bodyLength: body.length, provider });

    // Validate inputs
    if (!to || !from || !body) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios faltando: destinatário, remetente ou mensagem' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
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
