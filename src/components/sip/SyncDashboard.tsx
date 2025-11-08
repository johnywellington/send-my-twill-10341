import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Database, Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getProviderIcon } from "@/lib/sip-utils";

interface TwilioCredential {
  sid: string;
  username: string;
  account_sid: string;
  credential_list_sid: string;
  date_created: string;
}

interface VonageEndpoint {
  id: string;
  username: string;
  domain: string;
  application_id: string;
}

interface SyncResult {
  provider: 'twilio' | 'vonage';
  api_data: TwilioCredential | VonageEndpoint;
  db_data?: any;
  status: 'synced' | 'orphaned' | 'missing';
}

export function SyncDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-sip-dashboard', {
        body: {},
      });

      if (error) throw error;

      setSyncResults(data.results || []);
      toast.success(`Sincronização concluída! ${data.total_checked || 0} usuários verificados`);
    } catch (error: any) {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const twilioResults = syncResults.filter(r => r.provider === 'twilio');
  const vonageResults = syncResults.filter(r => r.provider === 'vonage');

  const stats = {
    total: syncResults.length,
    synced: syncResults.filter(r => r.status === 'synced').length,
    orphaned: syncResults.filter(r => r.status === 'orphaned').length,
    missing: syncResults.filter(r => r.status === 'missing').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Sincronização</h2>
          <p className="text-sm text-muted-foreground">
            Comparação entre dados salvos no banco e APIs dos providers
          </p>
        </div>
        <Button onClick={handleSync} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Sincronizando...' : 'Sincronizar APIs'}
        </Button>
      </div>

      {syncResults.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Verificados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Sincronizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Órfãos (só no BD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.orphaned}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Faltando (só na API)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="twilio" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="twilio">
                {getProviderIcon('twilio')} Twilio ({twilioResults.length})
              </TabsTrigger>
              <TabsTrigger value="vonage">
                {getProviderIcon('vonage')} Vonage ({vonageResults.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="twilio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Credentials Twilio</CardTitle>
                  <CardDescription>
                    Comparação entre SIP Credentials do Twilio e dados locais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Credential SID</TableHead>
                          <TableHead>CredList SID</TableHead>
                          <TableHead>Account SID</TableHead>
                          <TableHead>Data Criação</TableHead>
                          <TableHead>Origem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {twilioResults.length > 0 ? (
                          twilioResults.map((result, idx) => {
                            const apiData = result.api_data as TwilioCredential;
                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  {result.status === 'synced' && (
                                    <Badge variant="default" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Sincronizado
                                    </Badge>
                                  )}
                                  {result.status === 'orphaned' && (
                                    <Badge variant="secondary" className="gap-1">
                                      <Database className="h-3 w-3" />
                                      Só no BD
                                    </Badge>
                                  )}
                                  {result.status === 'missing' && (
                                    <Badge variant="destructive" className="gap-1">
                                      <Cloud className="h-3 w-3" />
                                      Só na API
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {apiData.username}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {apiData.sid}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {apiData.credential_list_sid}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {apiData.account_sid}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {new Date(apiData.date_created).toLocaleString('pt-BR')}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {result.db_data && (
                                      <Badge variant="outline" className="text-xs">
                                        <Database className="h-3 w-3 mr-1" />
                                        BD
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      <Cloud className="h-3 w-3 mr-1" />
                                      API
                                    </Badge>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Nenhum dado Twilio encontrado. Clique em "Sincronizar APIs"
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vonage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Endpoints Vonage</CardTitle>
                  <CardDescription>
                    Comparação entre SIP Endpoints da Vonage e dados locais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Endpoint ID</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Application ID</TableHead>
                          <TableHead>Origem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vonageResults.length > 0 ? (
                          vonageResults.map((result, idx) => {
                            const apiData = result.api_data as VonageEndpoint;
                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  {result.status === 'synced' && (
                                    <Badge variant="default" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Sincronizado
                                    </Badge>
                                  )}
                                  {result.status === 'orphaned' && (
                                    <Badge variant="secondary" className="gap-1">
                                      <Database className="h-3 w-3" />
                                      Só no BD
                                    </Badge>
                                  )}
                                  {result.status === 'missing' && (
                                    <Badge variant="destructive" className="gap-1">
                                      <Cloud className="h-3 w-3" />
                                      Só na API
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {apiData.username}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {apiData.id}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {apiData.domain}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {apiData.application_id}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {result.db_data && (
                                      <Badge variant="outline" className="text-xs">
                                        <Database className="h-3 w-3 mr-1" />
                                        BD
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      <Cloud className="h-3 w-3 mr-1" />
                                      API
                                    </Badge>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              Nenhum dado Vonage encontrado. Clique em "Sincronizar APIs"
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {syncResults.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma sincronização realizada</p>
            <p className="text-sm text-muted-foreground mb-4">
              Clique no botão "Sincronizar APIs" para buscar dados dos providers
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
