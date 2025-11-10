import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização não encontrado');
    }

    // Create Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      throw new Error('Usuário não autenticado');
    }

    console.log('Usuário autenticado:', user.id);

    const { credentialId } = await req.json();
    console.log('Sincronizando subcontas para credencial:', credentialId);

    // Buscar credencial principal
    const { data: credential, error: credError } = await supabaseClient
      .from('provider_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('user_id', user.id)
      .single();

    if (credError || !credential) {
      throw new Error('Credencial não encontrada');
    }

    console.log('Credencial encontrada:', credential.provider);

    let remoteSubaccounts: any[] = [];
    let added = 0;
    let updated = 0;

    // Listar subcontas do provedor
    if (credential.provider === 'twilio') {
      const authHeader = btoa(`${credential.account_identifier}:${credential.secret_key}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${credential.account_identifier}/Accounts.json`,
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro Twilio:', errorText);
        throw new Error(`Erro ao consultar API Twilio: ${response.status}`);
      }

      const data = await response.json();
      remoteSubaccounts = data.accounts || [];
      console.log(`Encontradas ${remoteSubaccounts.length} subcontas no Twilio`);

    } else if (credential.provider === 'vonage') {
      const authHeader = btoa(`${credential.account_identifier}:${credential.secret_key}`);
      
      const response = await fetch(
        `https://api.nexmo.com/accounts/${credential.account_identifier}/subaccounts`,
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro Vonage:', errorText);
        throw new Error(`Erro ao consultar API Vonage: ${response.status}`);
      }

      const data = await response.json();
      remoteSubaccounts = data._embedded?.subaccounts || [];
      console.log(`Encontradas ${remoteSubaccounts.length} subcontas no Vonage`);
    }

    // Buscar subcontas locais
    const { data: localSubaccounts } = await supabaseClient
      .from('provider_subaccounts')
      .select('*')
      .eq('parent_credential_id', credentialId);

    const localMap = new Map(
      (localSubaccounts || []).map((sub: any) => [
        credential.provider === 'twilio' ? sub.subaccount_sid : sub.subaccount_api_key,
        sub
      ])
    );

    // Sincronizar subcontas
    for (const remote of remoteSubaccounts) {
      const remoteId = credential.provider === 'twilio' ? remote.sid : remote.api_key;
      const remoteName = credential.provider === 'twilio' ? remote.friendly_name : remote.name;
      
      const local = localMap.get(remoteId);

      if (local) {
        // Atualizar existente
        const { error: updateError } = await supabaseClient
          .from('provider_subaccounts')
          .update({
            subaccount_name: remoteName,
            is_active: credential.provider === 'twilio' 
              ? remote.status === 'active'
              : true,
            api_metadata: remote,
            updated_at: new Date().toISOString(),
          })
          .eq('id', local.id);

        if (!updateError) {
          updated++;
          console.log(`Atualizada subconta: ${remoteName}`);
        }
      } else {
        // Inserir nova
        const insertData: any = {
          parent_credential_id: credentialId,
          user_id: user.id,
          provider: credential.provider,
          subaccount_name: remoteName,
          is_active: credential.provider === 'twilio' 
            ? remote.status === 'active'
            : true,
          api_metadata: remote,
        };

        if (credential.provider === 'twilio') {
          insertData.subaccount_sid = remote.sid;
          insertData.subaccount_api_secret = remote.auth_token;
          insertData.use_parent_balance = true; // Twilio sempre usa saldo pai
        } else {
          insertData.subaccount_api_key = remote.api_key;
          insertData.use_parent_balance = remote.use_primary_account_balance !== false;
        }

        const { error: insertError } = await supabaseClient
          .from('provider_subaccounts')
          .insert(insertData);

        if (!insertError) {
          added++;
          console.log(`Adicionada subconta: ${remoteName}`);
        } else {
          console.error('Erro ao inserir:', insertError);
        }
      }
    }

    console.log(`Sincronização concluída: ${added} novas, ${updated} atualizadas`);

    return new Response(
      JSON.stringify({
        success: true,
        added,
        updated,
        total: remoteSubaccounts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
