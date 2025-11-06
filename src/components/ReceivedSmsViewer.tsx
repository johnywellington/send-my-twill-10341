import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Inbox, Send, Filter, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReceivedSms {
  id: string;
  external_id: string;
  from_number: string;
  to_number: string;
  message: string;
  provider: string;
  received_at: string;
  metadata?: any;
}

export function ReceivedSmsViewer() {
  const [smsMessages, setSmsMessages] = useState<ReceivedSms[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ReceivedSms[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [selectedSms, setSelectedSms] = useState<ReceivedSms | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReceivedSms();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('received-sms-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'received_sms'
        },
        (payload) => {
          console.log('New SMS received:', payload);
          setSmsMessages((current) => [payload.new as ReceivedSms, ...current]);
          toast({
            title: "Novo SMS Recebido!",
            description: `De: ${(payload.new as ReceivedSms).from_number}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterMessages();
  }, [smsMessages, searchQuery, providerFilter]);

  const fetchReceivedSms = async () => {
    try {
      const { data, error } = await supabase
        .from('received_sms')
        .select('*')
        .order('received_at', { ascending: false });

      if (error) throw error;
      setSmsMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching SMS:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar SMS",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = smsMessages;

    if (providerFilter !== "all") {
      filtered = filtered.filter(sms => sms.provider === providerFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(sms => 
        sms.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sms.from_number.includes(searchQuery) ||
        sms.to_number.includes(searchQuery)
      );
    }

    setFilteredMessages(filtered);
  };

  const handleReply = (sms: ReceivedSms) => {
    setSelectedSms(sms);
    toast({
      title: "Responder SMS",
      description: "Funcionalidade em desenvolvimento. Use a aba 'Enviar SMS' para responder.",
    });
  };

  const exportToCSV = () => {
    const headers = ['Data/Hora', 'De', 'Para', 'Mensagem', 'Provider'];
    const rows = filteredMessages.map(sms => [
      format(new Date(sms.received_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      sms.from_number,
      sms.to_number,
      sms.message,
      sms.provider
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sms-recebidos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: "Exportação Concluída",
      description: `${filteredMessages.length} SMS exportados para CSV`,
    });
  };

  const stats = {
    total: smsMessages.length,
    today: smsMessages.filter(sms => {
      const today = new Date();
      const smsDate = new Date(sms.received_at);
      return smsDate.toDateString() === today.toDateString();
    }).length,
    twilio: smsMessages.filter(sms => sms.provider === 'twilio').length,
    vonage: smsMessages.filter(sms => sms.provider === 'vonage').length,
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando SMS recebidos...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Recebidos</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Hoje</CardDescription>
            <CardTitle className="text-3xl">{stats.today}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Twilio</CardDescription>
            <CardTitle className="text-3xl">{stats.twilio}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Vonage</CardDescription>
            <CardTitle className="text-3xl">{stats.vonage}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="w-5 h-5" />
                SMS Recebidos
              </CardTitle>
              <CardDescription>
                Visualize e gerencie todos os SMS recebidos em seus números
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por mensagem, número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px] pr-4">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum SMS recebido ainda</p>
                <p className="text-sm mt-2">
                  Configure os webhooks no Twilio/Vonage para começar a receber SMS
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((sms) => (
                  <Card key={sms.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{sms.from_number}</span>
                            <Badge variant="outline" className="text-xs">
                              {sms.provider}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Para: {sms.to_number}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(sms.received_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReply(sms)}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Responder
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <p className="text-sm">{sms.message}</p>
                      {sms.metadata?.city && (
                        <p className="text-xs text-muted-foreground mt-2">
                          📍 {sms.metadata.city}, {sms.metadata.state}, {sms.metadata.country}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
