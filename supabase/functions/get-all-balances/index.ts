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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Get All Balances] Request received');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('[Get All Balances] Authenticating user');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error('[Get All Balances] Auth error:', authError);
      throw new Error('Authentication failed');
    }
    
    if (!user) {
      console.error('[Get All Balances] No user found');
      throw new Error('Unauthorized');
    }

    console.log('[Get All Balances] User authenticated:', user.id);

    // Fixed exchange rates
    const rates = {
      USD: 1,
      EUR: 0.92,
      BRL: 5.06,
      BTC: 0.000020,
    };

    // Fetch credentials
    console.log('[Get All Balances] Fetching credentials');
    const { data: credentials, error: credError } = await supabaseClient
      .from('provider_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (credError) {
      console.error('[Get All Balances] Credential error:', credError);
      throw credError;
    }

    console.log('[Get All Balances] Found', credentials?.length || 0, 'credentials');

    if (!credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ balances: [], rates, message: 'No credentials found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Process each credential
    const balances: BalanceResponse[] = [];
    
    for (const cred of credentials) {
      console.log(`[Balance] Processing ${cred.provider} - ${cred.credential_name}`);
      
      try {
        let balance = 0;
        let currency = 'USD';
        let accountType: 'trial' | 'active' | 'suspended' | 'unknown' = 'unknown';

        if (cred.provider === 'twilio') {
          const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
          const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
          
          if (twilioSid && twilioToken) {
            console.log('[Twilio] Fetching account info');
            try {
              const accountResponse = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`,
                {
                  headers: {
                    'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
                  },
                  signal: AbortSignal.timeout(10000), // 10 second timeout
                }
              );

              if (accountResponse.ok) {
                const account = await accountResponse.json();
                accountType = account.type === 'Trial' ? 'trial' : 'active';
                console.log('[Twilio] Account type:', accountType);

                // Try to fetch balance
                try {
                  const balanceResponse = await fetch(
                    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Balance.json`,
                    {
                      headers: {
                        'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
                      },
                      signal: AbortSignal.timeout(10000),
                    }
                  );

                  if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json();
                    balance = parseFloat(balanceData.balance);
                    currency = balanceData.currency || 'USD';
                    console.log('[Twilio] Balance:', balance, currency);
                  }
                } catch (balErr) {
                  console.warn('[Twilio] Could not fetch balance:', balErr);
                }
              }
            } catch (err) {
              console.error('[Twilio] API error:', err);
            }
          } else {
            console.warn('[Twilio] Missing credentials in environment');
          }
        } else if (cred.provider === 'vonage') {
          const vonageKey = Deno.env.get('VONAGE_API_KEY');
          const vonageSecret = Deno.env.get('VONAGE_API_SECRET');
          
          if (vonageKey && vonageSecret) {
            console.log('[Vonage] Fetching balance');
            try {
              const response = await fetch(
                `https://rest.nexmo.com/account/get-balance?api_key=${vonageKey}&api_secret=${vonageSecret}`,
                {
                  signal: AbortSignal.timeout(10000),
                }
              );

              if (response.ok) {
                const data = await response.json();
                balance = parseFloat(data.value) || 0;
                currency = 'EUR';
                accountType = 'active';
                console.log('[Vonage] Balance:', balance, currency);
              }
            } catch (err) {
              console.error('[Vonage] API error:', err);
            }
          } else {
            console.warn('[Vonage] Missing credentials in environment');
          }
        }

        // Convert currency
        let amountInUSD = balance;
        if (currency === 'EUR') {
          amountInUSD = balance / rates.EUR;
        }

        const conversions = {
          USD: amountInUSD,
          EUR: amountInUSD * rates.EUR,
          BRL: amountInUSD * rates.BRL,
          BTC: amountInUSD * rates.BTC,
        };

        balances.push({
          credentialId: cred.id,
          provider: cred.provider,
          credentialName: cred.credential_name,
          accountType,
          balance,
          originalCurrency: currency,
          conversions,
          lastUpdated: new Date().toISOString(),
        });
      } catch (credErr) {
        console.error(`[Balance] Error for ${cred.provider}:`, credErr);
      }
    }

    console.log('[Get All Balances] Returning', balances.length, 'balance(s)');

    return new Response(
      JSON.stringify({ balances, rates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[Get All Balances] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, balances: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
