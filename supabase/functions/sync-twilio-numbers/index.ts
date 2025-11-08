import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // DETECTAR ÓRFÃOS (números no banco mas não na API)
    const orphanedNumbers: OrphanedNumber[] = [];
    
    if (userId) {
      const apiPhoneNumbers = new Set(formattedNumbers.map(n => n.phone_number));
      
      // Buscar todos os números Twilio do usuário no banco
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      const dbResponse = await fetch(`${supabaseUrl}/rest/v1/phone_numbers?user_id=eq.${userId}&provider=eq.twilio&select=id,phone_number,friendly_name,provider`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });
      
      if (dbResponse.ok) {
        const dbNumbers = await dbResponse.json();
        
        for (const dbNumber of dbNumbers) {
          if (!apiPhoneNumbers.has(dbNumber.phone_number)) {
            orphanedNumbers.push({
              id: dbNumber.id,
              phone_number: dbNumber.phone_number,
              friendly_name: dbNumber.friendly_name,
              provider: 'twilio',
            });
          }
        }
      }
      
      console.log(`Found ${orphanedNumbers.length} orphaned numbers`);
    }

    // Log success
    if (userId) {
      await logSyncOperation({
        userId,
        syncType: 'phone_numbers',
        provider: 'twilio',
        status: 'success',
        itemsAdded: formattedNumbers.length,
        executionTimeMs: Date.now() - startTime,
        metadata: {
          items_added: formattedNumbers.slice(0, 100).map(n => ({
            phone_number: n.phone_number,
            friendly_name: n.friendly_name,
            supports_sms: n.supports_sms,
            supports_voice: n.supports_voice,
            supports_mms: n.supports_mms,
            country_code: n.country_code,
          })),
          orphaned_items: orphanedNumbers.slice(0, 100),
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        numbers: formattedNumbers,
        count: formattedNumbers.length,
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
    
    // Log error
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
