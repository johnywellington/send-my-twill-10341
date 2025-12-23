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
    'fr-FR', 'de-DE', 'it-IT', 'cmn-CN', 'ja-JP', 'ko-KR'
  ],
};

export const VonageAdapter: ProviderAdapter = {
  name: 'vonage',
  displayName: 'Vonage',
  capabilities,

  validatePhoneNumber(phone: string, type: 'sms' | 'voice') {
    // Vonage aceita sem '+', mas recomenda E.164
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return { 
        valid: false, 
        error: 'Número deve ter 10-15 dígitos' 
      };
    }
    
    return { valid: true };
  },

  validateSenderId(senderId: string) {
    // Vonage: 1-11 caracteres alfanuméricos
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
      language: 'pt-PT',
      style: 2,
    };
  },

  getRateLimits() {
    return {
      sms: 1,    // 1 MPS (conservador para 10DLC)
      voice: 3,  // 3 CPS
      ivr: 3,    // 3 CPS
    };
  },
};
