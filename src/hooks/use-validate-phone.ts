import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationResult {
  success: boolean;
  valid: boolean;
  phoneNumber?: string;
  nationalFormat?: string;
  countryCode?: string;
  countryName?: string;
  carrier?: string;
  lineType?: string;
  reachable?: string;
  validNumber?: string;
  ported?: boolean;
  error?: string;
}

export const useValidatePhone = () => {
  const queryClient = useQueryClient();

  const validateMutation = useMutation({
    mutationFn: async ({ phoneNumber, level = 'standard' }: { phoneNumber: string; level?: 'basic' | 'standard' | 'advanced' }) => {
      const { data, error } = await supabase.functions.invoke('validate-phone-number', {
        body: { phoneNumber, level }
      });

      if (error) throw error;
      return data as ValidationResult;
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast.success('Número válido!', {
          description: `${data.carrier} - ${data.lineType}`
        });
      } else {
        toast.warning('Número inválido', {
          description: data.error || 'Número não pode ser alcançado'
        });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao validar número', {
        description: error.message
      });
    }
  });

  const validateAndUpdateContact = useMutation({
    mutationFn: async ({ contactId, phoneNumber }: { contactId: string; phoneNumber: string }) => {
      // Validar número
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-phone-number', {
        body: { phoneNumber, level: 'standard' }
      });

      if (validationError) throw validationError;

      const result = validationData as ValidationResult;

      // Atualizar contato com resultado
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          is_valid: result.valid,
          validation_status: result.reachable || 'unknown',
          validation_reason: result.error || null,
          carrier_name: result.carrier || null,
          country_code_detected: result.countryCode || null,
          line_type: result.lineType || null,
          validated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (updateError) throw updateError;

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato validado e atualizado');
    },
    onError: (error: any) => {
      toast.error('Erro ao validar contato', {
        description: error.message
      });
    }
  });

  return {
    validate: validateMutation.mutate,
    validateAsync: validateMutation.mutateAsync,
    validating: validateMutation.isPending,
    validateAndUpdateContact: validateAndUpdateContact.mutate,
    updatingContact: validateAndUpdateContact.isPending
  };
};