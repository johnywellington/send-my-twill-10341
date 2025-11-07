export type Provider = 'twilio' | 'vonage';

export interface SmsConfig {
  to: string;
  from: string;
  body: string;
  senderId?: string;
  dryRun?: boolean;
}

export interface VoiceConfig {
  to: string;
  from: string;
  text: string;
  language?: string;
  style?: number;
  premium?: boolean;
  voiceName?: string;
  dryRun?: boolean;
}

export interface IVRConfig {
  to: string;
  from: string;
  assistantNumber: string;
  transferTimeout: number;
  language: string;
  style: number;
  premium: boolean;
  ncco: any[];
  voiceName?: string;
  dryRun?: boolean;
  actions?: any;
}

export interface ProviderCapabilities {
  sms: boolean;
  voice: boolean;
  ivr: boolean;
  senderIdSupport: boolean;
  maxSmsLength: number;
  maxVoiceLength: number;
  supportedLanguages: string[];
}

export interface ProviderAdapter {
  name: Provider;
  displayName: string;
  capabilities: ProviderCapabilities;
  
  // Validações específicas
  validatePhoneNumber(phone: string, type: 'sms' | 'voice'): { valid: boolean; error?: string };
  validateSenderId(senderId: string): { valid: boolean; error?: string };
  
  // Configurações padrão
  getDefaultVoiceSettings(): { language: string; style: number };
  getRateLimits(): { sms: number; voice: number; ivr: number };
}
