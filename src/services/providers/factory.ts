import { Provider, ProviderAdapter } from './types';
import { TwilioAdapter } from './twilio';
import { VonageAdapter } from './vonage';

export class ProviderFactory {
  private static adapters: Record<Provider, ProviderAdapter> = {
    twilio: TwilioAdapter,
    vonage: VonageAdapter,
  };

  static getAdapter(provider: Provider): ProviderAdapter {
    return this.adapters[provider];
  }

  static getAllProviders(): ProviderAdapter[] {
    return Object.values(this.adapters);
  }

  static isValidProvider(provider: string): provider is Provider {
    return provider === 'twilio' || provider === 'vonage';
  }
}
