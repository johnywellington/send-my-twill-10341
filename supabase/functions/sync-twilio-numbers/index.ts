import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { corsHeaders } from '../_shared/cors.ts';
import { logSyncOperation } from '../_shared/sync-logger.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

interface TwilioPhoneNumber {
  phone_number: string;
  friendly_name: string;
  capabilities: {
    sms: boolean;
    voice: boolean;
    mms: boolean;
  };
}

interface TwilioApiResponse {
  incoming_phone_numbers: TwilioPhoneNumber[];
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
    console.log('=== Twilio Numbers Sync Started ===');

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

    // Verificar credenciais
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais Twilio não configuradas' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar números da conta Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    console.log('Fetching numbers from Twilio API...');

    const response = await fetch(twilioUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio API error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar números do Twilio',
          details: errorText
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data: TwilioApiResponse = await response.json();
    console.log(`Found ${data.incoming_phone_numbers.length} numbers in Twilio account`);

    // Formatar números para o formato da aplicação
    const formattedNumbers = data.incoming_phone_numbers.map((number) => {
      // Extrair código do país do número (assumindo formato E.164)
      const phoneNumber = number.phone_number;
      let countryCode = 'US'; // default
      if (phoneNumber.startsWith('+1')) countryCode = 'US';
      else if (phoneNumber.startsWith('+44')) countryCode = 'GB';
      else if (phoneNumber.startsWith('+351')) countryCode = 'PT';
      else if (phoneNumber.startsWith('+55')) countryCode = 'BR';
      else if (phoneNumber.startsWith('+34')) countryCode = 'ES';

      return {
        phone_number: phoneNumber,
        friendly_name: number.friendly_name || null,
        country_code: countryCode,
        provider: 'twilio',
        supports_sms: number.capabilities.sms,
        supports_voice: number.capabilities.voice,
        supports_mms: number.capabilities.mms,
        is_active: true,
        is_verified: true,
        sync_source: 'twilio',
        notes: 'Sincronizado automaticamente via API Twilio'
      };
    });

    console.log('Numbers formatted successfully:', formattedNumbers.length);

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
      .eq('provider', 'twilio');

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
      } else {
        // Transfer ownership to current user and update capabilities
        toUpdate.push({
          id: ex.id,
          values: {
            user_id: userId,
            supports_sms: num.supports_sms,
            supports_voice: num.supports_voice,
            supports_mms: num.supports_mms,
            is_active: true,
            sync_source: 'twilio',
            updated_at: new Date().toISOString(),
          }
        });
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
    const { data: userTwilioNumbers } = await supabase
      .from('phone_numbers')
      .select('id, phone_number, friendly_name')
      .eq('user_id', userId)
      .eq('provider', 'twilio');

    (userTwilioNumbers || []).forEach((dbNumber: any) => {
      if (!apiPhoneNumbers.has(dbNumber.phone_number)) {
        orphanedNumbers.push({
          id: dbNumber.id,
          phone_number: dbNumber.phone_number,
          friendly_name: dbNumber.friendly_name,
          provider: 'twilio',
        });
      }
    });

    // Log success
    await logSyncOperation({
      userId,
      syncType: 'phone_numbers',
      provider: 'twilio',
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
        success: true,
        inserted, 
        updated, 
        total: formattedNumbers.length,
        conflicts,
        orphaned: orphanedNumbers,
        orphaned_count: orphanedNumbers.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in sync-twilio-numbers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (userId) {
      await logSyncOperation({
        userId,
        syncType: 'phone_numbers',
        provider: 'twilio',
        status: 'error',
        errorMessage,
        executionTimeMs: Date.now() - startTime,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
