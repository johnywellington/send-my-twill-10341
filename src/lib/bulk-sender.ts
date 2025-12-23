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
  autoFallback?: boolean;
  throttlePercentage?: number;
  dryRun?: boolean;
}

export interface VoiceConfig {
  from: string;
  message: string;
  language: string;
  style: number;
  premium: boolean;
  provider: 'twilio' | 'vonage';
  autoFallback?: boolean;
  throttlePercentage?: number;
  voiceName?: string;
  dryRun?: boolean;
}

export interface SendResult {
  contact: Contact;
  success: boolean;
  provider?: 'twilio' | 'vonage';
  usedFallback?: boolean;
  error?: string;
}

export function replaceVariables(template: string, contact: Contact): string {
  return template
    .replace(/\{\{nome\}\}/g, contact.name)
    .replace(/\{\{telefone\}\}/g, contact.phone_number);
}

function getAlternativeProvider(current: 'twilio' | 'vonage'): 'twilio' | 'vonage' {
  return current === 'twilio' ? 'vonage' : 'twilio';
}

export async function sendBulkSMS(
  contacts: Contact[],
  config: SMSConfig,
  onProgress?: (current: number, total: number) => void
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  const startTime = Date.now();
  
  // Calcular delay baseado no throttle
  const throttle = config.throttlePercentage || 1.0;
  const baseDelay = 1000; // 1 segundo base
  const delay = baseDelay / throttle;
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const personalizedMessage = replaceVariables(config.message, contact);
    
    let success = false;
    let error: any = null;
    let providerUsed = config.provider;
    let usedFallback = false;

    // TENTATIVA 1: Provider principal
    try {
      const { error: primaryError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: contact.phone_number,
          from: config.from,
          body: personalizedMessage,
          provider: config.provider,
          dryRun: config.dryRun || false
        }
      });
      
      if (!primaryError) {
        success = true;
      } else {
        error = primaryError;
      }
    } catch (err) {
      error = err;
    }

    // TENTATIVA 2: Fallback se falhou e está habilitado
    if (!success && error && config.autoFallback) {
      const alternativeProvider = getAlternativeProvider(config.provider);
      console.log(`[Bulk SMS] Fallback para ${contact.name}: tentando ${alternativeProvider}`);
      
      try {
        const { error: fallbackError } = await supabase.functions.invoke('send-sms', {
          body: {
            to: contact.phone_number,
            from: config.from,
            body: personalizedMessage,
            provider: alternativeProvider,
            dryRun: config.dryRun || false
          }
        });
        
        if (!fallbackError) {
          success = true;
          providerUsed = alternativeProvider;
          usedFallback = true;
          console.log(`[Bulk SMS] ✓ Fallback sucesso para ${contact.name} via ${alternativeProvider}`);
        } else {
          error = fallbackError;
        }
      } catch (err) {
        error = err;
      }
    }

    // Adicionar resultado
    if (success) {
      results.push({ 
        contact, 
        success: true, 
        provider: providerUsed,
        usedFallback 
      });
    } else {
      results.push({ 
        contact, 
        success: false,
        provider: providerUsed,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    onProgress?.(i + 1, contacts.length);
    
    // Throttle dinâmico
    if (i < contacts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Save bulk send log
  const endTime = Date.now();
  const totalDuration = Math.round((endTime - startTime) / 1000); // seconds
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const fallbackCount = results.filter(r => r.usedFallback).length;
  const primarySuccessCount = results.filter(r => r.success && !r.usedFallback).length;
  
  console.log(`[Bulk SMS] Estatísticas:
    - Total: ${contacts.length}
    - Sucesso (${config.provider}): ${primarySuccessCount}
    - Sucesso (fallback): ${fallbackCount}
    - Falhas: ${failCount}
  `);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('bulk_send_logs').insert({
        user_id: user.id,
        type: 'sms',
        provider: config.provider,
        total_contacts: contacts.length,
        successful_sends: successCount,
        failed_sends: failCount,
        throttle_percentage: throttle,
        avg_delay_ms: Math.round(delay),
        total_duration_seconds: totalDuration,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date(endTime).toISOString(),
        retry_count: fallbackCount
      });
    }
  } catch (error) {
    console.error('Error saving bulk send log:', error);
  }
  
  return results;
}

export async function sendBulkVoice(
  contacts: Contact[],
  config: VoiceConfig,
  onProgress?: (current: number, total: number) => void
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  const startTime = Date.now();
  let fallbackCount = 0;
  let retryCount = 0;
  
  // Calcular delay baseado no throttle (Vonage Voice: 3 CPS padrão)
  const throttle = config.throttlePercentage || 1.0;
  const baseDelay = 333; // ~3 chamadas por segundo
  const delay = baseDelay / throttle;
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const personalizedMessage = replaceVariables(config.message, contact);
    
    let attempts = 0;
    let success = false;
    let lastError = null;
    
    // Retry até 3 vezes para rate limiting
    while (attempts < 3 && !success) {
      try {
        const { data, error } = await supabase.functions.invoke('send-voice-call', {
          body: {
            to: contact.phone_number,
            from: config.from,
            text: personalizedMessage,
            language: config.language,
            style: config.style,
            premium: config.premium,
            voiceName: config.voiceName,
            dryRun: config.dryRun || false
          }
        });
        
        // Verificar se o erro é recuperável (rate limit)
        if (error && data?.retryable && attempts < 2) {
          attempts++;
          retryCount++;
          
          // Backoff exponencial: 2s, 4s, 8s
          const backoffDelay = Math.pow(2, attempts) * 1000;
          console.log(`Rate limit detected for ${contact.phone_number}, retry ${attempts}/3 after ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        if (error) throw error;
        
        // Sucesso
        success = true;
        if (data?.usedFallback) {
          fallbackCount++;
          console.warn(
            `⚠️ Voice '${data.originalVoice}' não disponível para ${contact.phone_number}. ` +
            `Usado fallback: ${config.language} (style ${config.style})`
          );
        }
        results.push({ contact, success: true });
        
      } catch (error) {
        lastError = error;
        attempts++;
        
        // Se não for rate limit ou última tentativa, falhar
        if (attempts >= 3) {
          results.push({ 
            contact, 
            success: false, 
            error: error instanceof Error ? error.message : 'Erro desconhecido após 3 tentativas'
          });
        }
      }
    }
    
    onProgress?.(i + 1, contacts.length);
    
    // Throttle normal apenas se não houve retry (retry já tem delay)
    if (i < contacts.length - 1 && attempts === 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Save bulk send log
  const endTime = Date.now();
  const totalDuration = Math.round((endTime - startTime) / 1000); // seconds
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('bulk_send_logs').insert({
        user_id: user.id,
        type: 'voice',
        provider: 'vonage',
        total_contacts: contacts.length,
        successful_sends: successCount,
        failed_sends: failCount,
        throttle_percentage: throttle,
        avg_delay_ms: Math.round(delay),
        total_duration_seconds: totalDuration,
        retry_count: retryCount,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date(endTime).toISOString()
      });
    }
  } catch (error) {
    console.error('Error saving bulk send log:', error);
  }

  // Notificar sobre fallbacks se houver
  if (fallbackCount > 0) {
    const { toast } = await import('@/hooks/use-toast');
    toast({
      title: `⚠️ ${fallbackCount} chamadas usaram fallback automático`,
      description: 'As vozes específicas não estavam disponíveis, mas as chamadas foram completadas com vozes alternativas.',
      duration: 5000,
      variant: 'default'
    });
  }
  
  return results;
}
