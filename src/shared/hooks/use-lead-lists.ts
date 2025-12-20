import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  total_contacts: number;
  clean_contacts: number;
  recurring_contacts: number;
  created_at: string;
  updated_at: string;
}

export interface LeadListContact {
  id: string;
  lead_list_id: string;
  phone_number: string;
  name: string | null;
  is_recurring: boolean;
  last_campaign_name: string | null;
  last_campaign_date: string | null;
  created_at: string;
}

export function useLeadLists() {
  return useQuery({
    queryKey: ["lead-lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_lists")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LeadList[];
    },
  });
}

export function useLeadListContacts(leadListId: string | null) {
  return useQuery({
    queryKey: ["lead-list-contacts", leadListId],
    queryFn: async () => {
      if (!leadListId) return [];
      
      const { data, error } = await supabase
        .from("lead_list_contacts")
        .select("*")
        .eq("lead_list_id", leadListId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as LeadListContact[];
    },
    enabled: !!leadListId,
  });
}

export function useCreateLeadList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      contacts: Array<{
        phone_number: string;
        name?: string;
        is_recurring: boolean;
        last_campaign_name?: string;
        last_campaign_date?: string;
      }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Criar a lista
      const cleanContacts = data.contacts.filter(c => !c.is_recurring).length;
      const recurringContacts = data.contacts.filter(c => c.is_recurring).length;

      const { data: leadList, error: listError } = await supabase
        .from("lead_lists")
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description || null,
          total_contacts: data.contacts.length,
          clean_contacts: cleanContacts,
          recurring_contacts: recurringContacts,
        })
        .select()
        .single();

      if (listError) throw listError;

      // Inserir contatos
      if (data.contacts.length > 0) {
        const contactsToInsert = data.contacts.map(contact => ({
          lead_list_id: leadList.id,
          phone_number: contact.phone_number,
          name: contact.name || null,
          is_recurring: contact.is_recurring,
          last_campaign_name: contact.last_campaign_name || null,
          last_campaign_date: contact.last_campaign_date || null,
        }));

        const { error: contactsError } = await supabase
          .from("lead_list_contacts")
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;
      }

      return leadList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-lists"] });
      toast.success("Lista de leads criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar lista", { description: error.message });
    },
  });
}

export function useDeleteLeadList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from("lead_lists")
        .delete()
        .eq("id", listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-lists"] });
      toast.success("Lista removida com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover lista", { description: error.message });
    },
  });
}
