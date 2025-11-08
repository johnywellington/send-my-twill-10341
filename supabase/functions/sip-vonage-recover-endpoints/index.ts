import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    console.log('[Vonage Recover] Starting recovery for user:', user.id);

    // Buscar usuários Vonage sem endpoint_id
    const { data: missingUsers, error: fetchError } = await supabase
      .from('sip_users')
      .select('id, sip_username, sip_domain, extension')
      .eq('provider', 'vonage')
      .is('vonage_endpoint_id', null)
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    if (!missingUsers || missingUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum usuário Vonage sem ID encontrado',
          recovered: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vonage Recover] Found ${missingUsers.length} users without endpoint_id`);

    // Autenticação PSIP (Basic)
    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
    if (!vonageApiKey || !vonageApiSecret) {
      throw new Error('Vonage API key/secret não configurados');
    }
    const basicAuth = 'Basic ' + btoa(`${vonageApiKey}:${vonageApiSecret}`);

    // Recuperar IDs da API para cada usuário
    const results = {
      recovered: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const sipUser of missingUsers) {
      try {
        console.log(`[Vonage Recover] Checking ${sipUser.sip_username} at ${sipUser.sip_domain}`);

        const response = await fetch(
          `https://api.nexmo.com/v1/psip/${sipUser.sip_domain}/users/${sipUser.sip_username}`,
          {
            method: 'GET',
            headers: {
              'Authorization': basicAuth,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Vonage Recover] User ${sipUser.sip_username} not found in API:`, errorText);
          results.failed++;
          results.errors.push(`${sipUser.sip_username}: Não encontrado na API Vonage`);
          continue;
        }

        const vonageUser = await response.json();
        console.log(`[Vonage Recover] Found user ${sipUser.sip_username}, ID: ${vonageUser.id}`);

        // Atualizar banco com o ID
        const { error: updateError } = await supabase
          .from('sip_users')
          .update({ vonage_endpoint_id: vonageUser.id })
          .eq('id', sipUser.id);

        if (updateError) {
          console.error(`[Vonage Recover] Error updating ${sipUser.sip_username}:`, updateError);
          results.failed++;
          results.errors.push(`${sipUser.sip_username}: Erro ao atualizar banco`);
        } else {
          results.recovered++;
        }
      } catch (error: any) {
        console.error(`[Vonage Recover] Exception for ${sipUser.sip_username}:`, error);
        results.failed++;
        results.errors.push(`${sipUser.sip_username}: ${error.message}`);
      }
    }

    console.log('[Vonage Recover] Results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recuperados ${results.recovered} de ${missingUsers.length} usuários`,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Vonage Recover] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
