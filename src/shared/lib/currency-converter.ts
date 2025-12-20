// Currency conversion utilities with caching support

export interface ExchangeRates {
  USD: number;
  EUR: number;
  BRL: number;
  BTC: number;
}

interface ExchangeRateAPIResponse {
  rates: {
    [key: string]: number;
  };
}

interface CoinbaseResponse {
  data: {
    amount: string;
  };
}

/**
 * Fetch current exchange rates from USD to other currencies
 */
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    // Fetch fiat rates
    const fiatResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!fiatResponse.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    const fiatData: ExchangeRateAPIResponse = await fiatResponse.json();

    // Fetch BTC rate
    let btcRate = 0;
    try {
      const btcResponse = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      if (btcResponse.ok) {
        const btcData: CoinbaseResponse = await btcResponse.json();
        btcRate = 1 / parseFloat(btcData.data.amount); // Convert USD per BTC to BTC per USD
      }
    } catch (error) {
      console.warn('[Currency] Failed to fetch BTC rate:', error);
    }

    return {
      USD: 1, // Base currency
      EUR: fiatData.rates.EUR || 0.92,
      BRL: fiatData.rates.BRL || 5.06,
      BTC: btcRate,
    };
  } catch (error) {
    console.error('[Currency] Error fetching exchange rates:', error);
    // Fallback rates
    return {
      USD: 1,
      EUR: 0.92,
      BRL: 5.06,
      BTC: 0,
    };
  }
}

/**
 * Convert an amount from one currency to multiple currencies
 */
export function convertToMultipleCurrencies(
  amount: number,
  fromCurrency: string,
  rates: ExchangeRates
): ExchangeRates {
  // First convert to USD as base
  let amountInUSD = amount;
  if (fromCurrency === 'EUR') {
    amountInUSD = amount / rates.EUR;
  } else if (fromCurrency === 'BRL') {
    amountInUSD = amount / rates.BRL;
  } else if (fromCurrency === 'BTC') {
    amountInUSD = rates.BTC > 0 ? amount / rates.BTC : 0;
  }

  // Convert to all currencies
  return {
    USD: amountInUSD,
    EUR: amountInUSD * rates.EUR,
    BRL: amountInUSD * rates.BRL,
    BTC: amountInUSD * rates.BTC,
  };
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: number, currency: string): string {
  switch (currency) {
    case 'USD':
      return `$${value.toFixed(2)}`;
    case 'EUR':
      return `€${value.toFixed(2)}`;
    case 'BRL':
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'BTC':
      return value > 0 ? `₿${value.toFixed(8)}` : '₿0.00000000';
    default:
      return value.toFixed(2);
  }
}
