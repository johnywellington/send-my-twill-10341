import { ProviderAdapter, ProviderCapabilities } from './types';

const capabilities: ProviderCapabilities = {
  sms: true,
  voice: true,
  ivr: true,
  senderIdSupport: true,
  maxSmsLength: 160,
  maxVoiceLength: 5000,
  supportedLanguages: [
    'en-US', 'en-GB', 'pt-BR', 'pt-PT', 'es-ES', 'es-US', 
    'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR'
  ],
};

export const TwilioAdapter: ProviderAdapter = {
  name: 'twilio',
  displayName: 'Twilio',
  capabilities,

  validatePhoneNumber(phone: string, type: 'sms' | 'voice') {
    // Twilio exige formato E.164 com '+'
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    
    if (!phone.startsWith('+')) {
      return { 
        valid: false, 
        error: 'Twilio requer formato E.164 com +: +[código país][número]' 
      };
    }
    
    if (!e164Regex.test(phone)) {
      return { 
        valid: false, 
        error: 'Formato inválido. Use +1234567890 (10-15 dígitos após +)' 
      };
    }
    
    return { valid: true };
  },

  validateSenderId(senderId: string) {
    // Twilio: 1-11 caracteres alfanuméricos
    if (senderId.length < 1 || senderId.length > 11) {
      return { 
        valid: false, 
        error: 'Sender ID deve ter 1-11 caracteres' 
      };
    }
    
    if (!/^[A-Z0-9]+$/.test(senderId)) {
      return { 
        valid: false, 
        error: 'Sender ID só pode conter A-Z e 0-9' 
      };
    }
    
    return { valid: true };
  },

  getDefaultVoiceSettings() {
    return {
      language: 'en-US',
      style: 0,
    };
  },

  getRateLimits() {
    return {
      sms: 1,    // 1 MPS (messages per second)
      voice: 1,  // 1 CPS (calls per second)
      ivr: 1,    // 1 CPS
    };
  },
};
