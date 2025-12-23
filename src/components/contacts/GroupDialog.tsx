import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Group {
  id?: string;
  name: string;
  description?: string;
}

interface Contact {
  id: string;
  name: string;
  phone_number: string;
}

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group | null;
  onSuccess: () => void;
}

export function GroupDialog({ open, onOpenChange, group, onSuccess }: GroupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Group>({
    name: "",
    description: ""
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      fetchContacts();
      if (group?.id) {
        fetchGroupMembers(group.id);
      }
    }
    
    if (group) {
      setFormData(group);
    } else {
      setFormData({ name: "", description: "" });
      setSelectedContacts(new Set());
    }
  }, [group, open]);

  const fetchContacts = async () => {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone_number")
      .order("name");

    if (data) setContacts(data);
  };

  const fetchGroupMembers = async (groupId: string) => {
    const { data } = await supabase
      .from("contact_group_members")
      .select("contact_id")
      .eq("group_id", groupId);

    if (data) {
      setSelectedContacts(new Set(data.map(m => m.contact_id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let groupId = group?.id;

      if (groupId) {
        const { error } = await supabase
          .from("contact_groups")
          .update({ name: formData.name, description: formData.description })
          .eq("id", groupId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("contact_groups")
          .insert({
            name: formData.name,
            description: formData.description,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        groupId = data.id;
      }

      // Update group members
      if (groupId) {
        // Delete existing members
        await supabase
          .from("contact_group_members")
          .delete()
          .eq("group_id", groupId);

        // Insert new members
        if (selectedContacts.size > 0) {
          const members = Array.from(selectedContacts).map(contactId => ({
            group_id: groupId,
            contact_id: contactId
          }));

          await supabase
            .from("contact_group_members")
            .insert(members);
        }
      }

      toast({ 
        title: group ? "Grupo atualizado com sucesso!" : "Grupo criado com sucesso!" 
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar grupo",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone_number.includes(searchTerm)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="group-name">Nome do Grupo *</Label>
            <Input
              id="group-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label>Membros do Grupo ({selectedContacts.size} selecionados)</Label>
            <Input
              placeholder="Buscar contatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
            <ScrollArea className="h-64 border rounded-md mt-2 p-4">
              {filteredContacts.map(contact => (
                <div key={contact.id} className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id={contact.id}
                    checked={selectedContacts.has(contact.id)}
                    onCheckedChange={() => toggleContact(contact.id)}
                  />
                  <label htmlFor={contact.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">{contact.phone_number}</div>
                  </label>
                </div>
              ))}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
