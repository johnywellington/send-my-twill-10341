import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useSIPRoutes } from "@/hooks/use-sip-routes";
import { SIPRouteDialog } from "./SIPRouteDialog";
import { useProvider } from "@/contexts/ProviderContext";

export function RoutesContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { selectedCredentialId } = useProvider();
  const { routes, isLoading, toggleActive, deleteRoute } = useSIPRoutes(selectedCredentialId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalRoutes = routes?.length || 0;
  const activeRoutes = routes?.filter(r => r.is_active).length || 0;
  const inactiveRoutes = totalRoutes - activeRoutes;

  const getRouteTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      'sip_to_sip': { label: 'SIP → SIP', variant: 'default' },
      'sip_to_pstn': { label: 'SIP → PSTN', variant: 'secondary' },
      'pstn_to_sip': { label: 'PSTN → SIP', variant: 'outline' },
    };
    const config = variants[type] || { label: type, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rotas SIP</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Rota
        </Button>
      </div>

      <SIPRouteDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Rotas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalRoutes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rotas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeRoutes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rotas Inativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{inactiveRoutes}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Rotas</CardTitle>
          <CardDescription>Configure o roteamento de chamadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>De → Para</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes && routes.length > 0 ? (
                  routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell>{getRouteTypeBadge(route.route_type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{route.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {route.from_pattern} → {route.forward_to}
                      </TableCell>
                      <TableCell>{route.priority}</TableCell>
                      <TableCell>
                        <Switch
                          checked={route.is_active}
                          onCheckedChange={(checked) => 
                            toggleActive({ id: route.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRoute(route.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma rota configurada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
