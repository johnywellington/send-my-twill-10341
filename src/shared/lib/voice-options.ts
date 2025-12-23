export interface VoiceOption {
  value: string;
  label: string;
  language: 'pt-BR' | 'pt-PT';
  gender: 'female' | 'male';
  type: 'neural' | 'standard';
  flag: string;
  description: string;
  sampleText: string;
}

// Mapeamento de vozes customizadas para parâmetros Vonage válidos
export interface VonageVoiceParams {
  language: string;
  style: number;
  premium: boolean;
}

export const VOICE_MAPPING: Record<string, VonageVoiceParams> = {
  // Portuguese Brazil - Neural Voices
  'Camila': { language: 'pt-BR', style: 0, premium: true },
  'Vitória': { language: 'pt-BR', style: 1, premium: true },
  'Ricardo': { language: 'pt-BR', style: 5, premium: true },
  'Thiago': { language: 'pt-BR', style: 6, premium: true },
  
  // Portuguese Portugal - Neural Voices
  'Inês': { language: 'pt-PT', style: 0, premium: true },
  'Cristiano': { language: 'pt-PT', style: 1, premium: true }
};

export const PORTUGUESE_VOICES: VoiceOption[] = [
  // Portuguese Brazil - Neural Voices
  {
    value: 'Camila',
    label: 'Camila',
    language: 'pt-BR',
    gender: 'female',
    type: 'neural',
    flag: '🇧🇷',
    description: 'Voz feminina neural brasileira - Natural e expressiva',
    sampleText: 'Olá! Sou a Camila, sua assistente virtual brasileira. Como posso ajudar você hoje?'
  },
  {
    value: 'Vitória',
    label: 'Vitória',
    language: 'pt-BR',
    gender: 'female',
    type: 'neural',
    flag: '🇧🇷',
    description: 'Voz feminina neural brasileira - Profissional e clara',
    sampleText: 'Olá! Sou a Vitória. Estou aqui para tornar sua comunicação mais profissional e eficiente.'
  },
  {
    value: 'Ricardo',
    label: 'Ricardo',
    language: 'pt-BR',
    gender: 'male',
    type: 'neural',
    flag: '🇧🇷',
    description: 'Voz masculina neural brasileira - Confiável e amigável',
    sampleText: 'Olá! Sou o Ricardo. Posso ajudar com suas chamadas e mensagens automáticas.'
  },
  {
    value: 'Thiago',
    label: 'Thiago',
    language: 'pt-BR',
    gender: 'male',
    type: 'neural',
    flag: '🇧🇷',
    description: 'Voz masculina neural brasileira - Dinâmica e moderna',
    sampleText: 'Olá! Sou o Thiago, pronto para conectar você com seus clientes de forma dinâmica.'
  },
  
  // Portuguese Portugal - Neural Voices
  {
    value: 'Inês',
    label: 'Inês',
    language: 'pt-PT',
    gender: 'female',
    type: 'neural',
    flag: '🇵🇹',
    description: 'Voz feminina neural portuguesa - Elegante e profissional',
    sampleText: 'Olá! Sou a Inês. Vou tornar suas comunicações mais elegantes e eficazes.'
  },
  {
    value: 'Cristiano',
    label: 'Cristiano',
    language: 'pt-PT',
    gender: 'male',
    type: 'neural',
    flag: '🇵🇹',
    description: 'Voz masculina neural portuguesa - Autoridade e clareza',
    sampleText: 'Olá! Sou o Cristiano. Confie em mim para transmitir suas mensagens com clareza.'
  }
];

export function getVoicesByLanguage(language: string): VoiceOption[] {
  if (language === 'pt-BR') {
    return PORTUGUESE_VOICES.filter(v => v.language === 'pt-BR');
  }
  if (language === 'pt-PT') {
    return PORTUGUESE_VOICES.filter(v => v.language === 'pt-PT');
  }
  return [];
}

export function isPortugueseLanguage(language: string): boolean {
  return language === 'pt-BR' || language === 'pt-PT';
}

export function getVonageParamsFromVoice(voiceName: string): VonageVoiceParams | null {
  return VOICE_MAPPING[voiceName] || null;
}
