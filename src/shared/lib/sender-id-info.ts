export const SENDER_ID_INFO = {
  maxLength: 11,
  allowedChars: 'A-Z, 0-9 (sem espaços ou caracteres especiais)',
  
  supportedProviders: {
    vonage: {
      supported: true,
      notes: 'Funciona em muitos países, mas pode ter custos adicionais ou restrições regionais.'
    },
    twilio: {
      supported: true,
      notes: 'Requer registro prévio (Alpha Sender ID). Disponível apenas em alguns países.'
    }
  },
  
  countryRestrictions: [
    'Estados Unidos e Canadá: Sender ID não funciona (requer número real)',
    'Europa: Geralmente funciona bem',
    'Brasil: Suporte limitado, pode não funcionar com todas as operadoras',
    'Ásia/Oriente Médio: Excelente suporte'
  ],
  
  bestPractices: [
    'Use apenas letras maiúsculas e números (sem espaços)',
    'Máximo de 11 caracteres',
    'Escolha um nome reconhecível para sua marca',
    'Teste em diferentes países/operadoras',
    'Tenha um número de fallback configurado'
  ]
};

export const validateSenderId = (senderId: string): {
  valid: boolean;
  error?: string;
} => {
  if (!senderId) {
    return { valid: true }; // Vazio é válido (opcional)
  }
  
  if (senderId.length > 11) {
    return { valid: false, error: 'Máximo de 11 caracteres' };
  }
  
  if (!/^[A-Z0-9]+$/.test(senderId)) {
    return { valid: false, error: 'Apenas letras maiúsculas e números' };
  }
  
  if (senderId.length < 3) {
    return { valid: false, error: 'Mínimo de 3 caracteres recomendado' };
  }
  
  return { valid: true };
};
