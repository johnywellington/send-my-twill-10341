import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountStatus {
  provider: string;
  accountType: 'trial' | 'active' | 'suspended' | 'unknown';
  status: string;
  balance?: number;
  currency?: string;
  friendlyName?: string;
  accountId: string;
  limitations?: string[];
  recommendations?: string[];
  lastChecked: string;
}

async function checkTwilioAccount(accountSid: string, authToken: string): Promise<AccountStatus> {
  const startTime = Date.now();
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
    {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
    }
  );

  const latency = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${error}`);
  }

  const account = await response.json();
  const isTrial = account.type === 'Trial';

  const limitations = isTrial ? [
    'Sender IDs alfanuméricos bloqueados',
    'Apenas números verificados podem receber mensagens',
    'Prefixo "Sent from your Twilio trial account" em SMS',
    'Limite de chamadas e SMS por dia'
  ] : [];

  const recommendations = isTrial ? [
    'Faça upgrade para conta paga para remover limitações',
    'Verifique números de destino no console Twilio',
    'Use números reais como remetente'
  ] : ['Conta ativa - todas funcionalidades disponíveis'];

  return {
    provider: 'twilio',
    accountType: isTrial ? 'trial' : 'active',
    status: account.status,
    friendlyName: account.friendly_name,
    accountId: accountSid.substring(0, 10) + '...',
    limitations,
    recommendations,
    lastChecked: new Date().toISOString(),
  };
}

async function checkVonageAccount(apiKey: string, apiSecret: string): Promise<AccountStatus> {
  const startTime = Date.now();
  
  const response = await fetch(
    `https://rest.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`
  );

  const latency = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vonage API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const balance = parseFloat(data.value);
  const isLowBalance = balance < 5;

  const limitations = isLowBalance ? [
    'Saldo baixo - recarregue para evitar interrupções',
    'Algumas funcionalidades podem ser limitadas'
  ] : [];

  const recommendations = isLowBalance ? [
    'Adicione créditos à sua conta Vonage',
    'Configure alertas de saldo baixo'
  ] : ['Conta ativa com saldo suficiente'];

  return {
    provider: 'vonage',
    accountType: balance > 0 ? 'active' : 'suspended',
    status: balance > 0 ? 'active' : 'no_balance',
    balance,
    currency: 'EUR',
    accountId: apiKey.substring(0, 8) + '...',
    limitations,
    recommendations,
    lastChecked: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { provider, credentialId } = await req.json();

    let accountStatus: AccountStatus;
    let latencyMs: number;
    const startTime = Date.now();

    if (provider === 'twilio') {
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (!accountSid || !authToken) {
        throw new Error('Credenciais Twilio não configuradas');
      }

      accountStatus = await checkTwilioAccount(accountSid, authToken);
      latencyMs = Date.now() - startTime;
    } else if (provider === 'vonage') {
      const apiKey = Deno.env.get('VONAGE_API_KEY');
      const apiSecret = Deno.env.get('VONAGE_API_SECRET');

      if (!apiKey || !apiSecret) {
        throw new Error('Credenciais Vonage não configuradas');
      }

      accountStatus = await checkVonageAccount(apiKey, apiSecret);
      latencyMs = Date.now() - startTime;
    } else {
      throw new Error('Provider não suportado');
    }

    // Save validation log
    await supabase.from('api_validation_logs').insert({
      user_id: user.id,
      credential_id: credentialId || null,
      provider,
      validation_type: 'account_check',
      status: 'success',
      account_type: accountStatus.accountType,
      account_info: accountStatus,
      latency_ms: latencyMs,
      tested_at: new Date().toISOString(),
    });

    console.log(`[Account Status] ${provider} check successful:`, accountStatus.accountType);

    return new Response(
      JSON.stringify({ 
        success: true,
        ...accountStatus,
        latency: latencyMs
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Account Status] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        accountType: 'unknown',
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});