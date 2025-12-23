import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  provider: string;
  accountName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Test Connection] Request received');

    // Verificar se há token de autorização
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Test Connection] No authorization header');
      throw new Error('Token de autorização não fornecido');
    }

    console.log('[Test Connection] Creating Supabase client');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('[Test Connection] Getting user');
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError) {
      console.error('[Test Connection] Auth error:', authError);
      throw new Error(`Erro de autenticação: ${authError.message}`);
    }

    if (!user) {
      console.error('[Test Connection] No user found');
      throw new Error('Usuário não autenticado');
    }

    console.log('[Test Connection] User authenticated:', user.id);

    const { credentialId } = await req.json();

    if (!credentialId) {
      throw new Error('credentialId é obrigatório');
    }

    console.log('[Test Connection] Testing credential:', credentialId);

    // Buscar credencial no banco
    const { data: credential, error: credError } = await supabaseClient
      .from('provider_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (credError) {
      console.error('[Test Connection] Database error:', credError);
      throw new Error(`Erro ao buscar credencial: ${credError.message}`);
    }

    if (!credential) {
      console.error('[Test Connection] Credential not found for id:', credentialId);
      throw new Error('Credencial não encontrada ou você não tem permissão para acessá-la');
    }

    console.log('[Test Connection] Credential found:', credential.provider, credential.account_name);

    const result: TestResult = {
      success: false,
      message: '',
      provider: credential.provider,
      accountName: credential.account_name,
    };

    // Testar conexão baseado no provider
    if (credential.provider === 'twilio') {
      result.success = await testTwilioConnection(credential);
      result.message = result.success 
        ? '✅ Conexão Twilio OK! Credenciais válidas.'
        : '❌ Falha na conexão Twilio. Verifique os secrets.';
    } else if (credential.provider === 'vonage') {
      result.success = await testVonageConnection(credential);
      result.message = result.success 
        ? '✅ Conexão Vonage OK! Credenciais válidas.'
        : '❌ Falha na conexão Vonage. Verifique os secrets.';
    } else {
      throw new Error(`Provider não suportado: ${credential.provider}`);
    }

    console.log('[Test Connection] Test result:', result.success ? 'SUCCESS' : 'FAILED');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Test Connection] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao testar conexão';
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage,
        provider: 'unknown',
        accountName: 'unknown',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function testTwilioConnection(credential: any): Promise<boolean> {
  try {
    const accountSid = credential.account_identifier;
    const secretKey = credential.secret_key;
    
    // Buscar Auth Token do ambiente
    const authToken = Deno.env.get(`CRED_${secretKey}_TOKEN`);
    
    if (!authToken) {
      console.error('[Twilio Test] Auth Token not found in environment');
      return false;
    }

    console.log('[Twilio Test] Testing with Account SID:', accountSid);

    // Fazer uma chamada simples à API do Twilio para validar as credenciais
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('[Twilio Test] Success! Account status:', data.status);
      return true;
    } else {
      const errorText = await response.text();
      console.error('[Twilio Test] Failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('[Twilio Test] Exception:', error);
    return false;
  }
}

async function testVonageConnection(credential: any): Promise<boolean> {
  try {
    const apiKey = credential.account_identifier;
    const secretKey = credential.secret_key;
    
    // Buscar API Secret do ambiente
    const apiSecret = Deno.env.get(`CRED_${secretKey}_SECRET`);
    
    if (!apiSecret) {
      console.error('[Vonage Test] API Secret not found in environment');
      return false;
    }

    console.log('[Vonage Test] Testing with API Key:', apiKey);

    // Fazer uma chamada simples à API do Vonage para validar as credenciais
    const response = await fetch(
      `https://rest.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`,
      {
        method: 'GET',
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('[Vonage Test] Success! Balance:', data.value);
      return true;
    } else {
      const errorText = await response.text();
      console.error('[Vonage Test] Failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('[Vonage Test] Exception:', error);
    return false;
  }
}
