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

    // Gerar JWT para autenticação
    const vonagePrivateKey = Deno.env.get('VONAGE_PRIVATE_KEY');
    const vonageAppId = Deno.env.get('VONAGE_APPLICATION_ID');

    if (!vonagePrivateKey || !vonageAppId) {
      throw new Error('Vonage credentials not configured');
    }

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
              'Authorization': `Bearer ${jwt}`,
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
