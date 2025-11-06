import { supabase } from "@/integrations/supabase/client";

export interface Contact {
  id: string;
  name: string;
  phone_number: string;
}

export interface SMSConfig {
  from: string;
  message: string;
  provider: 'twilio' | 'vonage';
  throttlePercentage?: number;
}

export interface VoiceConfig {
  from: string;
  message: string;
  language: string;
  style: number;
  premium: boolean;
  throttlePercentage?: number;
}

export interface SendResult {
  contact: Contact;
  success: boolean;
  error?: string;
}

export function replaceVariables(template: string, contact: Contact): string {
  return template
    .replace(/\{\{nome\}\}/g, contact.name)
    .replace(/\{\{telefone\}\}/g, contact.phone_number);
}

export async function sendBulkSMS(
  contacts: Contact[],
  config: SMSConfig,
  onProgress?: (current: number, total: number) => void
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  
  // Calcular delay baseado no throttle
  const throttle = config.throttlePercentage || 1.0;
  const baseDelay = 1000; // 1 segundo base
  const delay = baseDelay / throttle;
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const personalizedMessage = replaceVariables(config.message, contact);
    
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: contact.phone_number,
          from: config.from,
          body: personalizedMessage,
          provider: config.provider
        }
      });
      
      if (error) throw error;
      
      results.push({ contact, success: true });
    } catch (error) {
      results.push({ 
        contact, 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    onProgress?.(i + 1, contacts.length);
    
    // Throttle dinâmico
    if (i < contacts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

export async function sendBulkVoice(
  contacts: Contact[],
  config: VoiceConfig,
  onProgress?: (current: number, total: number) => void
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  
  // Calcular delay baseado no throttle (Vonage Voice: 3 CPS padrão)
  const throttle = config.throttlePercentage || 1.0;
  const baseDelay = 333; // ~3 chamadas por segundo
  const delay = baseDelay / throttle;
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const personalizedMessage = replaceVariables(config.message, contact);
    
    try {
      const { error } = await supabase.functions.invoke('send-voice-call', {
        body: {
          to: contact.phone_number,
          from: config.from,
          text: personalizedMessage,
          language: config.language,
          style: config.style,
          premium: config.premium
        }
      });
      
      if (error) throw error;
      
      results.push({ contact, success: true });
    } catch (error) {
      results.push({ 
        contact, 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    onProgress?.(i + 1, contacts.length);
    
    // Throttle dinâmico
    if (i < contacts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}
