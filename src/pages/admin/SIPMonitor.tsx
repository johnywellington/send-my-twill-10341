import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function SIPMonitor() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Monitor SIP</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chamadas Ativas</CardTitle>
            <CardDescription>Em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-2">Nenhuma chamada ativa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Endpoints Online</CardTitle>
            <CardDescription>Usuários conectados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-2">Nenhum endpoint online</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chamadas Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhuma chamada ativa no momento
          </p>
        </CardContent>
      </Card>
    </div>
  );
}