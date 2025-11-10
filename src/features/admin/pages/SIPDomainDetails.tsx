import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Route, Settings, Copy } from "lucide-react";
import { useSIPDomainDetails } from "@/hooks/use-sip-domain-details";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSIPUri } from "@/lib/sip-utils";
import { toast } from "sonner";

export default function SIPDomainDetails() {
  const { domainGroupId } = useParams<{ domainGroupId: string }>();
  const navigate = useNavigate();
  const { domainInfo, users, routes, callStats, isLoading } = useSIPDomainDetails(domainGroupId || '');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!domainInfo) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Domínio não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/sip?tab=config')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{domainInfo.friendly_name}</h1>
            <p className="text-muted-foreground">
              {domainInfo.provider === 'twilio' ? 'Twilio SIP Domain' : 'Vonage SIP Application'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={domainInfo.is_default ? "default" : "outline"}>
            {domainInfo.is_default ? '⭐ Padrão' : 'Secundário'}
          </Badge>
          <Badge variant={domainInfo.is_active ? "default" : "secondary"}>
            {domainInfo.is_active ? '🟢 Ativo' : '🔴 Inativo'}
          </Badge>
        </div>
      </div>

      {/* URI Base do Domínio */}
      {domainInfo.sip_domain && (
        <Card>
          <CardHeader>
            <CardTitle>URI Base do Domínio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                sip:usuario@{domainInfo.sip_domain}
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(domainInfo.sip_domain, 'Domínio')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Substitua "usuario" pelo username desejado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Informações do Domínio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Provider</p>
              <p className="font-medium capitalize">{domainInfo.provider}</p>
            </div>
            {domainInfo.sip_domain && (
              <div>
                <p className="text-sm text-muted-foreground">SIP Domain</p>
                <p className="font-mono text-sm">{domainInfo.sip_domain}</p>
              </div>
            )}
            {domainInfo.sip_domain_sid && (
              <div>
                <p className="text-sm text-muted-foreground">Domain SID</p>
                <p className="font-mono text-xs">{domainInfo.sip_domain_sid}</p>
              </div>
            )}
            {domainInfo.app_id && (
              <div>
                <p className="text-sm text-muted-foreground">Application ID</p>
                <p className="font-mono text-xs">{domainInfo.app_id}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Chamadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats?.total_calls || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Minutos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats?.total_minutes || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${callStats?.total_cost?.toFixed(4) || '0.00'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Última Chamada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {callStats?.last_call_at 
                ? new Date(callStats.last_call_at).toLocaleDateString()
                : 'Nenhuma'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usuários SIP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários SIP ({users?.length || 0})
              </CardTitle>
              <CardDescription>Usuários/ramais configurados neste domínio</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SIP URI</TableHead>
                  <TableHead>Ramal</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">
                      {formatSIPUri(user.sip_username, user.sip_domain)}
                    </TableCell>
                    <TableCell>{user.extension}</TableCell>
                    <TableCell>{user.display_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum usuário configurado neste domínio
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rotas SIP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Rotas SIP ({routes?.length || 0})
              </CardTitle>
              <CardDescription>Regras de roteamento configuradas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {routes && routes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Forward To</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {route.route_type === 'sip_to_sip' && '📞 SIP → SIP'}
                        {route.route_type === 'sip_to_pstn' && '📞 SIP → PSTN'}
                        {route.route_type === 'pstn_to_sip' && '📞 PSTN → SIP'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {route.from_pattern} → {route.to_pattern}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{route.forward_to}</TableCell>
                    <TableCell>{route.priority}</TableCell>
                    <TableCell>
                      <Badge variant={route.is_active ? "default" : "secondary"}>
                        {route.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma rota configurada neste domínio
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
