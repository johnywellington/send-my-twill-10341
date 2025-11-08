import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Users, Copy } from "lucide-react";
import { useSIPUsers } from "@/hooks/use-sip-users";
import { SIPUserDialog } from "./SIPUserDialog";
import { formatSIPUri, getProviderIcon } from "@/lib/sip-utils";
import { toast } from "sonner";
import { useProvider } from "@/contexts/ProviderContext";

export function UsersContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { selectedCredentialId } = useProvider();
  const { users, isLoading } = useSIPUsers(selectedCredentialId);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalUsers = users?.length || 0;
  const twilioUsers = users?.filter(u => u.provider === 'twilio').length || 0;
  const vonageUsers = users?.filter(u => u.provider === 'vonage').length || 0;

  // Estatísticas de extensões
  const extensionsByProvider = {
    twilio: users?.filter(u => u.provider === 'twilio').map(u => parseInt(u.extension)).filter(n => !isNaN(n)).sort((a, b) => a - b) || [],
    vonage: users?.filter(u => u.provider === 'vonage').map(u => parseInt(u.extension)).filter(n => !isNaN(n)).sort((a, b) => a - b) || [],
  };

  const nextAvailableExt = {
    twilio: extensionsByProvider.twilio.length > 0 
      ? Math.max(...extensionsByProvider.twilio) + 1 
      : 1000,
    vonage: extensionsByProvider.vonage.length > 0 
      ? Math.max(...extensionsByProvider.vonage) + 1 
      : 1000,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Usuários SIP</h2>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Usuário SIP
        </Button>
      </div>

      <SIPUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Twilio</CardTitle>
            <CardDescription className="font-mono text-xs">
              Próxima: {nextAvailableExt.twilio}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{twilioUsers}</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {extensionsByProvider.twilio?.map(ext => (
                <Badge key={ext} variant="outline" className="text-xs font-mono">
                  {ext}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vonage</CardTitle>
            <CardDescription className="font-mono text-xs">
              Próxima: {nextAvailableExt.vonage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{vonageUsers}</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {extensionsByProvider.vonage?.map(ext => (
                <Badge key={ext} variant="outline" className="text-xs font-mono">
                  {ext}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader>
            <CardTitle className="text-sm">Última Criada</CardTitle>
          </CardHeader>
          <CardContent>
            {users && users.length > 0 ? (
              <>
                <p className="text-2xl font-bold font-mono">{users[0].extension}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {users[0].display_name || users[0].sip_username}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Gerenciar ramais e credenciais SIP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SIP URI</TableHead>
                  <TableHead>Ramal</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">
                        {formatSIPUri(user.sip_username, user.sip_domain)}
                      </TableCell>
                      <TableCell>{user.extension}</TableCell>
                      <TableCell>{user.display_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getProviderIcon(user.provider as 'twilio' | 'vonage')} {user.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(formatSIPUri(user.sip_username, user.sip_domain), 'SIP URI')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum usuário encontrado
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
