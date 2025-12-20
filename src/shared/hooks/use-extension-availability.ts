import { useMemo } from 'react';
import { useSIPUsers } from './use-sip-users';

export function useExtensionAvailability(provider?: 'twilio' | 'vonage') {
  const { users } = useSIPUsers();
  
  const analysis = useMemo(() => {
    if (!users) return null;
    
    // Filtrar por provider se especificado
    const filteredUsers = provider 
      ? users.filter(u => u.provider === provider)
      : users;
    
    // Extrair extensões numéricas
    const extensions = filteredUsers
      .map(u => parseInt(u.extension))
      .filter(ext => !isNaN(ext))
      .sort((a, b) => a - b);
    
    // Calcular próxima extensão disponível
    let nextAvailable = 1000; // Começar em 1000
    
    if (extensions.length > 0) {
      const maxExtension = Math.max(...extensions);
      
      // Encontrar o primeiro gap ou usar max + 1
      for (let i = 1000; i <= maxExtension + 1; i++) {
        if (!extensions.includes(i)) {
          nextAvailable = i;
          break;
        }
      }
      
      // Se não encontrou gap, usar próximo número
      if (nextAvailable === 1000 && extensions.includes(1000)) {
        nextAvailable = maxExtension + 1;
      }
    }
    
    return {
      occupiedExtensions: extensions,
      nextAvailable: nextAvailable.toString(),
      totalExtensions: extensions.length,
      extensionMap: new Set(extensions.map(String)),
    };
  }, [users, provider]);
  
  const isExtensionAvailable = (extension: string): boolean => {
    if (!analysis) return true;
    return !analysis.extensionMap.has(extension);
  };
  
  return {
    analysis,
    isExtensionAvailable,
  };
}
