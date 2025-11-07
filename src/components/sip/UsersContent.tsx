import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Users } from "lucide-react";
import { useSIPUsers } from "@/hooks/use-sip-users";

export function UsersContent() {
  const { users, isLoading } = useSIPUsers();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Usuários SIP</h2>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Criar Usuário SIP
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Twilio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{twilioUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vonage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{vonageUsers}</p>
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
                  <TableHead>Username</TableHead>
                  <TableHead>Ramal</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.sip_username}</TableCell>
                      <TableCell>{user.extension}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.sip_domain}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
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
