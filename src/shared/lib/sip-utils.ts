export const formatSIPUri = (username: string, domain: string): string => {
  return `${username}@${domain}`;
};

export const getProviderIcon = (provider: 'twilio' | 'vonage'): string => {
  return provider === 'twilio' ? '📞' : '📱';
};

export const getProviderDomain = (provider: 'twilio' | 'vonage', customDomain?: string): string => {
  if (customDomain) return customDomain;
  return provider === 'twilio' ? '.sip.twilio.com' : 'sip.nexmo.com';
};
