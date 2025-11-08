import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { corsHeaders } from '../_shared/cors.ts';

interface ImportResult {
  success: boolean;
  imported: Array<{
    provider: string;
    credential_name: string;
    account_identifier: string;
  }>;
  skipped: Array<{
    provider: string;
    reason: string;
  }>;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorização não fornecida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ImportResult = {
      success: true,
      imported: [],
      skipped: [],
      errors: [],
    };

    // Import Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (twilioAccountSid && twilioAuthToken) {
      // Check if already exists
      const { data: existingTwilio } = await supabase
        .from('provider_credentials')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'twilio')
        .eq('account_identifier', twilioAccountSid)
        .single();

      if (existingTwilio) {
        result.skipped.push({
          provider: 'Twilio',
          reason: 'Credencial já existe no sistema',
        });
      } else {
        const { error: insertError } = await supabase
          .from('provider_credentials')
          .insert({
            user_id: user.id,
            provider: 'twilio',
            credential_name: 'Twilio Principal',
            account_identifier: twilioAccountSid,
            is_default: true,
            is_active: true,
          });

        if (insertError) {
          result.errors.push(`Erro ao importar Twilio: ${insertError.message}`);
        } else {
          result.imported.push({
            provider: 'Twilio',
            credential_name: 'Twilio Principal',
            account_identifier: twilioAccountSid,
          });
        }
      }
    } else {
      result.skipped.push({
        provider: 'Twilio',
        reason: 'Credenciais não encontradas nas variáveis de ambiente',
      });
    }

    // Import Vonage credentials
    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');

    if (vonageApiKey && vonageApiSecret) {
      // Check if already exists
      const { data: existingVonage } = await supabase
        .from('provider_credentials')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'vonage')
        .eq('account_identifier', vonageApiKey)
        .single();

      if (existingVonage) {
        result.skipped.push({
          provider: 'Vonage',
          reason: 'Credencial já existe no sistema',
        });
      } else {
        const { error: insertError } = await supabase
          .from('provider_credentials')
          .insert({
            user_id: user.id,
            provider: 'vonage',
            credential_name: 'Vonage Principal',
            account_identifier: vonageApiKey,
            is_default: true,
            is_active: true,
          });

        if (insertError) {
          result.errors.push(`Erro ao importar Vonage: ${insertError.message}`);
        } else {
          result.imported.push({
            provider: 'Vonage',
            credential_name: 'Vonage Principal',
            account_identifier: vonageApiKey,
          });
        }
      }
    } else {
      result.skipped.push({
        provider: 'Vonage',
        reason: 'Credenciais não encontradas nas variáveis de ambiente',
      });
    }

    // Link existing phone numbers to imported credentials if any were imported
    if (result.imported.length > 0) {
      for (const imported of result.imported) {
        const { data: credential } = await supabase
          .from('provider_credentials')
          .select('id')
          .eq('user_id', user.id)
          .eq('provider', imported.provider.toLowerCase())
          .eq('account_identifier', imported.account_identifier)
          .single();

        if (credential) {
          await supabase
            .from('phone_numbers')
            .update({ credential_id: credential.id })
            .eq('user_id', user.id)
            .eq('provider', imported.provider.toLowerCase())
            .is('credential_id', null);
        }
      }
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error importing credentials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
