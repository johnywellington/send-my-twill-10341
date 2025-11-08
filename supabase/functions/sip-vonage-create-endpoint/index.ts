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

    // Gerar JWT para autenticação com Vonage Programmable SIP API
    const vonagePrivateKey = Deno.env.get('VONAGE_PRIVATE_KEY');
    const vonageAppId = Deno.env.get('VONAGE_APPLICATION_ID');

    if (!vonagePrivateKey || !vonageAppId) {
      throw new Error('Vonage credentials not configured');
    }

    // Helpers para JWT RS256
    const pemToArrayBuffer = (pem: string): ArrayBuffer => {
      const clean = pem
        .replace(/\\n/g, '\n')
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\r?\n|\s/g, '');
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    };

    const base64UrlEncode = (input: Uint8Array) =>
      btoa(String.fromCharCode(...input))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const base64UrlEncodeString = (str: string) =>
      base64UrlEncode(new TextEncoder().encode(str));

    // Montar JWT
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      application_id: vonageAppId,
      iat: now,
      exp: now + 15 * 60,
      jti: crypto.randomUUID(),
    };

    const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
    const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
    const toSign = `${encodedHeader}.${encodedPayload}`;

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(vonagePrivateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(toSign)
    );
    const jwt = `${toSign}.${base64UrlEncode(new Uint8Array(signature))}`;

    console.log(`Creating Vonage PSIP user at domain: ${configMap.sip_domain}`);

    // Create SIP user via Vonage Programmable SIP API
    const endpointResponse = await fetch(
      `https://api.nexmo.com/v1/psip/${configMap.sip_domain}/users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: username,
          secret: password,
          authType: 'digest',
        }),
      }
    );

    if (!endpointResponse.ok) {
      const errorText = await endpointResponse.text();
      console.error('Vonage API error:', errorText);
      throw new Error(`Vonage call failed: ${errorText}`);
    }

    const vonageUser = await endpointResponse.json();
    console.log('Vonage user created:', vonageUser);

    // Insert into database with correct Vonage user ID
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
        vonage_endpoint_id: vonageUser.id,  // ✅ ID correto da API
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