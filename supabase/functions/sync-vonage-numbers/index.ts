import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { logSyncOperation } from '../_shared/sync-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VonageNumber {
  country: string;
  msisdn: string;
  type: string;
  features: string[];
  moHttpUrl?: string;
  voiceCallbackValue?: string;
}

interface VonageResponse {
  count: number;
  numbers: VonageNumber[];
  error_code?: string;
  error_message?: string;
}

interface OrphanedNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  provider: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Extrair user_id do header de autorização
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
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('VONAGE_API_KEY');
    const apiSecret = Deno.env.get('VONAGE_API_SECRET');

    if (!apiKey || !apiSecret) {
      console.error('Missing Vonage credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Credenciais Vonage não configuradas. Configure VONAGE_API_KEY e VONAGE_API_SECRET.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching numbers from Vonage API...');
    const vonageUrl = `https://rest.nexmo.com/account/numbers?api_key=${apiKey}&api_secret=${apiSecret}`;
    const response = await fetch(vonageUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vonage API error:', response.status, errorText);
      const errorMap: Record<number, string> = {
        401: 'Credenciais Vonage inválidas',
        420: 'Parâmetros inválidos',
        429: 'Limite de requisições excedido. Aguarde um momento.'
      };
      return new Response(
        JSON.stringify({ 
          error: errorMap[response.status] || `Erro ao buscar números: ${response.status}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data: VonageResponse = await response.json();
    console.log(`Found ${data.count} numbers in Vonage account`);

    // Formatar números para o padrão da aplicação
    const formattedNumbers = data.numbers.map((number) => {
      const phoneNumber = number.msisdn.startsWith('+') ? number.msisdn : `+${number.msisdn}`;
      return {
        phone_number: phoneNumber,
        friendly_name: null, // Vonage não fornece friendly_name
        country_code: number.country.toUpperCase(),
        provider: 'vonage',
        supports_sms: number.features.includes('SMS'),
        supports_voice: number.features.includes('VOICE'),
        supports_mms: false, // Vonage não reporta MMS neste endpoint
        is_active: true,
        is_verified: true,
        sync_source: 'vonage',
        webhook_configured: !!(number.moHttpUrl || number.voiceCallbackValue),
        notes: `Tipo: ${number.type}. Sincronizado automaticamente via API Vonage.`
      };
    });

    console.log('Successfully formatted numbers:', formattedNumbers.length);

    // Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Buscar existentes por phone_number+provider (global)
    const phoneList = formattedNumbers.map(n => n.phone_number);
    const { data: existing, error: existErr } = await supabase
      .from('phone_numbers')
      .select('id, user_id, phone_number, provider')
      .in('phone_number', phoneList)
      .eq('provider', 'vonage');

    if (existErr) {
      console.error('Error fetching existing phone_numbers:', existErr);
      throw existErr;
    }

    const existingMap = new Map<string, { id: string; user_id: string }>();
    (existing || []).forEach(row => {
      existingMap.set(row.phone_number, { id: row.id, user_id: row.user_id });
    });

    const toInsert = [] as any[];
    const toUpdate = [] as { id: string; values: Record<string, any> }[];
    const conflicts: string[] = [];

    for (const num of formattedNumbers) {
      const ex = existingMap.get(num.phone_number);
      if (!ex) {
        toInsert.push({ ...num, user_id: userId });
      } else if (ex.user_id === userId) {
        toUpdate.push({
          id: ex.id,
          values: {
            supports_sms: num.supports_sms,
            supports_voice: num.supports_voice,
            supports_mms: num.supports_mms,
            webhook_configured: num.webhook_configured,
            is_active: true,
            sync_source: 'vonage',
            updated_at: new Date().toISOString(),
          }
        });
      } else {
        conflicts.push(num.phone_number);
      }
    }

    let inserted = 0;
    let updated = 0;

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('phone_numbers').insert(toInsert);
      if (insErr) {
        console.error('Insert error:', insErr);
        throw insErr;
      }
      inserted = toInsert.length;
    }

    for (const upd of toUpdate) {
      const { error: updErr } = await supabase
        .from('phone_numbers')
        .update(upd.values)
        .eq('id', upd.id);
      if (updErr) {
        console.error('Update error:', updErr);
      } else {
        updated++;
      }
    }

    // DETECTAR ÓRFÃOS (números no banco mas não na API)
    const orphanedNumbers: OrphanedNumber[] = [];
    const apiPhoneNumbers = new Set(formattedNumbers.map(n => n.phone_number));
    const { data: userVonageNumbers } = await supabase
      .from('phone_numbers')
      .select('id, phone_number, friendly_name')
      .eq('user_id', userId)
      .eq('provider', 'vonage');

    (userVonageNumbers || []).forEach((dbNumber: any) => {
      if (!apiPhoneNumbers.has(dbNumber.phone_number)) {
        orphanedNumbers.push({
          id: dbNumber.id,
          phone_number: dbNumber.phone_number,
          friendly_name: dbNumber.friendly_name,
          provider: 'vonage',
        });
      }
    });

    // Log success
    await logSyncOperation({
      userId,
      syncType: 'phone_numbers',
      provider: 'vonage',
      status: 'success',
      itemsAdded: inserted,
      itemsUpdated: updated,
      executionTimeMs: Date.now() - startTime,
      metadata: {
        conflicts,
        orphaned_items: orphanedNumbers.slice(0, 100),
      },
    });

    return new Response(
      JSON.stringify({ 
        inserted, 
        updated, 
        total: formattedNumbers.length,
        conflicts,
        orphaned: orphanedNumbers,
        orphaned_count: orphanedNumbers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-vonage-numbers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (userId) {
      await logSyncOperation({
        userId,
        syncType: 'phone_numbers',
        provider: 'vonage',
        status: 'error',
        errorMessage,
        executionTimeMs: Date.now() - startTime,
      });
    }
    return new Response(
      JSON.stringify({ 
        error: `Erro ao sincronizar com Vonage: ${errorMessage}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
