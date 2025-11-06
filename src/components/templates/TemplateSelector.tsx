import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useTemplates, MessageTemplate, useIncrementTemplateUsage } from '@/hooks/use-templates';
import { FileText, Search, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TemplateSelectorProps {
  type: 'sms' | 'voice' | 'ivr';
  onSelect: (template: MessageTemplate) => void;
}

export const TemplateSelector = ({ type, onSelect }: TemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: templates, isLoading } = useTemplates(type);
  const incrementUsage = useIncrementTemplateUsage();

  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (template: MessageTemplate) => {
    onSelect(template);
    incrementUsage.mutate(template.id);
    setOpen(false);
    setSearch('');
    toast({
      title: 'Template carregado',
      description: `"${template.name}" foi aplicado ao formulário`
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Carregar Template
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Selecionar Template</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de Templates */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Carregando templates...
              </div>
            ) : filteredTemplates?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {search ? 'Nenhum template encontrado' : 'Nenhum template salvo'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates?.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.name}</h4>
                        {template.is_favorite && (
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                    </div>
                    
                    {template.category && (
                      <Badge variant="outline" className="mb-2 text-xs">
                        {template.category}
                      </Badge>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.content}
                    </p>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Usado {template.usage_count} {template.usage_count === 1 ? 'vez' : 'vezes'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
