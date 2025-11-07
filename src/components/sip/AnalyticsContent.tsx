import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalyticsContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics SIP</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Chamadas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Duração Média</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">-</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">-</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">R$ 0,00</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gráficos e Relatórios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Analytics em desenvolvimento
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
