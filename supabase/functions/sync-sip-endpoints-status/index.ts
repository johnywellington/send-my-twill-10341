import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logSyncOperation } from '../_shared/sync-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  success: boolean;
  synced: number;
  orphaned: any[];
  error?: string;
}

// Helper para buscar credenciais
async function getCredentials(supabase: any, userId: string, credentialId?: string) {
  if (credentialId) {
    const { data } = await supabase
      .from('provider_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('user_id', userId)
      .single();
    return data;
  }

  // Fallback para credenciais globais
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const vonageKey = Deno.env.get('VONAGE_API_KEY');
  const vonageSecret = Deno.env.get('VONAGE_API_SECRET');

  return {
    twilio: twilioSid && twilioToken ? { sid: twilioSid, token: twilioToken } : null,
    vonage: vonageKey && vonageSecret ? { key: vonageKey, secret: vonageSecret } : null,
  };
}

// Verificar se usuário Twilio existe na API
async function checkTwilioUser(sid: string, token: string, credentialSid: string) {
  try {
    const authHeader = `Basic ${btoa(`${sid}:${token}`)}`;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/SIP/CredentialLists/${credentialSid}.json`,
      { headers: { 'Authorization': authHeader } }
    );
    return response.status === 200;
  } catch (error) {
    console.error('[Twilio Check] Error:', error);
    return false;
  }
}

// Verificar se endpoint Vonage existe na API
async function checkVonageEndpoint(apiKey: string, apiSecret: string, endpointId: string, appId: string) {
  try {
    const response = await fetch(
      `https://api.nexmo.com/v1/applications/${appId}/endpoints/${endpointId}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
        },
      }
    );
    return response.status === 200;
  } catch (error) {
    console.error('[Vonage Check] Error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
      } catch (e) {
        console.warn('Could not extract user_id from token');
      }
    }

    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { credentialId } = await req.json();

    console.log('[SIP Endpoint Sync] Starting sync with orphan detection...');

    // Buscar todos os usuários SIP do usuário
    const { data: sipUsers, error: fetchError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('[SIP Endpoint Sync] Error fetching users:', fetchError);
      throw new Error('Erro ao buscar usuários');
    }

    console.log(`[SIP Endpoint Sync] Found ${sipUsers?.length || 0} SIP users`);

    const credentials = await getCredentials(supabase, userId, credentialId);
    const orphanedUsers: any[] = [];
    let syncedCount = 0;

    // Verificar cada usuário na API correspondente
    for (const user of sipUsers || []) {
      let exists = false;

      if (user.provider === 'twilio' && user.twilio_credential_sid) {
        const cred = credentials.twilio || (typeof credentials === 'object' && credentials.provider === 'twilio' ? credentials : null);
        if (cred) {
          exists = await checkTwilioUser(cred.sid || cred.account_identifier, cred.token || cred.secret_key, user.twilio_credential_sid);
        }
      } else if (user.provider === 'vonage' && user.vonage_endpoint_id) {
        const cred = credentials.vonage || (typeof credentials === 'object' && credentials.provider === 'vonage' ? credentials : null);
        if (cred) {
          // Precisamos buscar o application_id da config
          const { data: config } = await supabase
            .from('sip_provider_config')
            .select('config_value')
            .eq('provider', 'vonage')
            .eq('config_key', 'application_id')
            .eq('domain_group_id', user.domain_group_id)
            .single();

          if (config) {
            exists = await checkVonageEndpoint(cred.key || cred.account_identifier, cred.secret || cred.secret_key, user.vonage_endpoint_id, config.config_value);
          }
        }
      }

      if (!exists) {
        orphanedUsers.push({
          id: user.id,
          sip_username: user.sip_username,
          display_name: user.display_name,
          extension: user.extension,
          provider: user.provider,
        });
      } else {
        syncedCount++;
      }
    }

    console.log(`[SIP Endpoint Sync] Found ${orphanedUsers.length} orphaned users`);

    // Log success
    await logSyncOperation({
      userId,
      syncType: 'sip_endpoints',
      status: 'success',
      itemsUpdated: syncedCount,
      executionTimeMs: Date.now() - startTime,
      metadata: {
        total_checked: sipUsers?.length || 0,
        orphaned_count: orphanedUsers.length,
        synced_count: syncedCount,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount,
        orphaned: orphanedUsers,
      } as SyncResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SIP Endpoint Sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (userId) {
      await logSyncOperation({
        userId,
        syncType: 'sip_endpoints',
        status: 'error',
        errorMessage,
        executionTimeMs: Date.now() - startTime,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        synced: 0,
        orphaned: [],
      } as SyncResult),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
