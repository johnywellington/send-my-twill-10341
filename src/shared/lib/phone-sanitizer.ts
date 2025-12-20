/**
 * Higienização de números de telefone para Portugal (+351)
 */

export interface SanitizedNumber {
  original: string;
  sanitized: string;
  isValid: boolean;
  error?: string;
}

export interface SanitizeResult {
  numbers: SanitizedNumber[];
  validCount: number;
  invalidCount: number;
  duplicatesRemoved: number;
}

/**
 * Remove espaços, parênteses, traços e outros caracteres não numéricos
 */
function cleanNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)\.\+]/g, '');
}

/**
 * Sanitiza um número de telefone para formato Portugal (+351)
 * - Remove espaços, parênteses e traços
 * - Se o número tiver 9 dígitos e começar com '9', adiciona '+351'
 * - Se o número já começar com '351', garante que tenha o símbolo '+'
 */
export function sanitizePortugueseNumber(phone: string): SanitizedNumber {
  const original = phone.trim();
  const cleaned = cleanNumber(original);

  // Número vazio
  if (!cleaned) {
    return {
      original,
      sanitized: '',
      isValid: false,
      error: 'Número vazio'
    };
  }

  // Número português: 9 dígitos começando com 9
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    return {
      original,
      sanitized: `+351${cleaned}`,
      isValid: true
    };
  }

  // Número já com código de país 351 (sem +)
  if (cleaned.startsWith('351') && cleaned.length === 12) {
    return {
      original,
      sanitized: `+${cleaned}`,
      isValid: true
    };
  }

  // Número já com código de país completo (+351)
  if (original.startsWith('+351') && cleaned.length === 12) {
    return {
      original,
      sanitized: `+${cleaned}`,
      isValid: true
    };
  }

  // Número internacional (outros países) - aceitar se tem 10-15 dígitos
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    // Se começa com código de país conhecido, aceitar
    if (cleaned.startsWith('55') || // Brasil
        cleaned.startsWith('34') || // Espanha
        cleaned.startsWith('33') || // França
        cleaned.startsWith('44') || // UK
        cleaned.startsWith('1')) {  // USA/Canada
      return {
        original,
        sanitized: `+${cleaned}`,
        isValid: true
      };
    }
    
    // Tentar aceitar como número internacional genérico
    return {
      original,
      sanitized: `+${cleaned}`,
      isValid: true
    };
  }

  return {
    original,
    sanitized: cleaned,
    isValid: false,
    error: `Formato inválido: ${cleaned.length} dígitos`
  };
}

/**
 * Sanitiza uma lista de números, removendo duplicados
 */
export function sanitizeNumbers(phones: string[]): SanitizeResult {
  const seen = new Set<string>();
  const results: SanitizedNumber[] = [];
  let duplicatesRemoved = 0;

  for (const phone of phones) {
    const sanitized = sanitizePortugueseNumber(phone);
    
    if (sanitized.isValid) {
      if (seen.has(sanitized.sanitized)) {
        duplicatesRemoved++;
        continue;
      }
      seen.add(sanitized.sanitized);
    }
    
    results.push(sanitized);
  }

  return {
    numbers: results,
    validCount: results.filter(n => n.isValid).length,
    invalidCount: results.filter(n => !n.isValid).length,
    duplicatesRemoved
  };
}

/**
 * Extrai números de texto CSV (uma coluna ou múltiplas)
 */
export function extractNumbersFromCSV(content: string): string[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const numbers: string[] = [];

  for (const line of lines) {
    // Pular cabeçalho se detectado
    if (line.toLowerCase().includes('telefone') || 
        line.toLowerCase().includes('phone') ||
        line.toLowerCase().includes('numero') ||
        line.toLowerCase().includes('number')) {
      continue;
    }

    // Tentar extrair número da linha
    const parts = line.split(/[,;\t]/);
    for (const part of parts) {
      const cleaned = part.trim().replace(/["']/g, '');
      // Verificar se parece um número de telefone
      if (/^[\+\d\s\-\(\)\.]{9,20}$/.test(cleaned)) {
        numbers.push(cleaned);
        break; // Pegar apenas o primeiro número da linha
      }
    }
  }

  return numbers;
}
