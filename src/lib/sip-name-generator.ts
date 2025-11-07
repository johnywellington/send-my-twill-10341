// Gera um nome aleatório baseado em palavras e timestamp
export function generateRandomSipName(prefix: string): {
  friendlyName: string;
  domainName: string;
  displayName: string;
} {
  // Palavras aleatórias para tornar memorável
  const adjectives = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'stellar', 'quantum', 'cosmic', 'nexus'];
  const nouns = ['link', 'node', 'hub', 'core', 'bridge', 'gateway', 'portal', 'vault', 'matrix', 'grid'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
  
  const randomName = `${adj}-${noun}-${timestamp}`;
  
  return {
    friendlyName: `${prefix}-${randomName}`,
    domainName: `${randomName}.sip.twilio.com`,
    displayName: `Auto ${adj.charAt(0).toUpperCase() + adj.slice(1)} ${noun.charAt(0).toUpperCase() + noun.slice(1)}`,
  };
}

// Gera nome de app Vonage
export function generateRandomVonageName(): {
  appName: string;
  displayName: string;
} {
  const prefixes = ['voice', 'call', 'connect', 'link', 'comm', 'talk', 'dial', 'ring', 'net', 'sip'];
  const suffixes = ['hub', 'app', 'service', 'system', 'platform', 'gateway', 'node', 'center', 'core', 'bridge'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const timestamp = Date.now().toString().slice(-6);
  
  const randomName = `${prefix}-${suffix}-${timestamp}`;
  
  return {
    appName: randomName,
    displayName: `Auto ${prefix.charAt(0).toUpperCase() + prefix.slice(1)} ${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`,
  };
}
