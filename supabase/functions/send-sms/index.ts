import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsRequest {
  to: string;
  from: string;
  body: string;
  provider?: "twilio" | "vonage";
  credentialId?: string;
  dryRun?: boolean;
}

// Função auxiliar para detectar se é Sender ID alfanumérico válido
const isSenderId = (value: string): boolean => {
  // Sender ID: 3-11 caracteres alfanuméricos, DEVE conter pelo menos uma letra
  // Strings apenas com dígitos são números de telefone, não Sender IDs
  return /^[A-Za-z0-9]{3,11}$/.test(value) && /[A-Za-z]/.test(value);
};

// Função para detectar se parece Sender ID mas é inválido (ex: muito longo)
const isInvalidSenderId = (value: string): { invalid: boolean; reason?: string } => {
  // Se é apenas letras (sem números e sem +), parece ser um Sender ID
  if (/^[A-Za-z]+$/.test(value)) {
    if (value.length < 3) {
      return { invalid: true, reason: 'Sender ID deve ter no mínimo 3 caracteres' };
    }
    if (value.length > 11) {
      return { invalid: true, reason: `Sender ID "${value}" tem ${value.length} caracteres. O máximo permitido é 11.` };
    }
  }
  // Se é alfanumérico (começa com letra, sem +), também parece Sender ID
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(value) && !value.startsWith('+')) {
    if (value.length > 11) {
      return { invalid: true, reason: `Sender ID "${value}" tem ${value.length} caracteres. O máximo permitido é 11.` };
    }
  }
  return { invalid: false };
};

// Função para detectar se parece número de telefone
const looksLikePhoneNumber = (value: string): boolean => {
  // Começa com + ou é apenas dígitos
  return value.startsWith('+') || /^[0-9]+$/.test(value);
};

// Função para validar se um número de telefone parece completo (com código de país)
const validatePhoneNumber = (value: string): { valid: boolean; error?: string; suggestion?: string } => {
  const digits = value.replace(/\D/g, '');
  
  // Se já tem + e tem pelo menos 10 dígitos, provavelmente está OK
  if (value.startsWith('+') && digits.length >= 10) {
    return { valid: true };
  }
  
  // Se não tem + e tem menos de 10 dígitos, provavelmente falta código de país
  if (!value.startsWith('+') && digits.length <= 9) {
    // Detectar padrões portugueses
    if (digits.startsWith('21') || digits.startsWith('22') || digits.startsWith('23') || digits.startsWith('24') || digits.startsWith('25') || digits.startsWith('26') || digits.startsWith('27') || digits.startsWith('28') || digits.startsWith('29')) {
      return { 
        valid: false, 
        error: `Número "${value}" parece incompleto. Falta o código de país.`,
        suggestion: `Use o formato internacional: +351${digits}`
      };
    }
    if (digits.startsWith('9')) {
      return { 
        valid: false, 
        error: `Número "${value}" parece incompleto. Falta o código de país.`,
        suggestion: `Use o formato internacional: +351${digits}`
      };
    }
    // Número genérico curto
    return { 
      valid: false, 
      error: `Número "${value}" parece incompleto (${digits.length} dígitos). Números internacionais devem ter pelo menos 10 dígitos incluindo código de país.`,
      suggestion: 'Use o formato E.164: +[código país][número]. Ex: +351912345678'
    };
  }
  
  return { valid: true };
};

// Função para verificar status da conta antes de enviar
async function checkAccountStatus(
  provider: 'twilio' | 'vonage',
  accountSid?: string,
  authToken?: string,
  apiKey?: string,
  apiSecret?: string
): Promise<{ valid: boolean; error?: string; errorCode?: string; balance?: number; status?: string }> {
  try {
    if (provider === 'twilio') {
      if (!accountSid || !authToken) {
        return { valid: false, error: 'Credenciais Twilio não configuradas', errorCode: 'MISSING_CREDENTIALS' };
      }
      
      const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
      const response = await fetch(accountUrl, {
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Twilio account check failed:', response.status, errorData);
        
        if (response.status === 401) {
          return { 
            valid: false, 
            error: 'Credenciais Twilio inválidas. Verifique o Account SID e Auth Token no console Twilio.',
            errorCode: 'INVALID_CREDENTIALS'
          };
        }
        
        return { 
          valid: false, 
          error: errorData.message || `Erro ao verificar conta: ${response.status}`,
          errorCode: `HTTP_${response.status}`
        };
      }
      
      const accountData = await response.json();
      
      // Verificar status da conta
      if (accountData.status === 'suspended') {
        return { 
          valid: false, 
          error: 'Conta Twilio suspensa. Verifique o console Twilio para mais detalhes.',
          errorCode: 'ACCOUNT_SUSPENDED',
          status: accountData.status
        };
      }
      
      if (accountData.status === 'closed') {
        return { 
          valid: false, 
          error: 'Conta Twilio fechada.',
          errorCode: 'ACCOUNT_CLOSED',
          status: accountData.status
        };
      }
      
      // Buscar saldo se possível
      try {
        const balanceUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`;
        const balanceResponse = await fetch(balanceUrl, {
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
          }
        });
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          const balance = parseFloat(balanceData.balance);
          
          if (balance <= 0) {
            return { 
              valid: false, 
              error: `Saldo Twilio insuficiente: ${balanceData.currency} ${balance.toFixed(2)}. Adicione créditos para continuar.`,
              errorCode: 'INSUFFICIENT_BALANCE',
              balance,
              status: accountData.status
            };
          }
          
          console.log(`Twilio account verified - Status: ${accountData.status}, Balance: ${balanceData.currency} ${balance.toFixed(2)}`);
          return { valid: true, balance, status: accountData.status };
        }
      } catch (balanceError) {
        console.warn('Could not fetch Twilio balance, proceeding anyway:', balanceError);
      }
      
      return { valid: true, status: accountData.status };
      
    } else {
      // Vonage
      if (!apiKey || !apiSecret) {
        return { valid: false, error: 'Credenciais Vonage não configuradas', errorCode: 'MISSING_CREDENTIALS' };
      }
      
      // Vonage: verificar saldo
      const balanceUrl = `https://rest.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`;
      const response = await fetch(balanceUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Vonage balance check failed:', response.status, errorData);
        
        if (response.status === 401) {
          return { 
            valid: false, 
            error: 'Credenciais Vonage inválidas. Verifique o API Key e API Secret.',
            errorCode: 'INVALID_CREDENTIALS'
          };
        }
        
        return { 
          valid: false, 
          error: errorData['error-text'] || `Erro ao verificar conta: ${response.status}`,
          errorCode: `HTTP_${response.status}`
        };
      }
      
      const balanceData = await response.json();
      const balance = parseFloat(balanceData.value);
      
      if (balance <= 0) {
        return { 
          valid: false, 
          error: `Saldo Vonage insuficiente: € ${balance.toFixed(2)}. Adicione créditos para continuar.`,
          errorCode: 'INSUFFICIENT_BALANCE',
          balance
        };
      }
      
      console.log(`Vonage account verified - Balance: € ${balance.toFixed(2)}`);
      return { valid: true, balance };
    }
  } catch (error) {
    console.error('Error checking account status:', error);
    // Em caso de erro na verificação, permitir continuar (fail-open)
    return { valid: true };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SMS Send Request Started ===');

    // 🔒 AUTENTICAÇÃO OBRIGATÓRIA
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Criar cliente Supabase com o token do usuário
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verificar se o usuário está autenticado (usar token explícito para evitar AuthSessionMissingError)
    const jwt = authHeader.replace('Bearer', '').trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Authenticated user:', user.id);

    const requestBody = await req.json();

    // ✅ VALIDAÇÃO ROBUSTA DE INPUTS
    const validationErrors: string[] = [];
    
    // Validate provider
    const provider = requestBody.provider || 'twilio';
    if (!['twilio', 'vonage'].includes(provider)) {
      validationErrors.push('Provider must be either "twilio" or "vonage"');
    }
    
    // Validate to (destination number)
    const to = requestBody.to?.toString().trim();
    if (!to || to.length < 8 || to.length > 20) {
      validationErrors.push('Destination number must be 8-20 characters');
    } else if (!/^\+?[0-9\s\-\(\)]+$/.test(to)) {
      validationErrors.push('Destination number contains invalid characters');
    }
    
    // Validate from (sender)
    const from = requestBody.from?.toString().trim();
    if (!from || from.length < 3 || from.length > 20) {
      validationErrors.push('Sender must be 3-20 characters');
    } else if (!/^[A-Za-z0-9\s\+\-\(\)]+$/.test(from)) {
      validationErrors.push('Sender contains invalid characters');
    }
    
    // Validate message body
    const body = requestBody.body?.toString().trim();
    if (!body || body.length === 0) {
      validationErrors.push('Message cannot be empty');
    } else if (body.length > 1600) {
      validationErrors.push('Message must be less than 1600 characters');
    }
    
    // Validate credentialId if provided
    const credentialId = requestBody.credentialId?.toString().trim();
    if (credentialId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentialId)) {
      validationErrors.push('Invalid credential ID format');
    }
    
    const dryRun = requestBody.dryRun === true;
    
    // Return validation errors
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Validation failed', 
          details: validationErrors 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('SMS details:', { to, from, bodyLength: body.length, provider, credentialId, dryRun });

    console.log('✅ Validation passed - User:', user.id, 'Provider:', provider);
    
    const userId = user.id;
    let response;
    
    // 🔑 CARREGAR CREDENCIAIS DINAMICAMENTE
    let accountSid: string | undefined;
    let authToken: string | undefined;
    let apiKey: string | undefined;
    let apiSecret: string | undefined;

    if (credentialId) {
      // Buscar credencial específica (RLS permite acesso a todas as credenciais ativas)
      const { data: credential, error: credError } = await supabase
        .from('provider_credentials')
        .select('*')
        .eq('id', credentialId)
        .eq('is_active', true)
        .single();

      if (credError || !credential) {
        console.warn('Credential not found or inactive, falling back to legacy env secrets:', credentialId);
        // Fallback to legacy/global secrets so the request can still proceed
        if (provider === 'twilio') {
          accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
          authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        } else {
          apiKey = Deno.env.get('VONAGE_API_KEY');
          apiSecret = Deno.env.get('VONAGE_API_SECRET');
        }
      } else {
        console.log('Using credential:', credential.credential_name, 'Account ID:', credential.account_identifier, 'Secret key:', credential.secret_key);

        const secretKey = credential.secret_key;
        
        if (secretKey && secretKey !== 'legacy_twilio' && secretKey !== 'legacy_vonage') {
          if (provider === 'twilio') {
            // Para Twilio: usar account_identifier da credencial como Account SID
            // e buscar apenas o Auth Token do secret
            accountSid = credential.account_identifier;
            authToken = Deno.env.get(`CRED_${secretKey}_TOKEN`) || Deno.env.get(`CRED_${secretKey}_token`);
            
            console.log('Loading Twilio - Account SID from credential:', accountSid?.slice(0, 10) + '...', 'Token from secret:', !!authToken);
            
            // Se token não encontrado, fazer fallback para legacy
            if (!authToken) {
              console.warn('Auth token not found in secret, falling back to legacy');
              accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
              authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
              console.log('Legacy fallback - found SID:', !!accountSid, 'found TOKEN:', !!authToken);
            }
          } else {
            // Para Vonage: usar account_identifier como API Key e buscar Secret
            apiKey = credential.account_identifier;
            apiSecret = Deno.env.get(`CRED_${secretKey}_SECRET`) || Deno.env.get(`CRED_${secretKey}_secret`);
            
            console.log('Loading Vonage - API Key from credential:', apiKey, 'Secret from secret:', !!apiSecret);
            
            // Se secret não encontrado, fazer fallback para legacy
            if (!apiSecret) {
              console.warn('API Secret not found in secret, falling back to legacy');
              apiKey = Deno.env.get('VONAGE_API_KEY');
              apiSecret = Deno.env.get('VONAGE_API_SECRET');
              console.log('Legacy fallback - found KEY:', !!apiKey, 'found SECRET:', !!apiSecret);
            }
          }
        } else {
          // Fallback para secrets legacy
          console.log('Using legacy secrets for:', provider);
          if (provider === 'twilio') {
            accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
            authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
          } else {
            apiKey = Deno.env.get('VONAGE_API_KEY');
            apiSecret = Deno.env.get('VONAGE_API_SECRET');
          }
        }
      }
    } else {
      // Sem credentialId - usar secrets globais/legacy
      console.log('No credentialId provided, using legacy secrets');
      if (provider === 'twilio') {
        accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      } else {
        apiKey = Deno.env.get('VONAGE_API_KEY');
        apiSecret = Deno.env.get('VONAGE_API_SECRET');
      }
    }
    
    // 🔍 VERIFICAR STATUS DA CONTA ANTES DE ENVIAR
    console.log('Checking account status before sending...');
    const accountCheck = await checkAccountStatus(
      provider,
      accountSid,
      authToken,
      apiKey,
      apiSecret
    );
    
    if (!accountCheck.valid) {
      console.error('Account check failed:', accountCheck.error, accountCheck.errorCode);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: accountCheck.error,
          errorCode: accountCheck.errorCode,
          provider,
          balance: accountCheck.balance,
          accountStatus: accountCheck.status
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    console.log('Account check passed:', accountCheck.balance ? `Balance: ${accountCheck.balance}` : 'OK');
    
    // 🧪 MODO DRY-RUN: Simular envio sem chamar API
    if (dryRun) {
      console.log('🧪 DRY-RUN MODE: Skipping actual SMS send');
      
      // Simular latência (50-200ms)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
      
      const mockMessageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Log dry-run SMS
      if (userId) {
        await supabase.from('sms_logs').insert({
          user_id: userId,
          to_number: to,
          from_number: from,
          message: body,
          provider: provider,
          status: 'dry-run',
          external_id: mockMessageId
        });
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          messageSid: mockMessageId,
          status: 'dry-run',
          provider: provider,
          dryRun: true,
          message: 'Teste realizado sem envio real'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    if (provider === "vonage") {
      // Validar credenciais Vonage
      if (!apiKey || !apiSecret) {
        console.error('Missing Vonage credentials');
        return new Response(
          JSON.stringify({ success: false, error: 'Credenciais Vonage não configuradas' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      console.log('Using Vonage provider');

      // Send SMS via Vonage
      const vonageUrl = 'https://rest.nexmo.com/sms/json';
      const webhookUrl = `${supabaseUrl}/functions/v1/vonage-sms-webhook`;
      
      const vonageResponse = await fetch(vonageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          to: to.replace('+', ''),
          from: from.replace('+', ''),
          text: body,
          callback: webhookUrl,
        }),
      });

      const vonageData = await vonageResponse.json();

      if (!vonageResponse.ok || vonageData.messages?.[0]?.status !== "0") {
        console.error('Vonage API error:', vonageData);
        const errorText = vonageData.messages?.[0]?.['error-text'] || 'Failed to send SMS via Vonage';
        return new Response(
          JSON.stringify({ success: false, provider: 'vonage', error: errorText, code: vonageData.messages?.[0]?.status }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('SMS sent successfully via Vonage:', vonageData.messages[0]['message-id']);

      response = {
        success: true,
        messageSid: vonageData.messages[0]['message-id'],
        status: 'sent',
        provider: 'vonage'
      };
    } else {
      // Validar credenciais Twilio
      if (!accountSid || !authToken) {
        console.error('Missing Twilio credentials');
        return new Response(
          JSON.stringify({ success: false, error: 'Credenciais Twilio não configuradas. Por favor, configure as credenciais da API.' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      console.log('Using Twilio provider');

      // 🔒 VERIFICAR SE É CONTA TRIAL QUANDO USANDO SENDER ID
      if (isSenderId(from)) {
        console.log('[Twilio SMS] Sender ID detected, checking if account is trial...');
        try {
          const accountCheckUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
          const accountCheckResponse = await fetch(accountCheckUrl, {
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
            }
          });
          
          if (accountCheckResponse.ok) {
            const accountData = await accountCheckResponse.json();
            const isTrialAccount = accountData.type === 'Trial';
            
            if (isTrialAccount) {
              console.error('[Twilio SMS] Sender ID not allowed in trial account');
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: 'Sender ID alfanumérico não é permitido em contas Trial do Twilio. Use um número de telefone ou faça upgrade da conta.',
                  code: 'TRIAL_SENDER_ID_NOT_ALLOWED'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
              );
            }
          }
        } catch (checkError) {
          console.warn('[Twilio SMS] Could not verify account type, proceeding anyway:', checkError);
        }
      }

      // Create Twilio API request
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const webhookUrl = `${supabaseUrl}/functions/v1/twilio-sms-webhook`;
      
      // Normalizar números para formato E.164 (Twilio exige + no início)
      const normalizedTo = to.startsWith('+') ? to : `+${to}`;
      
      // Verificar se o remetente é um Sender ID inválido (ex: muito longo)
      const senderIdCheck = isInvalidSenderId(from);
      if (senderIdCheck.invalid) {
        console.error('[Twilio SMS] Invalid Sender ID:', senderIdCheck.reason);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: senderIdCheck.reason,
            code: 'INVALID_SENDER_ID',
            suggestion: 'Use um Sender ID com 3-11 caracteres alfanuméricos ou um número de telefone.'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // Para "from": distinguir entre Sender ID alfanumérico e número
      let normalizedFrom: string;
      if (isSenderId(from)) {
        normalizedFrom = from;  // Sender ID válido: usar como está
      } else if (looksLikePhoneNumber(from)) {
        // Validar se o número parece completo (com código de país)
        const phoneValidation = validatePhoneNumber(from);
        if (!phoneValidation.valid) {
          console.error('[Twilio SMS] Incomplete phone number:', phoneValidation.error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: phoneValidation.error,
              code: 'INCOMPLETE_PHONE_NUMBER',
              suggestion: phoneValidation.suggestion
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        normalizedFrom = from.startsWith('+') ? from : `+${from}`;  // Número: garantir +
      } else {
        // Não é Sender ID válido nem número de telefone
        console.error('[Twilio SMS] Invalid sender format:', from);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Remetente inválido: "${from}". Use um Sender ID (3-11 caracteres alfanuméricos) ou um número de telefone.`,
            code: 'INVALID_SENDER_FORMAT'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log(`Normalized from: "${from}" -> "${normalizedFrom}" (isSenderId: ${isSenderId(from)}, isPhone: ${looksLikePhoneNumber(from)})`);
      console.log('Twilio request params:', {
        To: normalizedTo,
        From: normalizedFrom,
        FromType: isSenderId(from) ? 'Sender ID' : 'Phone Number',
        BodyLength: body.length
      });
      
      const formData = new URLSearchParams();
      formData.append('To', normalizedTo);
      formData.append('From', normalizedFrom);
      formData.append('Body', body);
      formData.append('StatusCallback', webhookUrl);

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      const errorData = twilioData;
      console.error('Twilio API error:', errorData);
      
      // Tratamento específico para erro 21267 (Sender ID em trial)
      if (errorData.code === 21267) {
        console.error('[Twilio SMS] Sender ID not allowed in trial account');
        return new Response(
          JSON.stringify({
            success: false,
            provider: 'twilio',
            code: 21267,
            error: 'Sender IDs alfanuméricos não são permitidos em contas trial Twilio',
            suggestion: 'Use um número real como remetente ou faça upgrade da sua conta',
            alternativeProvider: 'vonage',
            upgradeUrl: 'https://console.twilio.com/us1/billing/upgrade',
            details: errorData.message,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      // Tratamento genérico para outros erros
      const status = typeof errorData.status === 'number' ? errorData.status : 400;
      return new Response(
        JSON.stringify({ 
          success: false, 
          provider: 'twilio', 
          code: errorData.code, 
          error: errorData.message || 'Failed to send SMS via Twilio',
          details: JSON.stringify(errorData)
        }),
        { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

      console.log('SMS sent successfully via Twilio:', twilioData.sid);

      response = {
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
        provider: 'twilio'
      };
    }

    // Log successful SMS
    if (userId) {
      const logData = {
        user_id: userId,
        to_number: to,
        from_number: from,
        message: body,
        provider: provider,
        status: 'sent',
        external_id: response.messageSid
      };

      const { error: logError } = await supabase
        .from('sms_logs')
        .insert(logData);

      if (logError) {
        console.error('Error logging SMS:', logError);
      }
    }

    console.log('SMS sent successfully');
    console.log('=== SMS Send Request Completed ===');

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-sms function:', error);
    
    // Try to log failed SMS if we have the necessary data
    try {
      const authHeader2 = req.headers.get('Authorization');
      if (authHeader2) {
        const supabaseUrl2 = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey2 = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase2 = createClient(supabaseUrl2, supabaseKey2, {
          global: { headers: { Authorization: authHeader2 } }
        });
        
        const { data: { user } } = await supabase2.auth.getUser();
        if (user) {
          const requestBody = await req.clone().json();
          const logData = {
            user_id: user.id,
            to_number: requestBody.to || '',
            from_number: requestBody.from || '',
            message: requestBody.body || '',
            provider: requestBody.provider || 'twilio',
            status: 'failed',
            error_message: error.message
          };

          await supabase2.from('sms_logs').insert(logData);
        }
      }
    } catch (logError) {
      console.error('Error logging failed SMS:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
