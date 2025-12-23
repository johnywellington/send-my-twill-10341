// Mapeamento unificado de vozes entre Vonage e Twilio

export interface VonageVoiceParams {
  language: string;
  style: number;
  premium: boolean;
  name: string;
}

export interface TwilioVoiceParams {
  voice: string;
  language: string;
}

export const VOICE_MAPPING: Record<string, { vonage: VonageVoiceParams; twilio: TwilioVoiceParams }> = {
  // Português do Brasil
  'Camila': {
    vonage: { language: 'pt-BR', style: 0, premium: true, name: 'Camila' },
    twilio: { voice: 'Polly.Camila', language: 'pt-BR' }
  },
  'Vitória': {
    vonage: { language: 'pt-BR', style: 1, premium: true, name: 'Vitória' },
    twilio: { voice: 'Polly.Vitoria', language: 'pt-BR' }
  },
  'Ricardo': {
    vonage: { language: 'pt-BR', style: 5, premium: true, name: 'Ricardo' },
    twilio: { voice: 'Polly.Ricardo', language: 'pt-BR' }
  },
  'Thiago': {
    vonage: { language: 'pt-BR', style: 6, premium: true, name: 'Thiago' },
    twilio: { voice: 'Polly.Thiago', language: 'pt-BR' }
  },
  
  // Português de Portugal
  'Inês': {
    vonage: { language: 'pt-PT', style: 0, premium: true, name: 'Inês' },
    twilio: { voice: 'Polly.Ines', language: 'pt-PT' }
  },
  'Cristiano': {
    vonage: { language: 'pt-PT', style: 1, premium: true, name: 'Cristiano' },
    twilio: { voice: 'Polly.Cristiano', language: 'pt-PT' }
  },
  
  // Inglês
  'Joanna': {
    vonage: { language: 'en-US', style: 0, premium: true, name: 'Joanna' },
    twilio: { voice: 'Polly.Joanna', language: 'en-US' }
  },
  'Matthew': {
    vonage: { language: 'en-US', style: 1, premium: true, name: 'Matthew' },
    twilio: { voice: 'Polly.Matthew', language: 'en-US' }
  }
};

/**
 * Mapeia uma voz Vonage para os parâmetros equivalentes do Twilio
 */
export function mapVonageToTwilio(voiceName: string): TwilioVoiceParams | null {
  const mapping = VOICE_MAPPING[voiceName];
  return mapping ? mapping.twilio : null;
}

/**
 * Mapeia parâmetros Vonage (language + style) para voz Twilio
 */
export function mapVonageParamsToTwilio(language: string, style: number): TwilioVoiceParams {
  // Encontrar voz correspondente baseada em language + style
  const voiceEntry = Object.entries(VOICE_MAPPING).find(
    ([_, mapping]) => 
      mapping.vonage.language === language && 
      mapping.vonage.style === style
  );
  
  if (voiceEntry) {
    return voiceEntry[1].twilio;
  }
  
  // Fallback baseado apenas no idioma
  const languageFallback = Object.entries(VOICE_MAPPING).find(
    ([_, mapping]) => mapping.vonage.language === language
  );
  
  if (languageFallback) {
    return languageFallback[1].twilio;
  }
  
  // Fallback padrão
  return { voice: 'Polly.Joanna', language: 'en-US' };
}

/**
 * Mapeia voz Twilio para parâmetros Vonage
 */
export function mapTwilioToVonage(twilioVoice: string): VonageVoiceParams | null {
  const voiceEntry = Object.entries(VOICE_MAPPING).find(
    ([_, mapping]) => mapping.twilio.voice === twilioVoice
  );
  
  return voiceEntry ? voiceEntry[1].vonage : null;
}

/**
 * Retorna parâmetros Vonage para uma voz
 */
export function getVonageParamsFromVoice(voiceName: string): VonageVoiceParams | null {
  const mapping = VOICE_MAPPING[voiceName];
  return mapping ? mapping.vonage : null;
}

/**
 * Lista todas as vozes disponíveis
 */
export function getAllVoiceNames(): string[] {
  return Object.keys(VOICE_MAPPING);
}

/**
 * Filtra vozes por idioma
 */
export function getVoicesByLanguage(language: string): string[] {
  return Object.entries(VOICE_MAPPING)
    .filter(([_, mapping]) => mapping.vonage.language === language)
    .map(([name]) => name);
}
