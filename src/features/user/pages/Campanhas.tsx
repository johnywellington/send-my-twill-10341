import { useState } from "react";
import { Megaphone, Plus, CalendarDays, History, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { CampaignWizard } from "@/features/user/components/campaigns/CampaignWizard";
import { ScheduledCampaignsList } from "@/features/user/components/campaigns/ScheduledCampaignsList";
import { DraftCampaignsList } from "@/features/user/components/campaigns/DraftCampaignsList";
import { CampaignHistoryTab } from "@/features/user/components/campaigns/CampaignHistoryTab";
import { useAllScheduledRuns } from "@/shared/hooks/use-campaign-runs";
import { useDraftCampaigns } from "@/shared/hooks/use-campaigns";

export default function Campanhas() {
  const [activeTab, setActiveTab] = useState("criar");
  const { data: scheduledRuns } = useAllScheduledRuns();
  const { data: drafts } = useDraftCampaigns();
  
  const scheduledCount = scheduledRuns?.length || 0;
  const draftsCount = drafts?.length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" />
          Campanhas Automáticas
        </h1>
        <p className="text-muted-foreground mt-1">
          Crie, agende e monitore campanhas de envio SMS
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="criar" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Campanha
          </TabsTrigger>
          <TabsTrigger value="agendados" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Agendados
            {scheduledCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {scheduledCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rascunhos" className="gap-2">
            <FileText className="h-4 w-4" />
            Rascunhos
            {draftsCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {draftsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="criar" className="mt-6">
          <CampaignWizard onComplete={() => setActiveTab("rascunhos")} />
        </TabsContent>

        <TabsContent value="agendados" className="mt-6">
          <ScheduledCampaignsList />
        </TabsContent>

        <TabsContent value="rascunhos" className="mt-6">
          <DraftCampaignsList />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <CampaignHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
