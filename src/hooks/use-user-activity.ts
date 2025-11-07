import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ActivityType = 
  | 'login'
  | 'logout'
  | 'profile_updated'
  | 'role_changed'
  | 'suspended'
  | 'activated'
  | 'sms_sent'
  | 'voice_call_made'
  | 'ivr_created'
  | 'user_deleted';

export type UserActivity = {
  id: string;
  user_id: string;
  action_type: ActivityType;
  description: string;
  ip_address: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

export const useUserActivity = () => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivity = async (userId: string, limit = 50) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setActivities((data || []) as UserActivity[]);
      return data;
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast.error('Erro ao buscar atividades');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (
    userId: string,
    actionType: ActivityType,
    description: string,
    metadata?: Record<string, any>,
    ipAddress?: string
  ) => {
    try {
      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          action_type: actionType,
          description,
          metadata: metadata || {},
          ip_address: ipAddress || null
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error logging activity:', error);
      return false;
    }
  };

  const getActivityStats = async (userId: string, days = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('action_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Count by action type
      const stats = (data || []).reduce((acc, activity) => {
        acc[activity.action_type] = (acc[activity.action_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: data?.length || 0,
        by_type: stats,
        period_days: days
      };
    } catch (error) {
      console.error('Error getting activity stats:', error);
      return null;
    }
  };

  return {
    activities,
    loading,
    fetchActivity,
    logActivity,
    getActivityStats
  };
};
