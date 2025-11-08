import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone, Activity, DollarSign, Wallet } from "lucide-react";
import { ApiBalancesDialog } from "@/components/admin/ApiBalancesDialog";

const AdminDashboard = () => {
  const [balancesOpen, setBalancesOpen] = useState(false);
  const stats = [
    {
      title: "Total de Usuários",
      value: "0",
      description: "Usuários cadastrados",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Números Ativos",
      value: "0",
      description: "Números em uso",
      icon: Phone,
      color: "text-green-600",
    },
    {
      title: "Chamadas Hoje",
      value: "0",
      description: "Total de chamadas",
      icon: Activity,
      color: "text-purple-600",
    },
    {
      title: "Faturamento",
      value: "R$ 0,00",
      description: "Mês atual",
      icon: DollarSign,
      color: "text-yellow-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema e métricas importantes
          </p>
        </div>
        <Button 
          onClick={() => setBalancesOpen(true)}
          className="gap-2"
          size="lg"
        >
          <Wallet className="h-5 w-5" />
          💰 Saldo das APIs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao Painel Administrativo</CardTitle>
          <CardDescription>
            Use o menu lateral para navegar pelas diferentes funcionalidades administrativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aqui você pode gerenciar usuários, configurar permissões, monitorar o sistema em tempo real,
            visualizar logs de auditoria, gerenciar números de telefone e muito mais.
          </p>
        </CardContent>
      </Card>

      <ApiBalancesDialog open={balancesOpen} onOpenChange={setBalancesOpen} />
    </div>
  );
};

export default AdminDashboard;
