import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCampaigns } from '@/shared/hooks/use-campaigns';
import { useLeadListContacts } from '@/shared/hooks/use-lead-lists';
import { FileText, Search, Users, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

interface CampaignSelectorProps {
  onSelect: (campaign: {
    id: string;
    name: string;
    message_template: string;
    lead_list_id: string | null;
    lead_list_name: string | null;
    contact_count: number | null;
    contacts: string[];
  }) => void;
}

export const CampaignSelector = ({ onSelect }: CampaignSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: contacts } = useLeadListContacts(selectedListId || '');

  const filteredCampaigns = campaigns?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.message_template.toLowerCase().includes(search.toLowerCase()) ||
    c.lead_list_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (campaign: typeof campaigns extends (infer T)[] | undefined ? T : never) => {
    if (!campaign) return;
    
    // Se a campanha tem uma lista de leads, buscar os contatos
    let contactNumbers: string[] = [];
    
    if (campaign.lead_list_id) {
      // Fazer a query dos contatos diretamente
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: listContacts } = await supabase
        .from('lead_list_contacts')
        .select('phone_number')
        .eq('lead_list_id', campaign.lead_list_id);
      
      if (listContacts) {
        contactNumbers = listContacts.map(c => c.phone_number);
      }
    }

    onSelect({
      id: campaign.id,
      name: campaign.name,
      message_template: campaign.message_template,
      lead_list_id: campaign.lead_list_id,
      lead_list_name: campaign.lead_list_name,
      contact_count: campaign.contact_count,
      contacts: contactNumbers
    });
    
    setOpen(false);
    setSearch('');
    
    toast.success(`Campanha "${campaign.name}" carregada`, {
      description: contactNumbers.length > 0 
        ? `${contactNumbers.length} contatos e template aplicados`
        : 'Template aplicado (sem lista de contatos)'
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Carregar Campanha
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Selecionar Campanha</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanhas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de Campanhas */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Carregando campanhas...
              </div>
            ) : filteredCampaigns?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {search ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha criada'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCampaigns?.map((campaign) => (
                  <div
                    key={campaign.id}
                    onClick={() => handleSelect(campaign)}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{campaign.name}</h4>
                      {campaign.sends_count && campaign.sends_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Send className="h-3 w-3 mr-1" />
                          {campaign.sends_count}x enviada
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {campaign.lead_list_name && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {campaign.lead_list_name}
                          {campaign.contact_count && ` (${campaign.contact_count})`}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="line-clamp-2">{campaign.message_template}</p>
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
