import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, MessageSquare, Phone, List, Calendar, Search, Filter, BarChart3, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type LogType = "sms" | "voice" | "ivr";

interface SMSLog {
  id: string;
  to_number: string;
  from_number: string;
  message: string;
  provider: string;
  status: string;
  external_id: string | null;
  error_message: string | null;
  created_at: string;
}

interface VoiceLog {
  id: string;
  to_number: string;
  from_number: string;
  message: string;
  language: string;
  style: number;
  premium: boolean;
  status: string;
  call_uuid: string | null;
  duration: number | null;
  error_message: string | null;
  created_at: string;
}

interface IVRLog {
  id: string;
  to_number: string;
  from_number: string;
  template_used: string | null;
  ncco: any;
  language: string;
  style: number;
  premium: boolean;
  status: string;
  call_uuid: string | null;
  conversation_uuid: string | null;
  duration: number | null;
  dtmf_response: string | null;
  error_message: string | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LogType>("sms");
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const [ivrLogs, setIvrLogs] = useState<IVRLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<SMSLog | VoiceLog | IVRLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    checkUser();
    fetchLogs();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [smsResult, voiceResult, ivrResult] = await Promise.all([
        supabase.from("sms_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("voice_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("ivr_logs").select("*").order("created_at", { ascending: false }),
      ]);

      if (smsResult.error) throw smsResult.error;
      if (voiceResult.error) throw voiceResult.error;
      if (ivrResult.error) throw ivrResult.error;

      setSmsLogs(smsResult.data || []);
      setVoiceLogs(voiceResult.data || []);
      setIvrLogs(ivrResult.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar histórico", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      initiated: "secondary",
      delivered: "default",
      failed: "destructive",
      completed: "default",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  const filterLogs = <T extends SMSLog | VoiceLog | IVRLog>(logs: T[]): T[] => {
    return logs.filter((log) => {
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      const matchesSearch =
        searchTerm === "" ||
        log.to_number.includes(searchTerm) ||
        log.from_number.includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  };

  const openDetails = (log: SMSLog | VoiceLog | IVRLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const renderSMSLogs = () => {
    const filtered = filterLogs(smsLogs);
    
    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Nenhum SMS encontrado</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filtered.map((log) => (
          <Card key={log.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDetails(log)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {log.from_number} → {log.to_number}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{log.provider}</Badge>
                  {getStatusBadge(log.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{log.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderVoiceLogs = () => {
    const filtered = filterLogs(voiceLogs);
    
    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Phone className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Nenhuma chamada de voz encontrada</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filtered.map((log) => (
          <Card key={log.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDetails(log)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {log.from_number} → {log.to_number}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {log.premium && <Badge variant="secondary">Premium</Badge>}
                  {getStatusBadge(log.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{log.message}</p>
              {log.duration && (
                <p className="text-xs text-muted-foreground mt-2">
                  Duração: {log.duration}s
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderIVRLogs = () => {
    const filtered = filterLogs(ivrLogs);
    
    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <List className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Nenhuma chamada IVR encontrada</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filtered.map((log) => (
          <Card key={log.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDetails(log)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {log.from_number} → {log.to_number}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {log.template_used && (
                    <Badge variant="outline">{log.template_used}</Badge>
                  )}
                  {log.premium && <Badge variant="secondary">Premium</Badge>}
                  {getStatusBadge(log.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {log.dtmf_response && (
                <p className="text-sm mb-2">
                  <span className="font-medium">Resposta DTMF:</span> {log.dtmf_response}
                </p>
              )}
              {log.duration && (
                <p className="text-xs text-muted-foreground">
                  Duração: {log.duration}s
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderDetailsDialog = () => {
    if (!selectedLog) return null;

    const isSMS = "provider" in selectedLog;
    const isVoice = "message" in selectedLog && !("provider" in selectedLog) && !("ncco" in selectedLog);
    const isIVR = "ncco" in selectedLog;

    return (
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Comunicação</DialogTitle>
            <DialogDescription>
              {format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Origem</p>
                <p className="text-sm">{selectedLog.from_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Destino</p>
                <p className="text-sm">{selectedLog.to_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
              </div>
              {isSMS && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Provider</p>
                    <Badge variant="outline" className="mt-1">{selectedLog.provider}</Badge>
                  </div>
                  {selectedLog.external_id && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">ID Externo</p>
                      <p className="text-xs font-mono mt-1">{selectedLog.external_id}</p>
                    </div>
                  )}
                </>
              )}
              {(isVoice || isIVR) && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Idioma</p>
                    <p className="text-sm">{selectedLog.language}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Voz Premium</p>
                    <Badge variant={selectedLog.premium ? "secondary" : "outline"} className="mt-1">
                      {selectedLog.premium ? "Sim" : "Não"}
                    </Badge>
                  </div>
                  {selectedLog.call_uuid && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">UUID da Chamada</p>
                      <p className="text-xs font-mono mt-1">{selectedLog.call_uuid}</p>
                    </div>
                  )}
                  {selectedLog.duration && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Duração</p>
                      <p className="text-sm">{selectedLog.duration} segundos</p>
                    </div>
                  )}
                </>
              )}
              {isIVR && (
                <>
                  {selectedLog.template_used && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Template</p>
                      <Badge variant="outline" className="mt-1">{selectedLog.template_used}</Badge>
                    </div>
                  )}
                  {selectedLog.conversation_uuid && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">UUID da Conversa</p>
                      <p className="text-xs font-mono mt-1">{selectedLog.conversation_uuid}</p>
                    </div>
                  )}
                  {selectedLog.dtmf_response && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Resposta DTMF</p>
                      <p className="text-sm font-mono mt-1">{selectedLog.dtmf_response}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {isSMS && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Mensagem</p>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap">{selectedLog.message}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {isVoice && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Texto da Chamada</p>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap">{selectedLog.message}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {isIVR && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">NCCO (Configuração IVR)</p>
                <Card>
                  <CardContent className="pt-4">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.ncco, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedLog.error_message && (
              <div>
                <p className="text-sm font-medium text-destructive mb-2">Erro</p>
                <Card className="border-destructive">
                  <CardContent className="pt-4">
                    <p className="text-sm text-destructive">{selectedLog.error_message}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Histórico de comunicações SMS, Voz e IVR
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar
            </Button>
            <Button variant="outline" onClick={() => navigate("/templates")}>
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </Button>
            <Button variant="outline" onClick={() => navigate("/analytics")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="initiated">Iniciado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total SMS</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{smsLogs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chamadas de Voz</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{voiceLogs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chamadas IVR</CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ivrLogs.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LogType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Voz
            </TabsTrigger>
            <TabsTrigger value="ivr" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              IVR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (
              renderSMSLogs()
            )}
          </TabsContent>

          <TabsContent value="voice" className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (
              renderVoiceLogs()
            )}
          </TabsContent>

          <TabsContent value="ivr" className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (
              renderIVRLogs()
            )}
          </TabsContent>
        </Tabs>
      </div>

      {renderDetailsDialog()}
    </div>
  );
};

export default Dashboard;
