import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { sip_user_id, provider } = await req.json();

    console.log(`[SIP Test Call] Starting test call for user ${sip_user_id}, provider: ${provider}`);

    // Buscar dados do usuário SIP
    const { data: sipUser, error: sipError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('id', sip_user_id)
      .single();

    if (sipError || !sipUser) {
      throw new Error('SIP user not found');
    }

    let callResult;

    if (provider === 'twilio') {
      // Fazer chamada de teste Twilio
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (!twilioSid || !twilioToken) {
        throw new Error('Twilio credentials not configured');
      }

      const sipUri = `sip:${sipUser.sip_username}@${sipUser.sip_domain}`;
      
      // Criar TwiML para tocar mensagem de teste
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Vitoria" language="pt-BR">
    Olá! Esta é uma chamada de teste do ramal ${sipUser.extension}. 
    Se você está ouvindo esta mensagem, significa que seu ramal está configurado corretamente.
    Esta chamada será encerrada em alguns segundos.
  </Say>
  <Pause length="2"/>
  <Say voice="Polly.Vitoria" language="pt-BR">
    Teste concluído com sucesso. Até logo!
  </Say>
</Response>`;

      // Fazer a chamada via API do Twilio
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: sipUri,
            From: '+15555555555', // Número fictício para testes
            Twiml: twiml,
            Timeout: '60',
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Twilio] Call failed:', errorText);
        throw new Error(`Twilio call failed: ${errorText}`);
      }

      callResult = await response.json();
      console.log('[Twilio] Test call initiated:', callResult.sid);

    } else if (provider === 'vonage') {
      // Fazer chamada de teste Vonage (JWT com chave privada da aplicação)
      const vonagePrivateKey = Deno.env.get('VONAGE_PRIVATE_KEY');
      const vonageAppId = Deno.env.get('VONAGE_APPLICATION_ID');

      if (!vonagePrivateKey || !vonageAppId) {
        throw new Error('Vonage credentials not configured');
      }

      // Helpers para JWT RS256
      const pemToArrayBuffer = (pem: string): ArrayBuffer => {
        const clean = pem
          .replace(/\\n/g, '\n')
          .replace('-----BEGIN PRIVATE KEY-----', '')
          .replace('-----END PRIVATE KEY-----', '')
          .replace(/\r?\n|\s/g, '');
        const binary = atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
      };

      const base64UrlEncode = (input: Uint8Array) =>
        btoa(String.fromCharCode(...input))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

      const base64UrlEncodeString = (str: string) =>
        base64UrlEncode(new TextEncoder().encode(str));

      // Montar JWT
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        application_id: vonageAppId,
        iat: now,
        exp: now + 15 * 60,
        jti: crypto.randomUUID(),
      };

      const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
      const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
      const toSign = `${encodedHeader}.${encodedPayload}`;

      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToArrayBuffer(vonagePrivateKey),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(toSign)
      );
      const jwt = `${toSign}.${base64UrlEncode(new Uint8Array(signature))}`;

      const sipUri = `sip:${sipUser.sip_username}@${sipUser.sip_domain}`;

      // Criar NCCO para tocar mensagem de teste
      const ncco = [
        {
          action: 'talk',
          text: `Olá! Esta é uma chamada de teste do ramal ${sipUser.extension}. Se você está ouvindo esta mensagem, significa que seu ramal está configurado corretamente. Esta chamada será encerrada em alguns segundos.`,
          language: 'pt-BR',
          style: 0,
        },
        {
          action: 'talk',
          text: 'Teste concluído com sucesso. Até logo!',
          language: 'pt-BR',
          style: 0,
        }
      ];

      const response = await fetch(
        'https://api.nexmo.com/v1/calls',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: [{ type: 'sip', uri: sipUri }],
            from: { type: 'app', user: 'sip-test' },
            ncco,
            event_url: [`${supabaseUrl}/functions/v1/vonage-voice-webhook`],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Vonage] Call failed:', errorText);
        throw new Error(`Vonage call failed: ${errorText}`);
      }

      callResult = await response.json();
      console.log('[Vonage] Test call initiated:', callResult.uuid);
    }

    // Registrar teste no banco
    const { error: logError } = await supabase
      .from('sip_connectivity_tests')
      .insert({
        user_id: user.id,
        sip_user_id: sipUser.id,
        provider: provider,
        test_type: 'audio_test',
        status: 'initiated',
        metadata: {
          call_id: provider === 'twilio' ? callResult.sid : callResult.uuid,
          test_duration: 60,
        },
      });

    if (logError) {
      console.error('[Log] Failed to save test:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Chamada de teste iniciada. O ramal deve tocar em alguns segundos.',
        call_id: provider === 'twilio' ? callResult.sid : callResult.uuid,
        duration: 60,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SIP Test Call] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
