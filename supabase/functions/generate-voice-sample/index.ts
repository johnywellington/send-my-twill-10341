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

    console.log('⚠️ Sample não disponível no Storage');

    // A geração automática de samples via Vonage API requer um fluxo complexo:
    // 1. Fazer chamada telefônica
    // 2. Gravar a chamada
    // 3. Processar webhook assíncrono
    // 4. Baixar gravação
    // 
    // Para preview de vozes, recomenda-se:
    // - Upload manual de samples para o bucket 'voice-samples'
    // - Ou integrar com API de TTS síncrona (Google TTS, AWS Polly, ElevenLabs)
    
    return new Response(
      JSON.stringify({ 
        error: 'Sample não disponível',
        message: `O sample de voz "${voiceName}" ainda não foi carregado. Faça upload de samples para o bucket 'voice-samples' no formato: samples/${fileName}`,
        voiceName,
        language,
        expectedPath: filePath
      }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-voice-sample:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Falha ao processar solicitação de sample de voz'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
