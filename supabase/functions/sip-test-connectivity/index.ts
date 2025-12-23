import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  status: 'passed' | 'failed' | 'warning';
  endpoint_registered: boolean;
  credentials_valid: boolean;
  api_reachable: boolean;
  account_status: string;
  latency_ms: number;
  error_message?: string;
  error_code?: string;
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Não autorizado');
    }

    const { provider, test_type = 'full' } = await req.json();
    const startTime = Date.now();
    const isPostCreation = test_type === 'post_creation';

    const result: TestResult = {
      status: 'passed',
      endpoint_registered: false,
      credentials_valid: false,
      api_reachable: false,
      account_status: 'unknown',
      latency_ms: 0,
      recommendations: [],
    };

    console.log('[SIP Connectivity Test] Starting test for provider:', provider, 'type:', test_type);

    // TESTE 1: Verificar se o SIP user existe
    const { data: sipUser, error: sipError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('is_active', true)
      .maybeSingle();

    if (!sipUser) {
      result.status = 'failed';
      result.error_message = 'Ramal SIP não configurado';
      result.error_code = 'NO_SIP_USER';
      result.recommendations.push('Configure seu ramal SIP primeiro na aba "Meu Ramal"');
      return respondWithTest(supabase, user.id, null, provider, test_type, result, startTime);
    }

    result.credentials_valid = true;
    console.log('[SIP Connectivity Test] SIP user found:', sipUser.id);

    // TESTE 2: Verificar se o endpoint está registrado
    const { data: endpoint } = await supabase
      .from('sip_endpoints')
      .select('*')
      .eq('sip_user_id', sipUser.id)
      .eq('status', 'registered')
      .maybeSingle();

    if (endpoint) {
      result.endpoint_registered = true;
      console.log('[SIP Connectivity Test] Endpoint registered');
      
      // Verificar se está online (última atividade < 5 min)
      const lastSeen = new Date(endpoint.last_seen).getTime();
      const now = Date.now();
      const minutesAgo = (now - lastSeen) / 1000 / 60;
      
      if (minutesAgo > 5) {
        result.status = 'warning';
        result.recommendations.push(`Endpoint registrado mas inativo há ${Math.round(minutesAgo)} minutos`);
        result.recommendations.push('Verifique se seu softphone está conectado');
      }
    } else {
      // Para testes pós-criação, endpoint não registrado ainda é NORMAL
      if (isPostCreation) {
        result.status = result.status === 'failed' ? 'warning' : result.status;
        result.recommendations.push('✓ Usuário criado com sucesso!');
        result.recommendations.push('⏳ Endpoint ainda não registrado (normal para usuário novo)');
        result.recommendations.push('📱 Configure seu softphone com as credenciais para ativar o ramal');
      } else {
        result.status = 'warning';
        result.recommendations.push('⚠️ Ramal não está registrado no servidor SIP');
        result.recommendations.push('Configure seu softphone com as credenciais da aba "Meu Ramal"');
        result.recommendations.push('Use o QR Code para configuração automática');
      }
      console.log('[SIP Connectivity Test] Endpoint NOT registered');
    }

    // TESTE 3: Verificar número ativo
    const { data: phoneNumbers, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('is_active', true)
      .limit(1);

    console.log('[SIP Connectivity Test] Phone numbers found:', phoneNumbers?.length);

    if (!phoneNumbers || phoneNumbers.length === 0) {
      result.status = 'failed';
      result.error_message = 'Nenhum número ativo encontrado';
      result.error_code = 'NO_ACTIVE_NUMBER';
      result.recommendations.push('Adicione um número de telefone ativo na seção "Números"');
      return respondWithTest(supabase, user.id, sipUser.id, provider, test_type, result, startTime);
    }

    const phoneNumber = phoneNumbers[0];
    console.log('[SIP Connectivity Test] Active phone number found:', phoneNumber.phone_number);

    // TESTE 4: Testar API do provider
    try {
      if (provider === 'twilio') {
        result.api_reachable = await testTwilioAPI();
        result.account_status = await checkTwilioAccountStatus();
        console.log('[SIP Connectivity Test] Twilio API status:', result.account_status);
        
        if (result.account_status === 'voice_disabled') {
          result.status = 'failed';
          result.error_message = 'Chamadas de voz desabilitadas na conta Twilio';
          result.recommendations.push('Entre em contato com o suporte da Twilio para habilitar chamadas de voz');
        } else if (result.account_status === 'insufficient_funds') {
          result.status = 'failed';
          result.error_message = 'Saldo insuficiente na conta Twilio';
          result.recommendations.push('Adicione créditos à sua conta Twilio');
        }
      } else if (provider === 'vonage') {
        result.api_reachable = await testVonageAPI();
        result.account_status = await checkVonageAccountStatus();
        console.log('[SIP Connectivity Test] Vonage API status:', result.account_status);
        
        if (result.account_status === 'low_balance') {
          result.status = 'warning';
          result.recommendations.push('⚠️ Saldo baixo na conta Vonage (< €1)');
          result.recommendations.push('Considere adicionar créditos para evitar interrupções');
        }
        
        // Mesmo se a API falhar, não bloquear completamente se o endpoint estiver registrado
        if (!result.api_reachable && result.endpoint_registered) {
          result.status = result.status === 'failed' ? 'warning' : result.status;
          result.recommendations.push('⚠️ Não foi possível verificar o status da API do provedor');
          result.recommendations.push('Mas o ramal está registrado e pode funcionar normalmente');
        }
      }
    } catch (error) {
      console.error('[SIP Connectivity Test] API test error:', error);
      result.api_reachable = false;
      
      // Se o endpoint estiver registrado, apenas avisar ao invés de falhar
      if (result.endpoint_registered) {
        result.status = 'warning';
        result.recommendations.push('⚠️ Erro ao verificar API do provedor, mas ramal está ativo');
      } else {
        result.status = 'failed';
        result.recommendations.push('Não foi possível verificar o status da API do provedor');
      }
    }

    // Calcular latência
    result.latency_ms = Date.now() - startTime;

    console.log('[SIP Connectivity Test] Test completed:', result);

    // Salvar resultado do teste
    return respondWithTest(supabase, user.id, sipUser.id, provider, test_type, result, startTime);

  } catch (error) {
    console.error('[SIP Connectivity Test] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function testTwilioAPI(): Promise<boolean> {
  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!accountSid || !authToken) {
      console.log('[Twilio Test] Missing credentials - SID:', !!accountSid, 'Token:', !!authToken);
      return false;
    }

    console.log('[Twilio Test] Testing API with SID:', accountSid.substring(0, 8) + '...');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        },
      }
    );
    
    console.log('[Twilio Test] API response status:', response.status);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Twilio Test] API error:', errorBody);
    }
    
    return response.ok;
  } catch (error) {
    console.error('[Twilio Test] Error:', error);
    return false;
  }
}

async function checkTwilioAccountStatus(): Promise<string> {
  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!accountSid || !authToken) return 'no_credentials';

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('[Twilio Status] API error:', error);
      if (error.code === 10005) return 'voice_disabled';
      if (error.code === 20003) return 'insufficient_funds';
      return 'error';
    }
    
    const data = await response.json();
    return data.status || 'active';
    
  } catch (error) {
    console.error('[Twilio Status] Error:', error);
    return 'unknown';
  }
}

async function testVonageAPI(): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('VONAGE_API_KEY');
    const apiSecret = Deno.env.get('VONAGE_API_SECRET');
    
    if (!apiKey || !apiSecret) {
      console.log('[Vonage Test] Missing credentials - API Key:', !!apiKey, 'API Secret:', !!apiSecret);
      return false;
    }

    console.log('[Vonage Test] Testing API with key:', apiKey.substring(0, 8) + '...');

    const response = await fetch(
      `https://api.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`
    );
    
    console.log('[Vonage Test] API response status:', response.status);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Vonage Test] API error:', errorBody);
    }
    
    return response.ok;
  } catch (error) {
    console.error('[Vonage Test] Error:', error);
    return false;
  }
}

async function checkVonageAccountStatus(): Promise<string> {
  try {
    const apiKey = Deno.env.get('VONAGE_API_KEY');
    const apiSecret = Deno.env.get('VONAGE_API_SECRET');
    
    if (!apiKey || !apiSecret) return 'no_credentials';

    const response = await fetch(
      `https://api.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`
    );
    
    if (!response.ok) {
      console.error('[Vonage Status] API error');
      return 'error';
    }
    
    const data = await response.json();
    const balance = parseFloat(data.value);
    
    console.log('[Vonage Status] Balance:', balance);
    
    if (balance < 1) return 'low_balance';
    return 'active';
    
  } catch (error) {
    console.error('[Vonage Status] Error:', error);
    return 'unknown';
  }
}

async function respondWithTest(
  supabase: any,
  userId: string,
  sipUserId: string | null,
  provider: string,
  testType: string,
  result: TestResult,
  startTime: number
) {
  result.latency_ms = Date.now() - startTime;

  // Salvar resultado no banco
  try {
    const { error: insertError } = await supabase.from('sip_connectivity_tests').insert({
      user_id: userId,
      sip_user_id: sipUserId,
      provider,
      test_type: testType,
      status: result.status,
      endpoint_registered: result.endpoint_registered,
      credentials_valid: result.credentials_valid,
      api_reachable: result.api_reachable,
      account_status: result.account_status,
      latency_ms: result.latency_ms,
      error_message: result.error_message,
      error_code: result.error_code,
      recommendations: result.recommendations,
    });

    if (insertError) {
      console.error('[SIP Connectivity Test] Error saving result:', insertError);
    }
  } catch (error) {
    console.error('[SIP Connectivity Test] Error saving result:', error);
  }

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}
