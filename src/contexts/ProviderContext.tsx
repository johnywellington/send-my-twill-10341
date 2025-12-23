import { createContext, useContext, useState, ReactNode } from 'react';

type Provider = 'twilio' | 'vonage';

interface ProviderContextType {
  provider: Provider;
  setProvider: (provider: Provider) => void;
  autoFallback: boolean;
  setAutoFallback: (enabled: boolean) => void;
  getAlternativeProvider: () => Provider;
  isLoading: boolean;
  selectedCredentialId: string | undefined;
  setSelectedCredentialId: (credentialId: string | undefined) => void;
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

export function ProviderProvider({ children }: { children: ReactNode }) {
  // Carregar do localStorage se existir
  const [provider, setProviderState] = useState<Provider>(() => {
    const saved = localStorage.getItem('selected-provider');
    return (saved === 'twilio' || saved === 'vonage') ? saved : 'twilio';
  });
  
  const [autoFallback, setAutoFallbackState] = useState<boolean>(() => {
    const saved = localStorage.getItem('auto-fallback');
    return saved === 'true';
  });
  
  const [selectedCredentialId, setSelectedCredentialIdState] = useState<string | undefined>(() => {
    const saved = localStorage.getItem('selected-credential-id');
    return saved || undefined;
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Salvar no localStorage quando mudar
  const setProvider = (newProvider: Provider) => {
    setIsLoading(true);
    localStorage.setItem('selected-provider', newProvider);
    setProviderState(newProvider);
    
    // Simular delay de "aplicação" (opcional, para feedback visual)
    setTimeout(() => setIsLoading(false), 300);
  };

  const setAutoFallback = (enabled: boolean) => {
    localStorage.setItem('auto-fallback', enabled.toString());
    setAutoFallbackState(enabled);
  };

  const setSelectedCredentialId = (credentialId: string | undefined) => {
    if (credentialId) {
      localStorage.setItem('selected-credential-id', credentialId);
    } else {
      localStorage.removeItem('selected-credential-id');
    }
    setSelectedCredentialIdState(credentialId);
  };

  const getAlternativeProvider = (): Provider => {
    return provider === 'twilio' ? 'vonage' : 'twilio';
  };

  return (
    <ProviderContext.Provider value={{ 
      provider, 
      setProvider, 
      autoFallback, 
      setAutoFallback,
      getAlternativeProvider,
      isLoading,
      selectedCredentialId,
      setSelectedCredentialId
    }}>
      {children}
    </ProviderContext.Provider>
  );
}

export function useProvider() {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProvider must be used within ProviderProvider');
  }
  return context;
}
