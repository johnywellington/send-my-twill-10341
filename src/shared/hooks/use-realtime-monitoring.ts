import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveCall {
  id: string;
  call_uuid: string;
  from_number: string;
  to_number: string;
  status: 'initiated' | 'ringing' | 'answered' | 'in-progress' | 'completed' | 'failed';
  provider: 'twilio' | 'vonage';
  created_at: string;
  duration: number | null;
  cost: number | null;
  message?: string;
}

interface ProviderStats {
  totalCalls: number;
  successRate: number;
  avgCost: number;
  avgDuration: number;
  activeCalls: number;
  failedCalls: number;
}

interface LiveMetrics {
  activeCalls: number;
  avgDuration: number;
  totalCostPeriod: number;
  successRate: number;
  twilioStats: ProviderStats;
  vonageStats: ProviderStats;
  totalCalls: number;
}

interface Alert {
  level: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
  timestamp: Date;
}

interface SystemHealthMetrics {
  status: 'operational' | 'degraded' | 'critical';
  avgLatency: number;
  uptime: number;
  errorRate: number;
  webhookHealth: 'healthy' | 'degraded' | 'failing';
  lastUpdated: Date;
}

export const useRealtimeMonitoring = (timeWindow: '5min' | '1hour' | '24hours') => {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const getStartTime = () => {
    const now = new Date();
    switch(timeWindow) {
      case '5min': return new Date(now.getTime() - 5 * 60 * 1000);
      case '1hour': return new Date(now.getTime() - 60 * 60 * 1000);
      case '24hours': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  };

  const ACTIVE_CALL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

  const calculateProviderStats = (calls: any[], provider: 'twilio' | 'vonage'): ProviderStats => {
    const now = Date.now();
    const providerCalls = calls.filter(c => c.provider === provider);
    const completedCalls = providerCalls.filter(c => c.status === 'completed');
    const failedCalls = providerCalls.filter(c => c.status === 'failed');
    
    const activeCalls = providerCalls.filter(c => {
      const isActiveStatus = 
        c.status === 'initiated' || c.status === 'ringing' || c.status === 'answered' || c.status === 'in-progress';
      
      if (!isActiveStatus) return false;
      
      // Filtrar chamadas antigas (timeout de 10 minutos)
      const callAge = now - new Date(c.created_at).getTime();
      return callAge < ACTIVE_CALL_TIMEOUT_MS;
    });

    const totalCalls = providerCalls.length;
    const successRate = totalCalls > 0 ? (completedCalls.length / totalCalls) * 100 : 0;
    
    const avgCost = providerCalls.length > 0
      ? providerCalls.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0) / providerCalls.length
      : 0;

    const callsWithDuration = providerCalls.filter(c => c.duration);
    const avgDuration = callsWithDuration.length > 0
      ? callsWithDuration.reduce((sum, c) => sum + c.duration, 0) / callsWithDuration.length
      : 0;

    return {
      totalCalls,
      successRate,
      avgCost,
      avgDuration,
      activeCalls: activeCalls.length,
      failedCalls: failedCalls.length
    };
  };

  const calculateMetrics = (calls: any[]): LiveMetrics => {
    const now = Date.now();
    const twilioStats = calculateProviderStats(calls, 'twilio');
    const vonageStats = calculateProviderStats(calls, 'vonage');

    const activeCalls = calls.filter(c => {
      const isActiveStatus = 
        c.status === 'initiated' || c.status === 'ringing' || c.status === 'answered' || c.status === 'in-progress';
      
      if (!isActiveStatus) return false;
      
      // Filtrar chamadas antigas (timeout de 10 minutos)
      const callAge = now - new Date(c.created_at).getTime();
      return callAge < ACTIVE_CALL_TIMEOUT_MS;
    });

    const completedCalls = calls.filter(c => c.status === 'completed');
    const totalCalls = calls.length;
    const successRate = totalCalls > 0 ? (completedCalls.length / totalCalls) * 100 : 0;

    const callsWithDuration = calls.filter(c => c.duration);
    const avgDuration = callsWithDuration.length > 0
      ? callsWithDuration.reduce((sum, c) => sum + c.duration, 0) / callsWithDuration.length
      : 0;

    const totalCostPeriod = calls.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0);

    return {
      activeCalls: activeCalls.length,
      avgDuration,
      totalCostPeriod,
      successRate,
      twilioStats,
      vonageStats,
      totalCalls
    };
  };

  const calculateSystemHealth = (calls: any[]): SystemHealthMetrics => {
    // Calcular latência média (tempo entre created_at e updated_at)
    const completedCalls = calls.filter(c => c.status === 'completed' && c.created_at && c.updated_at);
    const avgLatency = completedCalls.length > 0
      ? completedCalls.reduce((sum, call) => {
          const created = new Date(call.created_at).getTime();
          const updated = new Date(call.updated_at).getTime();
          return sum + (updated - created);
        }, 0) / completedCalls.length
      : 0;

    // Calcular uptime (taxa de sucesso)
    const totalCalls = calls.length;
    const successfulCalls = calls.filter(c => c.status === 'completed').length;
    const uptime = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 100;

    // Calcular taxa de erros
    const failedCalls = calls.filter(c => c.status === 'failed').length;
    const errorRate = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;

    // Determinar status geral do sistema
    let status: 'operational' | 'degraded' | 'critical' = 'operational';
    if (errorRate > 15 || uptime < 70) {
      status = 'critical';
    } else if (errorRate > 5 || uptime < 90 || avgLatency > 3000) {
      status = 'degraded';
    }

    // Webhook health (baseado na taxa de erros)
    const webhookHealth: 'healthy' | 'degraded' | 'failing' = 
      errorRate < 5 ? 'healthy' : errorRate < 15 ? 'degraded' : 'failing';

    return {
      status,
      avgLatency,
      uptime,
      errorRate,
      webhookHealth,
      lastUpdated: new Date()
    };
  };

  const detectAlerts = (metrics: LiveMetrics, calls: any[]): Alert[] => {
    const alerts: Alert[] = [];
    const now = new Date();

    // Critical: Overall failure rate > 20%
    if (metrics.successRate < 80 && metrics.totalCalls >= 5) {
      alerts.push({
        level: 'critical',
        message: `Taxa de falha crítica: ${(100 - metrics.successRate).toFixed(1)}%`,
        details: `${calls.filter(c => c.status === 'failed').length} de ${calls.length} chamadas falharam`,
        timestamp: now
      });
    }

    // Warning: Vonage specific issues
    if (metrics.vonageStats.successRate < 85 && metrics.vonageStats.totalCalls >= 3) {
      alerts.push({
        level: 'warning',
        message: `Vonage com alta taxa de falha: ${(100 - metrics.vonageStats.successRate).toFixed(1)}%`,
        details: `Considere usar Twilio temporariamente. ${metrics.vonageStats.failedCalls} chamadas falharam.`,
        timestamp: now
      });
    }

    // Warning: Twilio specific issues
    if (metrics.twilioStats.successRate < 85 && metrics.twilioStats.totalCalls >= 3) {
      alerts.push({
        level: 'warning',
        message: `Twilio com alta taxa de falha: ${(100 - metrics.twilioStats.successRate).toFixed(1)}%`,
        details: `${metrics.twilioStats.failedCalls} chamadas falharam.`,
        timestamp: now
      });
    }

    // Info: High cost alert
    if (metrics.totalCostPeriod > 50) {
      alerts.push({
        level: 'info',
        message: `Custos elevados detectados`,
        details: `Total de $${metrics.totalCostPeriod.toFixed(2)} no período selecionado`,
        timestamp: now
      });
    }

    return alerts;
  };

  const fetchActiveCallsAndMetrics = async () => {
    try {
      const startTime = getStartTime();

      // Fetch voice logs
      const { data: voiceLogs } = await supabase
        .from('voice_logs')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false });

      // Fetch IVR logs
      const { data: ivrLogs } = await supabase
        .from('ivr_logs')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false });

      const allCalls = [
        ...(voiceLogs || []),
        ...(ivrLogs || [])
      ];

      // Filter active calls (only calls less than 10 minutes old)
      const now = Date.now();
      const active = allCalls.filter(call => {
        const isActiveStatus = 
          call.status === 'initiated' || 
          call.status === 'ringing' || 
          call.status === 'answered' ||
          call.status === 'in-progress';
        
        if (!isActiveStatus) return false;
        
        // Filtrar chamadas antigas (timeout de 10 minutos)
        const callAge = now - new Date(call.created_at).getTime();
        return callAge < ACTIVE_CALL_TIMEOUT_MS;
      }).map(call => ({
        ...call,
        status: call.status as ActiveCall['status'],
        provider: call.provider as ActiveCall['provider']
      }));

      setActiveCalls(active);

      if (allCalls.length > 0) {
        const calculatedMetrics = calculateMetrics(allCalls);
        setMetrics(calculatedMetrics);

        const health = calculateSystemHealth(allCalls);
        setSystemHealth(health);

        const detectedAlerts = detectAlerts(calculatedMetrics, allCalls);
        setAlerts(detectedAlerts);
      } else {
        setMetrics({
          activeCalls: 0,
          avgDuration: 0,
          totalCostPeriod: 0,
          successRate: 0,
          twilioStats: { totalCalls: 0, successRate: 0, avgCost: 0, avgDuration: 0, activeCalls: 0, failedCalls: 0 },
          vonageStats: { totalCalls: 0, successRate: 0, avgCost: 0, avgDuration: 0, activeCalls: 0, failedCalls: 0 },
          totalCalls: 0
        });
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActiveCallsAndMetrics();
  }, [timeWindow]);

  // Realtime subscription
  useEffect(() => {
    const voiceChannel = supabase
      .channel('voice-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_logs'
        },
        () => {
          console.log('Voice log updated - refreshing data');
          fetchActiveCallsAndMetrics();
        }
      )
      .subscribe();

    const ivrChannel = supabase
      .channel('ivr-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ivr_logs'
        },
        () => {
          console.log('IVR log updated - refreshing data');
          fetchActiveCallsAndMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(voiceChannel);
      supabase.removeChannel(ivrChannel);
    };
  }, [timeWindow]);

  // Timer to update duration of active calls every second
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCalls(prev => prev.map(call => {
        if (call.status === 'answered' || call.status === 'ringing' || call.status === 'in-progress') {
          const elapsedSeconds = Math.floor(
            (Date.now() - new Date(call.created_at).getTime()) / 1000
          );
          return { ...call, duration: elapsedSeconds };
        }
        return call;
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return {
    activeCalls,
    metrics,
    alerts,
    systemHealth,
    loading,
    refetch: fetchActiveCallsAndMetrics
  };
};
