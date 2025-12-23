export const RATE_LIMITS = {
  twilio: {
    sms: {
      default: 1, // mensagens por segundo
      max: 10,    // máximo teórico
      unit: 'MPS'
    },
    voice: {
      default: 1, // chamadas por segundo
      max: 30,
      unit: 'CPS'
    }
  },
  vonage: {
    sms: {
      default: 1, // mensagens por segundo
      max: 10,    // conservador para 10DLC
      unit: 'MPS'
    },
    voice: {
      default: 3, // chamadas por segundo
      max: 3,
      unit: 'CPS'
    }
  }
};

export const THROTTLE_PERCENTAGES = [
  { value: 0.25, label: '25%' },
  { value: 0.50, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1.00, label: '100%' }
];

export function calculateDelay(
  provider: 'twilio' | 'vonage',
  type: 'sms' | 'voice',
  percentage: number
): number {
  const limit = RATE_LIMITS[provider][type].default;
  const effectiveRate = limit * percentage; // mensagens/segundo ajustado
  return 1000 / effectiveRate; // delay em ms
}

export function calculateEstimatedTime(
  count: number,
  provider: 'twilio' | 'vonage',
  type: 'sms' | 'voice',
  throttle: number
): string {
  const delay = calculateDelay(provider, type, throttle);
  const totalSeconds = Math.ceil((count * delay) / 1000);
  
  if (totalSeconds < 60) return `${totalSeconds}s`;
  if (totalSeconds < 3600) return `${Math.ceil(totalSeconds / 60)}min`;
  return `${Math.ceil(totalSeconds / 3600)}h ${Math.ceil((totalSeconds % 3600) / 60)}min`;
}
