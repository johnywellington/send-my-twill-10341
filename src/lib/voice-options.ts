export interface VoiceOption {
  value: string;
  label: string;
  language: 'pt-BR' | 'pt-PT';
  gender: 'female' | 'male';
  type: 'neural' | 'standard';
  flag: string;
  description: string;
}

export const PORTUGUESE_VOICES: VoiceOption[] = [
  // Portuguese Brazil - Neural Voices
  {
    value: 'Camila',
    label: 'Camila',
    language: 'pt-BR',
    gender: 'female',
    type: 'neural',
    flag: '🇧🇷',
    description: 'Voz feminina neural brasileira - Natural e expressiva'
  },
  {
    value: 'Vitória',
    label: 'Vitória',
    language: 'pt-BR',
    gender: 'female',
    type: 'neural',
    flag: '🇧🇷',
    description: 'Voz feminina neural brasileira - Profissional e clara'
  },
  {
    value: 'Ricardo',
    label: 'Ricardo',
    language: 'pt-BR',
    gender: 'male',
    type: 'neural',
    flag: '🇧🇷',
    description: 'Voz masculina neural brasileira - Confiável e amigável'
  },
  {
    value: 'Thiago',
    label: 'Thiago',
    language: 'pt-BR',
    gender: 'male',
    type: 'neural',
    flag: '🇧🇷',
    description: 'Voz masculina neural brasileira - Dinâmica e moderna'
  },
  
  // Portuguese Portugal - Neural Voices
  {
    value: 'Inês',
    label: 'Inês',
    language: 'pt-PT',
    gender: 'female',
    type: 'neural',
    flag: '🇵🇹',
    description: 'Voz feminina neural portuguesa - Elegante e profissional'
  },
  {
    value: 'Cristiano',
    label: 'Cristiano',
    language: 'pt-PT',
    gender: 'male',
    type: 'neural',
    flag: '🇵🇹',
    description: 'Voz masculina neural portuguesa - Autoridade e clareza'
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
