import { useState } from "react";
import { History, Loader2, Search, RefreshCcw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CampaignRunCard } from "@/components/campaigns/CampaignRunCard";
import { 
  useCampaignRuns, 
  useCancelScheduledRun, 
  usePauseCampaignRun,
  useResumeCampaignRun,
  type CampaignRun 
} from "@/shared/hooks/use-campaign-runs";
import { useCampaigns } from "@/shared/hooks/use-campaigns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function CampaignHistoryTab() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: runs, isLoading: loadingRuns, refetch } = useCampaignRuns();
  const { data: campaigns } = useCampaigns();
  const cancelRun = useCancelScheduledRun();
  const pauseRun = usePauseCampaignRun();
  const resumeRun = useResumeCampaignRun();

  const filteredRuns = runs?.filter(run => {
    if (statusFilter !== "all" && run.status !== statusFilter) return false;
    if (campaignFilter !== "all" && run.campaign_id !== campaignFilter) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCampaign = run.campaign?.name?.toLowerCase().includes(query);
      const matchesNumber = run.from_number.includes(query);
      if (!matchesCampaign && !matchesNumber) return false;
    }
    
    return true;
  }) || [];

  const handleCancelRun = (runId: string) => {
    cancelRun.mutate(runId);
  };

  const handlePauseRun = (runId: string) => {
    pauseRun.mutate(runId);
  };

  const handleResumeRun = (runId: string) => {
    resumeRun.mutate(runId);
  };

  const handleRetryFailed = (run: CampaignRun) => {
    const failedNumbers = run.failed_numbers || [];
    if (failedNumbers.length === 0) {
      toast.info("Nenhum número com falha para reenviar");
      return;
    }

    toast.info(`${failedNumbers.length} números para reenviar`, {
      description: "Redirecionando para a Central de Comunicação...",
    });
    
    sessionStorage.setItem('retryNumbers', JSON.stringify({
      numbers: failedNumbers.map(f => ({
        phone_number: f.phone_number,
        name: f.contact_name || 'Reenvio'
      })),
      campaignName: run.campaign?.name,
      message: run.metadata?.message_template || run.campaign?.message_template
    }));
    
    navigate('/comunicacao');
  };

  const stats = {
    total: runs?.length || 0,
    completed: runs?.filter(r => r.status === 'completed').length || 0,
    scheduled: runs?.filter(r => r.status === 'scheduled').length || 0,
    failed: runs?.filter(r => r.status === 'failed').length || 0,
    paused: runs?.filter(r => r.status === 'paused').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Concluídas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <div className="text-sm text-muted-foreground">Agendadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
            <div className="text-sm text-muted-foreground">Pausadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Com Falhas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por campanha ou número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="running">Em andamento</SelectItem>
                <SelectItem value="paused">Pausados</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="failed">Com falhas</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {campaigns?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Runs List */}
      {loadingRuns ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredRuns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {runs?.length === 0 
                ? "Nenhuma execução registrada ainda."
                : "Nenhuma execução encontrada com os filtros selecionados."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRuns.map((run) => (
            <CampaignRunCard
              key={run.id}
              run={run}
              onCancel={handleCancelRun}
              onRetryFailed={handleRetryFailed}
              onPause={handlePauseRun}
              onResume={handleResumeRun}
            />
          ))}
        </div>
      )}
    </div>
  );
}
