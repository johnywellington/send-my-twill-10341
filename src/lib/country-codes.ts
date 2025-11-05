export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  separator?: boolean;
}

export const countryCodes: CountryCode[] = [
  // Mais Usados
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+1", country: "EUA/Canadá", flag: "🇺🇸" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
  { code: "+34", country: "Espanha", flag: "🇪🇸" },
  { code: "+33", country: "França", flag: "🇫🇷" },
  { code: "+49", country: "Alemanha", flag: "🇩🇪" },
  
  // Lusofonia
  { code: "+244", country: "Angola", flag: "🇦🇴" },
  { code: "+258", country: "Moçambique", flag: "🇲🇿" },
  { code: "+238", country: "Cabo Verde", flag: "🇨🇻" },
  { code: "+245", country: "Guiné-Bissau", flag: "🇬🇼" },
  { code: "+239", country: "São Tomé e Príncipe", flag: "🇸🇹" },
  { code: "+670", country: "Timor-Leste", flag: "🇹🇱" },
  { code: "+853", country: "Macau", flag: "🇲🇴" },
  
  // Europa
  { code: "+39", country: "Itália", flag: "🇮🇹" },
  { code: "+31", country: "Holanda", flag: "🇳🇱" },
  { code: "+32", country: "Bélgica", flag: "🇧🇪" },
  { code: "+41", country: "Suíça", flag: "🇨🇭" },
  { code: "+43", country: "Áustria", flag: "🇦🇹" },
  { code: "+48", country: "Polónia", flag: "🇵🇱" },
  { code: "+46", country: "Suécia", flag: "🇸🇪" },
  { code: "+47", country: "Noruega", flag: "🇳🇴" },
  { code: "+45", country: "Dinamarca", flag: "🇩🇰" },
  { code: "+353", country: "Irlanda", flag: "🇮🇪" },
  
  // Ásia
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japão", flag: "🇯🇵" },
  { code: "+91", country: "Índia", flag: "🇮🇳" },
  { code: "+82", country: "Coreia do Sul", flag: "🇰🇷" },
  { code: "+65", country: "Singapura", flag: "🇸🇬" },
  { code: "+66", country: "Tailândia", flag: "🇹🇭" },
  { code: "+60", country: "Malásia", flag: "🇲🇾" },
  { code: "+63", country: "Filipinas", flag: "🇵🇭" },
  { code: "+62", country: "Indonésia", flag: "🇮🇩" },
  { code: "+84", country: "Vietname", flag: "🇻🇳" },
  
  // América Latina
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colômbia", flag: "🇨🇴" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+598", country: "Uruguai", flag: "🇺🇾" },
  { code: "+595", country: "Paraguai", flag: "🇵🇾" },
  { code: "+593", country: "Equador", flag: "🇪🇨" },
  { code: "+591", country: "Bolívia", flag: "🇧🇴" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  
  // África
  { code: "+27", country: "África do Sul", flag: "🇿🇦" },
  { code: "+234", country: "Nigéria", flag: "🇳🇬" },
  { code: "+254", country: "Quénia", flag: "🇰🇪" },
  { code: "+20", country: "Egipto", flag: "🇪🇬" },
  { code: "+212", country: "Marrocos", flag: "🇲🇦" },
  
  // Oceania
  { code: "+61", country: "Austrália", flag: "🇦🇺" },
  { code: "+64", country: "Nova Zelândia", flag: "🇳🇿" },
];

export const getCountryByCode = (code: string): CountryCode | undefined => {
  return countryCodes.find(c => c.code === code);
};

export const parsePhoneNumber = (fullNumber: string): { ddi: string; localNumber: string } => {
  const cleaned = fullNumber.replace(/[\s\-\(\)]/g, '');
  
  if (!cleaned.startsWith('+')) {
    return { ddi: '+351', localNumber: cleaned };
  }
  
  // Tentar encontrar o DDI mais longo primeiro
  const sortedCodes = [...countryCodes]
    .filter(c => !c.separator)
    .sort((a, b) => b.code.length - a.code.length);
  
  for (const country of sortedCodes) {
    if (cleaned.startsWith(country.code)) {
      return {
        ddi: country.code,
        localNumber: cleaned.slice(country.code.length)
      };
    }
  }
  
  return { ddi: '+351', localNumber: cleaned.slice(1) };
};
