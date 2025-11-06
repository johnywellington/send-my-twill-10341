import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import { ImportCSVDialog } from "@/components/contacts/ImportCSVDialog";
import { GroupDialog } from "@/components/contacts/GroupDialog";
import { BulkSendDialog } from "@/components/contacts/BulkSendDialog";
import { Upload, UserPlus, Users, Edit, Trash2, Mail, Phone, ArrowLeft } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
}

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false);
  const [bulkSendType, setBulkSendType] = useState<"sms" | "voice">("sms");
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [selectedGroupForBulk, setSelectedGroupForBulk] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchContacts(), fetchGroups()]);
    setLoading(false);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Erro ao carregar contatos", description: error.message, variant: "destructive" });
    } else {
      setContacts(data || []);
    }
  };

  const fetchGroups = async () => {
    const { data: groupsData, error } = await supabase
      .from("contact_groups")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Erro ao carregar grupos", description: error.message, variant: "destructive" });
      return;
    }

    if (groupsData) {
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          const { count } = await supabase
            .from("contact_group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);
          
          return { ...group, member_count: count || 0 };
        })
      );

      setGroups(groupsWithCounts);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId) return;

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", deleteContactId);

    if (error) {
      toast({ title: "Erro ao deletar contato", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contato deletado com sucesso" });
      fetchContacts();
    }
    
    setDeleteContactId(null);
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;

    const { error } = await supabase
      .from("contact_groups")
      .delete()
      .eq("id", deleteGroupId);

    if (error) {
      toast({ title: "Erro ao deletar grupo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Grupo deletado com sucesso" });
      fetchGroups();
    }
    
    setDeleteGroupId(null);
  };

  const handleBulkSend = async (groupId: string, type: "sms" | "voice") => {
    const { data: members } = await supabase
      .from("contact_group_members")
      .select("contact_id")
      .eq("group_id", groupId);

    if (!members || members.length === 0) {
      toast({ title: "Grupo vazio", description: "Este grupo não possui membros", variant: "destructive" });
      return;
    }

    const contactIds = members.map(m => m.contact_id);
    const groupContacts = contacts.filter(c => contactIds.includes(c.id));

    setBulkSendType(type);
    setSelectedGroupForBulk(groupId);
    setBulkSendDialogOpen(true);
  };

  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags || [])));

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone_number.includes(searchTerm);
    const matchesTag = filterTag === "all" || contact.tags?.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const getContactsForBulkSend = () => {
    if (selectedGroupForBulk) {
      return contacts.filter(c => 
        groups.find(g => g.id === selectedGroupForBulk)
      );
    }
    return [];
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Contatos</h1>
            <p className="text-muted-foreground">
              {contacts.length} contatos • {groups.length} grupos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setImportDialogOpen(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={() => {
            setSelectedContact(null);
            setContactDialogOpen(true);
          }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Contato
          </Button>
          <Button onClick={() => {
            setSelectedGroup(null);
            setGroupDialogOpen(true);
          }}>
            <Users className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            {allTags.length > 0 && (
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map(contact => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.phone_number}</TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags?.map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedContact(contact);
                              setContactDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteContactId(contact.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{group.name}</span>
                    <Badge>{group.member_count} membros</Badge>
                  </CardTitle>
                  {group.description && (
                    <CardDescription>{group.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkSend(group.id, "sms")}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar SMS em Massa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkSend(group.id, "voice")}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Fazer Chamadas em Massa
                    </Button>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedGroup(group);
                          setGroupDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDeleteGroupId(group.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        contact={selectedContact}
        onSuccess={fetchContacts}
      />

      <ImportCSVDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchContacts}
        groups={groups}
      />

      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={selectedGroup}
        onSuccess={fetchGroups}
      />

      <BulkSendDialog
        open={bulkSendDialogOpen}
        onOpenChange={setBulkSendDialogOpen}
        contacts={getContactsForBulkSend()}
        type={bulkSendType}
      />

      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este grupo? Os contatos não serão deletados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
