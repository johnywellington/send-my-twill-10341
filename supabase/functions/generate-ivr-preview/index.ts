import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de vozes portuguesas para IDs do ElevenLabs
const VOICE_MAPPING: Record<string, string> = {
  // Portuguese Brazil
  'Camila': 'XB0fDUnXU5powFXDhCwa', // Charlotte (feminina, clara)
  'Vitória': 'EXAVITQu4vr4xnSDxMaL', // Sarah (feminina, profissional)
  'Ricardo': 'onwK4e9ZLuTAKqWW03F9', // Daniel (masculino, confiável)
  'Thiago': 'TX3LPaxmHKxFdv7VOQHJ', // Liam (masculino, dinâmico)
  
  // Portuguese Portugal
  'Inês': 'cgSgspJ2msm6clMCkdW9', // Jessica (feminina, elegante)
  'Cristiano': 'IKne3meq5aSn9XLyUdCD', // Charlie (masculino, autoridade)
};

// Fallback para voz padrão caso não encontre mapeamento
const DEFAULT_VOICE_ID = '9BWtsMINqrJLrRacOk9x'; // Aria

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceName, language } = await req.json();

    if (!text) {
      throw new Error('Texto é obrigatório');
    }

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY não configurada');
    }

    // Selecionar voice ID baseado no nome da voz
    const voiceId = VOICE_MAPPING[voiceName] || DEFAULT_VOICE_ID;

    console.log(`🎤 Gerando áudio: voz="${voiceName}" (${voiceId}), lang="${language}"`);

    // Chamar API do ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ElevenLabs:', response.status, errorText);
      throw new Error(`Erro ao gerar áudio: ${response.status} - ${errorText}`);
    }

    // Converter áudio para base64 em chunks (evita stack overflow)
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32KB chunks
    let binaryString = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binaryString += String.fromCharCode(...chunk);
    }
    
    const base64Audio = btoa(binaryString);

    console.log(`✅ Áudio gerado com sucesso (${arrayBuffer.byteLength} bytes)`);

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        voiceId,
        voiceName 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
