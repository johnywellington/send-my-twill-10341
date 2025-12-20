import { Clock, CalendarDays, X, Loader2, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAllScheduledRuns, useCancelScheduledRun, type CampaignRun } from "@/shared/hooks/use-campaign-runs";

export function ScheduledCampaignsList() {
  const { data: scheduledRuns, isLoading } = useAllScheduledRuns();
  const cancelRun = useCancelScheduledRun();

  const handleCancel = (runId: string) => {
    cancelRun.mutate(runId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scheduledRuns?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Nenhum envio agendado
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma nova campanha e agende o envio na aba "Nova Campanha"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{scheduledRuns.length}</div>
            <div className="text-sm text-muted-foreground">Agendados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {scheduledRuns.reduce((acc, run) => acc + run.total_contacts, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Contatos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {scheduledRuns.filter(r => {
                const scheduled = new Date(r.scheduled_at!);
                const now = new Date();
                return scheduled.toDateString() === now.toDateString();
              }).length}
            </div>
            <div className="text-sm text-muted-foreground">Hoje</div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div className="space-y-3">
        {scheduledRuns.map((run) => (
          <Card key={run.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">
                      {run.campaign?.name || "Campanha sem nome"}
                    </h3>
                    <Badge className="shrink-0 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                      <Clock className="h-3 w-3 mr-1" />
                      Agendado
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {run.campaign?.message_template || run.metadata?.message_template || ""}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        {format(new Date(run.scheduled_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {formatDistanceToNow(new Date(run.scheduled_at!), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {run.total_contacts} contatos
                    </Badge>
                    <Badge variant="outline">
                      {run.provider}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      De: {run.from_number}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleCancel(run.id)}
                  disabled={cancelRun.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
