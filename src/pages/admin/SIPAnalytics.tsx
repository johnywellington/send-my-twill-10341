import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function SIPAnalytics() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Analytics SIP</h1>
      </div>

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