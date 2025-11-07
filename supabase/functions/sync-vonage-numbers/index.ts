import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    // Verificar erro na resposta
    if (data.error_code) {
      console.error('Vonage API returned error:', data.error_code, data.error_message);
      return new Response(
        JSON.stringify({ 
          error: data.error_message || 'Erro desconhecido da API Vonage' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

    return new Response(
      JSON.stringify({ 
        numbers: formattedNumbers,
        count: data.count 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in sync-vonage-numbers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
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
