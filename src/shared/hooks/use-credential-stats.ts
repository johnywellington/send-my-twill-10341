import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CredentialStats {
  credentialId: string;
  credentialName: string;
  provider: 'twilio' | 'vonage';
  smsCount: number;
  voiceCount: number;
  ivrCount: number;
  totalCost: number;
  lastUsed: string | null;
  usageByDay: Array<{
    date: string;
    sms: number;
    voice: number;
    ivr: number;
    cost: number;
  }>;
}

export function useCredentialStats(credentialId?: string) {
  return useQuery({
    queryKey: ['credential-stats', credentialId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (credentialId) {
        // Buscar estatísticas de uma credencial específica
        return await fetchSingleCredentialStats(credentialId, user.id);
      } else {
        // Buscar estatísticas de todas as credenciais
        return await fetchAllCredentialsStats(user.id);
      }
    },
    staleTime: 60 * 1000, // 1 minuto
  });
}

async function fetchSingleCredentialStats(credentialId: string, userId: string): Promise<CredentialStats> {
  // Buscar informações da credencial
  const { data: credential } = await supabase
    .from('provider_credentials')
    .select('credential_name, provider')
    .eq('id', credentialId)
    .eq('user_id', userId)
    .single();

  if (!credential) throw new Error('Credential not found');

  // Buscar estatísticas de SMS
  const { data: smsLogs } = await supabase
    .from('sms_logs')
    .select('cost, created_at')
    .eq('credential_id', credentialId)
    .eq('user_id', userId);

  // Buscar estatísticas de Voice
  const { data: voiceLogs } = await supabase
    .from('voice_logs')
    .select('cost, created_at')
    .eq('credential_id', credentialId)
    .eq('user_id', userId);

  // Buscar estatísticas de IVR
  const { data: ivrLogs } = await supabase
    .from('ivr_logs')
    .select('cost, created_at')
    .eq('credential_id', credentialId)
    .eq('user_id', userId);

  const smsCount = smsLogs?.length || 0;
  const voiceCount = voiceLogs?.length || 0;
  const ivrCount = ivrLogs?.length || 0;

  const totalCost = [
    ...(smsLogs || []),
    ...(voiceLogs || []),
    ...(ivrLogs || [])
  ].reduce((sum, log) => sum + (Number(log.cost) || 0), 0);

  // Última utilização
  const allDates = [
    ...(smsLogs || []).map(l => l.created_at),
    ...(voiceLogs || []).map(l => l.created_at),
    ...(ivrLogs || []).map(l => l.created_at)
  ].filter(Boolean).sort().reverse();

  const lastUsed = allDates[0] || null;

  // Agrupar por dia (últimos 30 dias)
  const usageByDay = aggregateByDay(smsLogs || [], voiceLogs || [], ivrLogs || []);

  return {
    credentialId,
    credentialName: credential.credential_name,
    provider: credential.provider as 'twilio' | 'vonage',
    smsCount,
    voiceCount,
    ivrCount,
    totalCost,
    lastUsed,
    usageByDay,
  };
}

async function fetchAllCredentialsStats(userId: string): Promise<CredentialStats[]> {
  const { data: credentials } = await supabase
    .from('provider_credentials')
    .select('id, credential_name, provider')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!credentials) return [];

  const statsPromises = credentials.map(cred => 
    fetchSingleCredentialStats(cred.id, userId)
  );

  return await Promise.all(statsPromises);
}

function aggregateByDay(
  smsLogs: any[],
  voiceLogs: any[],
  ivrLogs: any[]
): Array<{ date: string; sms: number; voice: number; ivr: number; cost: number }> {
  const dayMap = new Map<string, { sms: number; voice: number; ivr: number; cost: number }>();

  // Processar últimos 30 dias
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dayMap.set(dateStr, { sms: 0, voice: 0, ivr: 0, cost: 0 });
  }

  // Agregar SMS
  smsLogs.forEach(log => {
    const dateStr = log.created_at.split('T')[0];
    const day = dayMap.get(dateStr);
    if (day) {
      day.sms += 1;
      day.cost += Number(log.cost) || 0;
    }
  });

  // Agregar Voice
  voiceLogs.forEach(log => {
    const dateStr = log.created_at.split('T')[0];
    const day = dayMap.get(dateStr);
    if (day) {
      day.voice += 1;
      day.cost += Number(log.cost) || 0;
    }
  });

  // Agregar IVR
  ivrLogs.forEach(log => {
    const dateStr = log.created_at.split('T')[0];
    const day = dayMap.get(dateStr);
    if (day) {
      day.ivr += 1;
      day.cost += Number(log.cost) || 0;
    }
  });

  return Array.from(dayMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
