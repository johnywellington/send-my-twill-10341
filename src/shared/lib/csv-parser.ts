export interface CSVContact {
  name: string;
  phone_number: string;
  email?: string;
  tags?: string[];
}

export interface ParseResult {
  contacts: CSVContact[];
  errors: Array<{ row: number; error: string }>;
}

export function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0];
  const delimiters = [',', ';', '\t', '|'];
  
  const counts = delimiters.map(d => ({
    delimiter: d,
    count: (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length
  }));
  
  const max = counts.reduce((prev, curr) => 
    curr.count > prev.count ? curr : prev
  );
  
  return max.count > 0 ? max.delimiter : ',';
}

export function validatePhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  // Length: 8-15 digits after +
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phone.replace(/\s/g, ''));
}

export function formatPhoneNumber(phone: string): string {
  // Remove all spaces, parentheses, hyphens
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Add + if missing and starts with digit
  if (!cleaned.startsWith('+') && /^\d/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV deve conter ao menos uma linha de cabeçalho e uma linha de dados'));
          return;
        }
        
        const delimiter = detectDelimiter(content);
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
        
        const nameIndex = headers.findIndex(h => 
          h.includes('nome') || h.includes('name')
        );
        const phoneIndex = headers.findIndex(h => 
          h.includes('telefone') || h.includes('phone') || h.includes('celular')
        );
        const emailIndex = headers.findIndex(h => 
          h.includes('email') || h.includes('e-mail')
        );
        const tagsIndex = headers.findIndex(h => 
          h.includes('tags') || h.includes('categorias')
        );
        
        if (nameIndex === -1 || phoneIndex === -1) {
          reject(new Error('CSV deve conter colunas "nome" e "telefone"'));
          return;
        }
        
        const contacts: CSVContact[] = [];
        const errors: Array<{ row: number; error: string }> = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = line.split(delimiter).map(v => v.trim());
          
          const name = values[nameIndex];
          const rawPhone = values[phoneIndex];
          const email = emailIndex !== -1 ? values[emailIndex] : undefined;
          const rawTags = tagsIndex !== -1 ? values[tagsIndex] : undefined;
          
          if (!name || !rawPhone) {
            errors.push({ row: i + 1, error: 'Nome ou telefone vazio' });
            continue;
          }
          
          const phone = formatPhoneNumber(rawPhone);
          
          if (!validatePhoneNumber(phone)) {
            errors.push({ 
              row: i + 1, 
              error: `Telefone inválido: ${rawPhone}. Use formato internacional +55...` 
            });
            continue;
          }
          
          const tags = rawTags 
            ? rawTags.split(',').map(t => t.trim()).filter(t => t)
            : undefined;
          
          contacts.push({
            name,
            phone_number: phone,
            email: email || undefined,
            tags
          });
        }
        
        resolve({ contacts, errors });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}
