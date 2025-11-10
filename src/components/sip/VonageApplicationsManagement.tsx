import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users, Smartphone, Plus, Settings } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { SyncVonageApplicationsButton } from "./SyncVonageApplicationsButton";

interface VonageApplication {
  domain_group_id: string;
  app_id: string;
  app_name: string;
  friendly_name: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface VonageUser {
  id: string;
  sip_username: string;
  extension: string;
  display_name: string;
  is_active: boolean;
  vonage_endpoint_id: string;
  created_at: string;
}

export function VonageApplicationsManagement() {
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());

  // Buscar applications
  const { data: applications, isLoading: loadingApps } = useQuery({
    queryKey: ['vonage-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_provider_config')
        .select('*')
        .eq('provider', 'vonage')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar por domain_group_id
      const grouped = data.reduce((acc: Record<string, any>, row) => {
        if (!acc[row.domain_group_id]) {
          acc[row.domain_group_id] = {
            domain_group_id: row.domain_group_id,
            is_active: row.is_active,
            is_default: row.is_default,
            created_at: row.created_at,
            friendly_name: row.friendly_name,
          };
        }
        acc[row.domain_group_id][row.config_key] = row.config_value;
        return acc;
      }, {});

      return Object.values(grouped) as VonageApplication[];
    },
  });

  // Buscar users por application
  const { data: usersData } = useQuery({
    queryKey: ['vonage-users-by-app'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_users')
        .select('*')
        .eq('provider', 'vonage')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar por domain_group_id
      const grouped = data.reduce((acc: Record<string, VonageUser[]>, user) => {
        const groupId = user.domain_group_id || 'legacy';
        if (!acc[groupId]) acc[groupId] = [];
        acc[groupId].push(user);
        return acc;
      }, {});

      return grouped;
    },
  });

  const toggleApp = (appId: string) => {
    setExpandedApps(prev => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  if (loadingApps) {
    return <div className="text-center py-8">Carregando applications...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Hierarquia Vonage SIP:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li><strong>Application</strong>: Container principal para recursos SIP</li>
              <li><strong>Users (Endpoints)</strong>: Usuários SIP registrados dentro da Application</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Applications Vonage</h3>
          <p className="text-sm text-muted-foreground">
            {applications?.length || 0} application(s) configurada(s)
          </p>
        </div>
        <div className="flex gap-2">
          <SyncVonageApplicationsButton />
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Application
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {applications?.map((app) => {
          const isExpanded = expandedApps.has(app.domain_group_id);
          const users = usersData?.[app.domain_group_id] || [];
          const activeUsers = users.filter(u => u.is_active).length;

          return (
            <Card key={app.domain_group_id}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleApp(app.domain_group_id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Smartphone className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">
                            {app.friendly_name || app.app_name}
                          </CardTitle>
                          {app.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          {!app.is_active && (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </div>
                        <CardDescription className="flex flex-col gap-1">
                          <span>App ID: {app.app_id}</span>
                          <span className="text-xs">
                            {activeUsers} de {users.length} user(s) ativo(s)
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Users ({users.length})</span>
                        </div>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar User
                        </Button>
                      </div>

                      {users.length > 0 ? (
                        <div className="space-y-2">
                          {users.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {user.display_name || user.sip_username}
                                    </span>
                                    {!user.is_active && (
                                      <Badge variant="outline" className="text-xs">
                                        Inativo
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex gap-3 text-xs text-muted-foreground">
                                    <span>Username: {user.sip_username}</span>
                                    <span>Ext: {user.extension}</span>
                                    {user.vonage_endpoint_id && (
                                      <span>Endpoint ID: {user.vonage_endpoint_id}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum user configurado nesta application
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {(!applications || applications.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhuma application Vonage configurada
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Application
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
