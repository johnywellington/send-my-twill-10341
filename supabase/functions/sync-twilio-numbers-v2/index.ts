// Synchronize Twilio numbers for ALL user's Twilio credentials and their subaccounts
// Stores credential_id and subaccount_id on phone_numbers for correct filtering/display.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { corsHeaders } from "../_shared/cors.ts";

function decodeJwtUserId(authHeader: string | null): string | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace(/Bearer\s+/i, '').trim();
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.user_id || null;
  } catch (_) {
    return null;
  }
}

function countryFromE164(num: string): string {
  if (num.startsWith('+1')) return 'US';
  if (num.startsWith('+44')) return 'GB';
  if (num.startsWith('+351')) return 'PT';
  if (num.startsWith('+55')) return 'BR';
  if (num.startsWith('+34')) return 'ES';
  return 'US';
}

async function fetchTwilioNumbers(accountSid: string, basicAuth: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${basicAuth}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio API error (${res.status}): ${text}`);
  }
  const json = await res.json();
  const list = (json?.incoming_phone_numbers ?? []) as any[];
  return list.map((n) => ({
    phone_number: n.phone_number as string,
    friendly_name: (n.friendly_name ?? null) as string | null,
    capabilities: {
      sms: !!n?.capabilities?.sms,
      voice: !!n?.capabilities?.voice,
      mms: !!n?.capabilities?.mms,
    },
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const userId = decodeJwtUserId(authHeader);

  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader! } } }
  );

  try {
    const { data: credentials, error: credErr } = await supabase
      .from('provider_credentials')
      .select('id, account_identifier, secret_key, provider, is_active')
      .eq('provider', 'twilio')
      .eq('is_active', true);

    if (credErr) throw credErr;

    const allFormatted: Array<{
      phone_number: string;
      friendly_name: string | null;
      country_code: string;
      provider: 'twilio';
      supports_sms: boolean;
      supports_voice: boolean;
      supports_mms: boolean;
      is_active: boolean;
      is_verified: boolean;
      sync_source: 'twilio';
      notes: string;
      credential_id: string;
      subaccount_id: string | null;
    }> = [];

    for (const cred of credentials ?? []) {
      if (!cred.account_identifier || !cred.secret_key) continue;
      const basicAuth = btoa(`${cred.account_identifier}:${cred.secret_key}`);

      const { data: subs } = await supabase
        .from('provider_subaccounts')
        .select('id, subaccount_sid, is_active')
        .eq('parent_credential_id', cred.id)
        .eq('is_active', true);

      const sources: Array<{ sid: string; subId: string | null }> = [
        { sid: cred.account_identifier as string, subId: null },
        ...((subs ?? []).filter(s => !!s.subaccount_sid).map((s) => ({ sid: s.subaccount_sid as string, subId: s.id })))
      ];

      for (const src of sources) {
        try {
          const numbers = await fetchTwilioNumbers(src.sid, basicAuth);
          numbers.forEach((n) => {
            allFormatted.push({
              phone_number: n.phone_number,
              friendly_name: n.friendly_name,
              country_code: countryFromE164(n.phone_number),
              provider: 'twilio',
              supports_sms: n.capabilities.sms,
              supports_voice: n.capabilities.voice,
              supports_mms: n.capabilities.mms,
              is_active: true,
              is_verified: true,
              sync_source: 'twilio',
              notes: 'Sincronizado automaticamente via API Twilio',
              credential_id: cred.id as string,
              subaccount_id: src.subId,
            });
          });
        } catch (e) {
          console.error('Erro ao buscar números para', src.sid, e);
        }
      }
    }

    if (allFormatted.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0, updated: 0, total: 0, orphaned_count: 0, orphaned: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiNumbers = Array.from(new Set(allFormatted.map(n => n.phone_number)));

    const { data: existing, error: existErr } = await supabase
      .from('phone_numbers')
      .select('id, phone_number')
      .eq('provider', 'twilio')
      .eq('user_id', userId)
      .in('phone_number', apiNumbers);

    if (existErr) throw existErr;

    const existingMap = new Map<string, { id: string }>();
    (existing ?? []).forEach((row) => existingMap.set(row.phone_number, { id: row.id }));

    const toInsert: any[] = [];
    const toUpdate: Array<{ id: string; values: Record<string, any> }> = [];

    for (const num of allFormatted) {
      const ex = existingMap.get(num.phone_number);
      if (!ex) {
        toInsert.push({ ...num, user_id: userId });
      } else {
        toUpdate.push({ id: ex.id, values: {
          friendly_name: num.friendly_name,
          country_code: num.country_code,
          supports_sms: num.supports_sms,
          supports_voice: num.supports_voice,
          supports_mms: num.supports_mms,
          is_active: true,
          sync_source: 'twilio',
          credential_id: num.credential_id,
          subaccount_id: num.subaccount_id,
          updated_at: new Date().toISOString(),
        }});
      }
    }

    let inserted = 0;
    let updated = 0;

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('phone_numbers').insert(toInsert);
      if (insErr) throw insErr;
      inserted = toInsert.length;
    }

    for (const upd of toUpdate) {
      const { error: updErr } = await supabase
        .from('phone_numbers')
        .update(upd.values)
        .eq('id', upd.id);
      if (!updErr) updated++;
    }

    const { data: userTwilio } = await supabase
      .from('phone_numbers')
      .select('id, phone_number, friendly_name')
      .eq('user_id', userId)
      .eq('provider', 'twilio');

    const apiSet = new Set(allFormatted.map((n) => n.phone_number));
    const orphaned = (userTwilio ?? []).filter((n: any) => !apiSet.has(n.phone_number)).map((n: any) => ({
      id: n.id,
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      provider: 'twilio',
    }));

    return new Response(
      JSON.stringify({ success: true, inserted, updated, total: allFormatted.length, orphaned_count: orphaned.length, orphaned }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Sync Twilio numbers v2 error:', e?.message || e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
