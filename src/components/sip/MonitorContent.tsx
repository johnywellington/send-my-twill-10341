import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MonitorContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Monitor SIP</h2>

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
