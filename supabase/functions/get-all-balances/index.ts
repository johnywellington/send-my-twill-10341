import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BalanceResponse {
  credentialId: string;
  provider: 'twilio' | 'vonage';
  credentialName: string;
  accountType: 'trial' | 'active' | 'suspended' | 'unknown';
  balance: number;
  originalCurrency: string;
  conversions: {
    USD: number;
    EUR: number;
    BRL: number;
    BTC: number;
  };
  lastUpdated: string;
}

interface ExchangeRates {
  USD: number;
  EUR: number;
  BRL: number;
  BTC: number;
}

async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    const fiatResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const fiatData = await fiatResponse.json();

    let btcRate = 0;
    try {
      const btcResponse = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      const btcData = await btcResponse.json();
      btcRate = 1 / parseFloat(btcData.data.amount);
    } catch (error) {
      console.warn('[BTC] Failed to fetch rate:', error);
    }

    return {
      USD: 1,
      EUR: fiatData.rates.EUR || 0.92,
      BRL: fiatData.rates.BRL || 5.06,
      BTC: btcRate,
    };
  } catch (error) {
    console.error('[Exchange Rates] Error:', error);
    return { USD: 1, EUR: 0.92, BRL: 5.06, BTC: 0 };
  }
}

function convertCurrency(amount: number, fromCurrency: string, rates: ExchangeRates): ExchangeRates {
  let amountInUSD = amount;
  if (fromCurrency === 'EUR') {
    amountInUSD = amount / rates.EUR;
  } else if (fromCurrency === 'BRL') {
    amountInUSD = amount / rates.BRL;
  }

  return {
    USD: amountInUSD,
    EUR: amountInUSD * rates.EUR,
    BRL: amountInUSD * rates.BRL,
    BTC: amountInUSD * rates.BTC,
  };
}

async function fetchTwilioBalance(accountSid: string, authToken: string): Promise<{ balance: number; currency: string; accountType: string }> {
  const accountResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
    {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
    }
  );

  if (!accountResponse.ok) {
    throw new Error(`Twilio API error: ${accountResponse.status}`);
  }

  const account = await accountResponse.json();
  const accountType = account.type === 'Trial' ? 'trial' : 'active';

  let balance = 0;
  let currency = 'USD';

  try {
    const balanceResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        },
      }
    );

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      balance = parseFloat(balanceData.balance);
      currency = balanceData.currency || 'USD';
    }
  } catch (error) {
    console.warn('[Twilio] Could not fetch balance:', error);
  }

  return { balance, currency, accountType };
}

async function fetchVonageBalance(apiKey: string, apiSecret: string): Promise<{ balance: number; currency: string }> {
  const response = await fetch(
    `https://rest.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`
  );

  if (!response.ok) {
    throw new Error(`Vonage API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    balance: parseFloat(data.value) || 0,
    currency: 'EUR',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Fetch exchange rates
    const rates = await fetchExchangeRates();

    // Fetch all provider credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from('provider_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (credError) {
      throw credError;
    }

    if (!credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ balances: [], message: 'No credentials found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch balances in parallel
    const balancePromises = credentials.map(async (cred): Promise<BalanceResponse | null> => {
      try {
        let balance = 0;
        let currency = 'USD';
        let accountType: 'trial' | 'active' | 'suspended' | 'unknown' = 'unknown';

        if (cred.provider === 'twilio') {
          const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
          const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
          
          if (!twilioSid || !twilioToken) {
            console.warn('[Twilio] Missing credentials');
            return null;
          }

          const result = await fetchTwilioBalance(twilioSid, twilioToken);
          balance = result.balance;
          currency = result.currency;
          accountType = result.accountType as 'trial' | 'active';
        } else if (cred.provider === 'vonage') {
          const vonageKey = Deno.env.get('VONAGE_API_KEY');
          const vonageSecret = Deno.env.get('VONAGE_API_SECRET');
          
          if (!vonageKey || !vonageSecret) {
            console.warn('[Vonage] Missing credentials');
            return null;
          }

          const result = await fetchVonageBalance(vonageKey, vonageSecret);
          balance = result.balance;
          currency = result.currency;
          accountType = 'active';
        }

        const conversions = convertCurrency(balance, currency, rates);

        return {
          credentialId: cred.id,
          provider: cred.provider,
          credentialName: cred.credential_name,
          accountType,
          balance,
          originalCurrency: currency,
          conversions,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`[Balance] Error fetching for ${cred.provider}:`, error);
        return null;
      }
    });

    const results = await Promise.all(balancePromises);
    const balances = results.filter((b): b is BalanceResponse => b !== null);

    return new Response(
      JSON.stringify({ balances, rates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[Get All Balances] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
