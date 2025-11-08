import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import { ConfigContent } from "@/components/sip/ConfigContent";
import { UsersContent } from "@/components/sip/UsersContent";
import { RoutesContent } from "@/components/sip/RoutesContent";
import { MonitorContent } from "@/components/sip/MonitorContent";
import { EventsContent } from "@/components/sip/EventsContent";
import { WebhooksContent } from "@/components/sip/WebhooksContent";
import { SyncDashboard } from "@/components/sip/SyncDashboard";

export default function AdminSIP() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'config';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Administração SIP</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="config">⚙️ Config</TabsTrigger>
          <TabsTrigger value="usuarios">👥 Usuários</TabsTrigger>
          <TabsTrigger value="rotas">🛣️ Rotas</TabsTrigger>
          <TabsTrigger value="monitor">📊 Monitor</TabsTrigger>
          <TabsTrigger value="eventos">📋 Eventos</TabsTrigger>
          <TabsTrigger value="webhooks">🔗 Webhooks</TabsTrigger>
          <TabsTrigger value="sync">🔄 Sincronização</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <ConfigContent />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <UsersContent />
        </TabsContent>

        <TabsContent value="rotas" className="mt-6">
          <RoutesContent />
        </TabsContent>

        <TabsContent value="monitor" className="mt-6">
          <MonitorContent />
        </TabsContent>

        <TabsContent value="eventos" className="mt-6">
          <EventsContent />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <WebhooksContent />
        </TabsContent>

        <TabsContent value="sync" className="mt-6">
          <SyncDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
