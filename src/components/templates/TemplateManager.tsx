import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateCard } from './TemplateCard';
import { TemplateDialog } from './TemplateDialog';
import { 
  useTemplates, 
  useCreateTemplate, 
  useUpdateTemplate, 
  useDeleteTemplate,
  useDuplicateTemplate,
  MessageTemplate 
} from '@/features/user/hooks/use-templates';
import { TEMPLATE_CATEGORIES } from '@/lib/template-utils';
import { Plus, Search, Star, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface TemplateManagerProps {
  onUseTemplate?: (template: MessageTemplate) => void;
}

export const TemplateManager = ({ onUseTemplate }: TemplateManagerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sms' | 'voice' | 'ivr'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);

  const { data: templates, isLoading } = useTemplates(
    typeFilter === 'all' ? undefined : typeFilter,
    categoryFilter === 'all' ? undefined : categoryFilter
  );
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const filteredTemplates = templates?.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                         t.content.toLowerCase().includes(search.toLowerCase());
    const matchesFavorite = !showFavorites || t.is_favorite;
    return matchesSearch && matchesFavorite;
  });

  const handleSave = (template: any) => {
    if (editingTemplate) {
      updateTemplate.mutate(template);
    } else {
      createTemplate.mutate(template);
    }
    setEditingTemplate(null);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteTemplate.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleUse = (template: MessageTemplate) => {
    if (onUseTemplate) {
      onUseTemplate(template);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates de Mensagens</h2>
          <p className="text-muted-foreground">
            Gerencie seus templates reutilizáveis
          </p>
        </div>
        <Button onClick={() => {
          setEditingTemplate(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showFavorites ? 'default' : 'outline'}
          onClick={() => setShowFavorites(!showFavorites)}
        >
          <Star className={`h-4 w-4 mr-2 ${showFavorites ? 'fill-current' : ''}`} />
          Favoritos
        </Button>
      </div>

      {/* Tabs por Tipo */}
      <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="ivr">IVR</TabsTrigger>
        </TabsList>

        <TabsContent value={typeFilter} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando templates...
            </div>
          ) : filteredTemplates?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'Tente ajustar os filtros de busca' : 'Crie seu primeiro template para começar'}
              </p>
              <Button onClick={() => {
                setEditingTemplate(null);
                setDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates?.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUse}
                  onEdit={handleEdit}
                  onDuplicate={(t) => duplicateTemplate.mutate(t)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        template={editingTemplate}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
