export const getWebhookUrls = (phoneNumber: string, provider: 'vonage' | 'twilio') => {
  const projectId = 'baowfhikujfppwmmhwcn';
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  return {
    smsInbound: {
      url: `${baseUrl}/${provider}-sms-inbound`,
      method: provider === 'vonage' ? 'GET' : 'POST',
      description: 'Receber SMS',
    },
    voiceInbound: {
      url: `${baseUrl}/${provider}-call-inbound`,
      method: 'POST',
      description: 'Receber Chamadas',
    },
    smsStatus: {
      url: `${baseUrl}/${provider}-sms-webhook`,
      method: 'POST',
      description: 'Status de SMS enviados',
    },
    voiceStatus: {
      url: `${baseUrl}/${provider}-voice-webhook`,
      method: 'POST',
      description: 'Status de chamadas',
    },
  };
};

export const copyAllWebhooksToClipboard = (phoneNumber: string, provider: 'vonage' | 'twilio') => {
  const webhooks = getWebhookUrls(phoneNumber, provider);
  
  const text = `
📞 Webhooks para ${phoneNumber} (${provider.toUpperCase()})

🔹 SMS Inbound (${webhooks.smsInbound.method}):
${webhooks.smsInbound.url}

🔹 Voice Inbound (${webhooks.voiceInbound.method}):
${webhooks.voiceInbound.url}

🔹 SMS Status (${webhooks.smsStatus.method}):
${webhooks.smsStatus.url}

🔹 Voice Status (${webhooks.voiceStatus.method}):
${webhooks.voiceStatus.url}

💡 Configure estas URLs no dashboard do ${provider === 'vonage' ? 'Vonage' : 'Twilio'}.
  `.trim();

  navigator.clipboard.writeText(text);
  return text;
};

export const copyWebhookUrl = (url: string) => {
  navigator.clipboard.writeText(url);
};
