import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Valida assinatura de webhook Twilio
 * @param authToken - Twilio Auth Token
 * @param signature - X-Twilio-Signature header
 * @param url - URL completa do webhook
 * @param params - Parâmetros do POST (FormData convertido em objeto)
 */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  try {
    // Twilio concatena URL + params ordenados alfabeticamente
    let data = url;
    
    // Ordenar params alfabeticamente e concatenar
    const sortedKeys = Object.keys(params).sort();
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    // Criar HMAC-SHA1
    const hmac = createHmac('sha1', authToken);
    hmac.update(data);
    const expectedSignature = hmac.digest('base64');

    console.log('[Twilio Signature Validation]', {
      url,
      expectedSignature: expectedSignature.substring(0, 10) + '...',
      receivedSignature: signature.substring(0, 10) + '...',
      match: expectedSignature === signature
    });

    return expectedSignature === signature;
  } catch (error) {
    console.error('[Twilio Signature Validation] Error:', error);
    return false;
  }
}

/**
 * Valida JWT de webhook Vonage
 * @param token - JWT do header Authorization
 * @param apiSecret - Vonage API Secret
 */
export async function validateVonageJWT(
  token: string,
  apiSecret: string
): Promise<boolean> {
  try {
    // Vonage usa HS256 (HMAC-SHA256)
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    if (!headerB64 || !payloadB64 || !signatureB64) {
      console.error('[Vonage JWT Validation] Invalid JWT format');
      return false;
    }

    // Recriar a assinatura
    const data = `${headerB64}.${payloadB64}`;
    const hmac = createHmac('sha256', apiSecret);
    hmac.update(data);
    const expectedSignature = hmac.digest('base64url');

    // Decodificar payload para verificar expiração
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    
    // Verificar se o token expirou
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.error('[Vonage JWT Validation] Token expired');
      return false;
    }

    const isValid = expectedSignature === signatureB64;
    
    console.log('[Vonage JWT Validation]', {
      expectedSignature: expectedSignature.substring(0, 10) + '...',
      receivedSignature: signatureB64.substring(0, 10) + '...',
      match: isValid,
      exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none'
    });

    return isValid;
  } catch (error) {
    console.error('[Vonage JWT Validation] Error:', error);
    return false;
  }
}

/**
 * Extrai parâmetros de FormData para objeto
 */
export function formDataToObject(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = value.toString();
  }
  return params;
}
