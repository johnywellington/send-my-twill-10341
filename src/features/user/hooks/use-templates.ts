import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  type: 'sms' | 'voice' | 'ivr';
  content: string;
  variables: string[];
  category: string | null;
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  type: 'sms' | 'voice' | 'ivr';
  content: string;
  variables?: string[];
  category?: string;
  is_favorite?: boolean;
}

/**
 * Fetch all templates for current user
 */
export const useTemplates = (type?: 'sms' | 'voice' | 'ivr', category?: string) => {
  return useQuery({
    queryKey: ['templates', type, category],
    queryFn: async () => {
      let query = supabase
        .from('message_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (type) query = query.eq('type', type);
      if (category) query = query.eq('category', category);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MessageTemplate[];
    }
  });
};

/**
 * Create new template
 */
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: CreateTemplateInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          ...template,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Template criado',
        description: 'Template salvo com sucesso!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar template',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

/**
 * Update existing template
 */
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Template atualizado',
        description: 'Alterações salvas com sucesso!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar template',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

/**
 * Delete template
 */
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Template deletado',
        description: 'Template removido com sucesso!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao deletar template',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

/**
 * Increment usage count
 */
export const useIncrementTemplateUsage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Manual increment
      const { data: template } = await supabase
        .from('message_templates')
        .select('usage_count')
        .eq('id', id)
        .single();
      
      if (template) {
        await supabase
          .from('message_templates')
          .update({ usage_count: template.usage_count + 1 })
          .eq('id', id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    }
  });
};

/**
 * Duplicate template
 */
export const useDuplicateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: MessageTemplate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          user_id: user.id,
          name: `${template.name} (cópia)`,
          type: template.type,
          content: template.content,
          variables: template.variables,
          category: template.category,
          is_favorite: false
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Template duplicado',
        description: 'Cópia criada com sucesso!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao duplicar template',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};
