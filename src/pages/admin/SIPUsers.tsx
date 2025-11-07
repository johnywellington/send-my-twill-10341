import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Loader2 } from "lucide-react";
import { useSIPUsers } from "@/hooks/use-sip-users";
import { Badge } from "@/components/ui/badge";

export default function SIPUsers() {
  const { users, isLoading } = useSIPUsers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Usuários SIP</h1>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Criar Usuário SIP
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{users?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Twilio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {users?.filter(u => u.provider === 'twilio').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vonage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {users?.filter(u => u.provider === 'vonage').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Todos os usuários SIP cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Username</th>
                  <th className="text-left p-2">Extension</th>
                  <th className="text-left p-2">Provider</th>
                  <th className="text-left p-2">Domain</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono">{user.sip_username}</td>
                    <td className="p-2">{user.extension}</td>
                    <td className="p-2">
                      <Badge variant={user.provider === 'twilio' ? 'default' : 'secondary'}>
                        {user.provider}
                      </Badge>
                    </td>
                    <td className="p-2 font-mono text-sm">{user.sip_domain}</td>
                    <td className="p-2">
                      <Badge className={user.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}