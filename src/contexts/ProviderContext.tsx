import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Provider = 'twilio' | 'vonage';

interface ProviderContextType {
  provider: Provider;
  setProvider: (provider: Provider) => void;
  isLoading: boolean;
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

export function ProviderProvider({ children }: { children: ReactNode }) {
  // Carregar do localStorage se existir
  const [provider, setProviderState] = useState<Provider>(() => {
    const saved = localStorage.getItem('selected-provider');
    return (saved === 'twilio' || saved === 'vonage') ? saved : 'twilio';
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

  return (
    <ProviderContext.Provider value={{ provider, setProvider, isLoading }}>
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
