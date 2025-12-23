/**
 * Extract variables from template content
 * Finds all {{variable}} patterns
 */
export const extractVariables = (content: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = content.matchAll(regex);
  return [...new Set([...matches].map(m => m[1]))];
};

/**
 * Validate variables against allowed list
 */
export const validateVariables = (content: string): { 
  valid: boolean; 
  errors: string[] 
} => {
  const allowedVars = ['nome', 'telefone', 'email', 'data', 'hora', 'empresa', 'valor', 'codigo'];
  const found = extractVariables(content);
  const invalid = found.filter(v => !allowedVars.includes(v));
  
  return {
    valid: invalid.length === 0,
    errors: invalid.map(v => `Variável inválida: {{${v}}}. Permitidas: ${allowedVars.join(', ')}`)
  };
};

/**
 * Replace variables with sample data for preview
 */
export const replaceVariablesForPreview = (content: string): string => {
  const sampleData: Record<string, string> = {
    nome: 'João Silva',
    telefone: '+351912345678',
    email: 'joao@example.com',
    data: new Date().toLocaleDateString('pt-PT'),
    hora: '14:30',
    empresa: 'Empresa ABC',
    valor: '100,00€',
    codigo: '12345'
  };

  let preview = content;
  Object.entries(sampleData).forEach(([key, value]) => {
    preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  });

  return preview;
};

/**
 * Suggested categories for templates
 */
export const TEMPLATE_CATEGORIES = [
  'Marketing',
  'Vendas',
  'Suporte',
  'Cobrança',
  'Confirmação',
  'Lembretes',
  'Notificações',
  'Outros'
] as const;
