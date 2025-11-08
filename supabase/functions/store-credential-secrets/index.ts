import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoreCredentialRequest {
  credentialId: string;
  provider: 'twilio' | 'vonage';
  credentials: {
    // Twilio
    accountSid?: string;
    authToken?: string;
    // Vonage
    apiKey?: string;
    apiSecret?: string;
    applicationId?: string;
    privateKey?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Store Credential Secrets Started ===');

    // Autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const jwt = authHeader.replace('Bearer', '').trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { credentialId, provider, credentials }: StoreCredentialRequest = await req.json();

    console.log('User:', user.id, 'Provider:', provider, 'CredentialId:', credentialId);

    // Validar que a credencial pertence ao usuário
    const { data: credential, error: credError } = await supabase
      .from('provider_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('user_id', user.id)
      .single();

    if (credError || !credential) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credencial não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar secret_key único se não existir
    let secretKey = credential.secret_key;
    if (!secretKey) {
      // Gerar chave única: provider_timestamp_random
      secretKey = `${provider}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Atualizar a credencial com o secret_key
      const { error: updateError } = await supabase
        .from('provider_credentials')
        .update({ secret_key: secretKey })
        .eq('id', credentialId);

      if (updateError) {
        console.error('Error updating secret_key:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao atualizar secret_key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Using secret_key:', secretKey);

    // IMPORTANTE: Em produção, os secrets devem ser armazenados usando a API de Secrets do Supabase
    // Por enquanto, vamos retornar instruções para o usuário adicionar manualmente
    
    const secretsToCreate: Record<string, string> = {};

    if (provider === 'twilio') {
      if (credentials.accountSid) {
        secretsToCreate[`CRED_${secretKey}_sid`] = credentials.accountSid;
      }
      if (credentials.authToken) {
        secretsToCreate[`CRED_${secretKey}_token`] = credentials.authToken;
      }
    } else if (provider === 'vonage') {
      if (credentials.apiKey) {
        secretsToCreate[`CRED_${secretKey}_key`] = credentials.apiKey;
      }
      if (credentials.apiSecret) {
        secretsToCreate[`CRED_${secretKey}_secret`] = credentials.apiSecret;
      }
      if (credentials.applicationId) {
        secretsToCreate[`CRED_${secretKey}_app_id`] = credentials.applicationId;
      }
      if (credentials.privateKey) {
        secretsToCreate[`CRED_${secretKey}_private_key`] = credentials.privateKey;
      }
    }

    console.log('Secrets to create:', Object.keys(secretsToCreate));

    // Log da operação
    console.log(`✅ Credential secrets prepared for ${provider} (secret_key: ${secretKey})`);

    return new Response(
      JSON.stringify({
        success: true,
        secretKey,
        secretsToCreate: Object.keys(secretsToCreate),
        message: 'Secrets preparados. Use a interface de secrets do Supabase para armazená-los.',
        // Em ambiente real, os valores não devem ser retornados
        // Mas para desenvolvimento/debug, vamos incluir
        _debug_secrets: secretsToCreate
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in store-credential-secrets:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao armazenar credenciais'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
