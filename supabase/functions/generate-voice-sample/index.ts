import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAMPLE_TEXTS: Record<string, string> = {
  'Camila': 'Olá! Sou a Camila, sua assistente virtual brasileira. Como posso ajudar você hoje?',
  'Vitória': 'Olá! Sou a Vitória. Estou aqui para tornar sua comunicação mais profissional e eficiente.',
  'Ricardo': 'Olá! Sou o Ricardo. Posso ajudar com suas chamadas e mensagens automáticas.',
  'Thiago': 'Olá! Sou o Thiago, pronto para conectar você com seus clientes de forma dinâmica.',
  'Inês': 'Olá! Sou a Inês. Vou tornar suas comunicações mais elegantes e eficazes.',
  'Cristiano': 'Olá! Sou o Cristiano. Confie em mim para transmitir suas mensagens com clareza.'
};

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { voiceName, language, premium = true } = await req.json();

    if (!voiceName || !language) {
      throw new Error('voiceName and language are required');
    }

    const fileName = `${voiceName}-${language}-${premium ? 'premium' : 'standard'}.mp3`;
    const filePath = `samples/${fileName}`;

    console.log(`🔍 Checking Storage for: ${filePath}`);

    // Verificar se já existe no Storage (OPÇÃO B)
    const { data: existingFile } = await supabase
      .storage
      .from('voice-samples')
      .list('samples', { search: fileName });

    if (existingFile && existingFile.length > 0) {
      console.log('✅ Sample found in Storage (cached)');
      const { data: publicURL } = supabase
        .storage
        .from('voice-samples')
        .getPublicUrl(filePath);

      return new Response(
        JSON.stringify({ 
          audioUrl: publicURL.publicUrl,
          source: 'storage',
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📡 Generating sample via Vonage API (OPÇÃO A)...');

    // Gerar via Vonage API (OPÇÃO A)
    const vonageAppId = Deno.env.get('VONAGE_APPLICATION_ID')!;
    const vonagePrivateKey = Deno.env.get('VONAGE_PRIVATE_KEY')!;

    const jwt = await generateJWT(vonageAppId, vonagePrivateKey);

    const text = SAMPLE_TEXTS[voiceName] || 'Olá! Esta é uma demonstração de voz.';
    
    // Criar chamada curta apenas para gerar áudio
    const vonagePayload = {
      to: [{ type: "websocket", uri: "wss://example.com/socket" }],
      from: { type: "phone", number: "447418342134" },
      ncco: [{
        action: "talk",
        text: text,
        voiceName: voiceName,
        premium: premium
      }, {
        action: "record",
        format: "mp3",
        endOnSilence: 1,
        channels: 1,
        split: "conversation"
      }]
    };

    const vonageResponse = await fetch('https://api.vonage.com/v1/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vonagePayload),
    });

    if (!vonageResponse.ok) {
      const errorData = await vonageResponse.json();
      console.error('Vonage API error:', errorData);
      throw new Error(`Vonage API error: ${vonageResponse.status}`);
    }

    // Por enquanto, retornar um placeholder indicando que precisa ser implementado com TTS
    // Na produção, você usaria uma API de TTS direta como Google TTS ou Amazon Polly
    console.log('⚠️ Note: Full audio generation requires TTS API integration');

    // Temporariamente, criar um placeholder de resposta
    const placeholderUrl = `${supabaseUrl}/storage/v1/object/public/voice-samples/${filePath}`;

    return new Response(
      JSON.stringify({ 
        audioUrl: placeholderUrl,
        source: 'generated',
        cached: false,
        note: 'Audio preview requires TTS API integration'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
