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

    const { username, password, extension, display_name, domain_group_id, credentialId } = await req.json();

    console.log('Creating Vonage SIP endpoint:', {
      username,
      extension,
      display_name,
      domain_group_id,
      user_id: user.id
    });

    // ✅ VALIDAÇÃO PREVENTIVA: Verificar se extensão já existe
    const { data: existingExtension } = await supabase
      .from('sip_users')
      .select('id, extension, sip_username, display_name')
      .eq('extension', extension)
      .eq('provider', 'vonage')
      .maybeSingle();

    if (existingExtension) {
      throw new Error(`Extensão ${extension} já está em uso por "${existingExtension.display_name || existingExtension.sip_username}"`);
    }

    // ✅ VALIDAÇÃO PREVENTIVA: Verificar se username já existe
    const { data: existingUsername } = await supabase
      .from('sip_users')
      .select('id, extension, sip_username, display_name')
      .eq('sip_username', username)
      .eq('provider', 'vonage')
      .maybeSingle();

    if (existingUsername) {
      throw new Error(`Nome de usuário SIP "${username}" já está em uso (extensão ${existingUsername.extension})`);
    }

    console.log('✓ Extension and username available');

    // Get Vonage config (use domain_group_id if provided, otherwise use default)
    let configMap: Record<string, string>;
    let domainGroupId: string;

    if (domain_group_id) {
      // Usar app específica
      const { data: configs } = await supabase
        .from('sip_provider_config')
        .select('config_key, config_value, domain_group_id')
        .eq('domain_group_id', domain_group_id)
        .in('config_key', ['app_id', 'sip_domain']);

      configMap = configs?.reduce((acc, c) => ({ ...acc, [c.config_key]: c.config_value }), {} as Record<string, string>) || {};
      domainGroupId = configs?.[0]?.domain_group_id;

      if (!configMap.app_id || !configMap.sip_domain) {
        throw new Error('Specified Vonage app not found');
      }
    } else {
      // Usar app padrão
      const { data: configs } = await supabase
        .from('sip_provider_config')
        .select('config_key, config_value, domain_group_id')
        .eq('provider', 'vonage')
        .eq('is_default', true)
        .eq('is_active', true)
        .in('config_key', ['app_id', 'sip_domain']);

      configMap = configs?.reduce((acc, c) => ({ ...acc, [c.config_key]: c.config_value }), {} as Record<string, string>) || {};
      domainGroupId = configs?.[0]?.domain_group_id;

      if (!configMap.app_id || !configMap.sip_domain) {
        throw new Error('No default Vonage app configured. Please run setup first.');
      }
    }

    const vonageKey = Deno.env.get('VONAGE_API_KEY');
    const vonageSecret = Deno.env.get('VONAGE_API_SECRET');

    // Create SIP endpoint
    const endpointResponse = await fetch(
      `https://api.nexmo.com/v1/applications/${configMap.app_id}/endpoints`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${vonageKey}:${vonageSecret}`),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          extension,
        }),
      }
    );

    const endpoint = await endpointResponse.json();

    // Insert into database
    const { data: sipUser, error: insertError } = await supabase
      .from('sip_users')
      .insert({
        user_id: user.id,
        provider: 'vonage',
        sip_username: username,
        sip_password: password,
        sip_domain: configMap.sip_domain,
        extension,
        display_name,
        vonage_endpoint_id: endpoint.id,
        domain_group_id: domainGroupId || null,
        credential_id: credentialId || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log event
    await supabase.functions.invoke('log-sip-event', {
      body: {
        event_type: 'user_created',
        event_category: 'user',
        user_id: user.id,
        domain_group_id: domainGroupId,
        sip_user_id: sipUser.id,
        provider: 'vonage',
        event_data: {
          username: username,
          extension: extension,
          display_name: display_name,
        }
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        sip_user: sipUser,
        sip_uri: `sip:${extension}@${configMap.sip_domain}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating Vonage SIP endpoint:', error);
    
    // Extrair mensagem de erro (suporte para Error objects e objetos Supabase)
    let errorMessage = 'Unknown error';
    let errorCode = null;
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      // Erro do Supabase: { code, message, details }
      if (error.code === '23505') {
        // Constraint unique violation
        if (error.details?.includes('extension')) {
          errorMessage = 'Esta extensão já está em uso. Escolha outro número de ramal.';
        } else if (error.details?.includes('sip_username')) {
          errorMessage = 'Este nome de usuário SIP já está em uso. Escolha outro.';
        } else {
          errorMessage = 'Já existe um registro com estes dados.';
        }
      } else if (error.code === '23503') {
        // Foreign key violation
        errorMessage = 'Referência inválida. Verifique se o domain_group_id está correto.';
      } else {
        errorMessage = error.message || error.details || JSON.stringify(error);
      }
      errorCode = error.code;
      errorDetails = error.details;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: errorCode,
        details: errorDetails 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});