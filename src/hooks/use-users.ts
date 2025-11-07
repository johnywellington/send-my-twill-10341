import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UserProfile = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  role: 'admin' | 'user';
};

type FetchUsersFilters = {
  search?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended';
};

export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async (filters?: FetchUsersFilters) => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);

      const { data, error } = await supabase.functions.invoke('get-users', {
        body: null,
        method: 'GET',
      });

      if (error) throw error;

      setUsers(data.users || []);
      return data.users;
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao buscar usuários');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (
    userId: string, 
    updates: {
      full_name?: string;
      phone?: string;
      avatar_url?: string;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;

      // Log activity
      await logActivity(userId, 'profile_updated', 'Perfil atualizado', updates);

      toast.success('Perfil atualizado com sucesso');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
      return false;
    }
  };

  const suspendUser = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          suspended_at: new Date().toISOString(),
          suspension_reason: reason
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Log activity
      await logActivity(userId, 'suspended', `Conta suspensa: ${reason}`, { reason });

      toast.success('Usuário suspenso com sucesso');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Erro ao suspender usuário');
      return false;
    }
  };

  const activateUser = async (userId: string) => {
    try {
      // Buscar dados do usuário antes de ativar
      const userToActivate = users.find(u => u.user_id === userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: true,
          suspended_at: null,
          suspension_reason: null
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Log activity
      await logActivity(userId, 'activated', 'Conta aprovada e ativada pelo administrador');
      
      // Enviar email de notificação
      if (userToActivate?.email) {
        try {
          console.log('Sending approval email to:', userToActivate.email);
          const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
            body: {
              email: userToActivate.email,
              name: userToActivate.full_name || userToActivate.email.split('@')[0]
            }
          });

          if (emailError) {
            console.error('Error sending approval email:', emailError);
            toast.warning('Usuário ativado, mas houve erro ao enviar email de notificação');
          } else {
            console.log('Approval email sent successfully');
            toast.success('Usuário ativado e notificado por email!');
          }
        } catch (emailError) {
          console.error('Error calling send-approval-email function:', emailError);
          toast.warning('Usuário ativado, mas houve erro ao enviar email de notificação');
        }
      } else {
        toast.success('Usuário ativado com sucesso!');
      }
      
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Erro ao ativar usuário');
      return false;
    }
  };

  const changeUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Log activity
      await logActivity(userId, 'role_changed', `Role alterada para: ${newRole}`, { new_role: newRole });

      toast.success(`Role alterada para ${newRole} com sucesso`);
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error changing user role:', error);
      toast.error('Erro ao alterar role do usuário');
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });

      if (error) throw error;

      toast.success('Usuário deletado com sucesso');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao deletar usuário');
      return false;
    }
  };

  const logActivity = async (
    userId: string,
    actionType: string,
    description: string,
    metadata?: Record<string, any>
  ) => {
    try {
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          action_type: actionType,
          description,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  return {
    users,
    loading,
    fetchUsers,
    updateProfile,
    suspendUser,
    activateUser,
    changeUserRole,
    deleteUser
  };
};
