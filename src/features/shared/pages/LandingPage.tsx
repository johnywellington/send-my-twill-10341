import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Phone, BarChart3, Shield, Zap, Users } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: "SMS em Massa",
      description: "Envie mensagens para milhares de contatos com alta taxa de entrega"
    },
    {
      icon: Phone,
      title: "Chamadas de Voz",
      description: "Sistema IVR inteligente com múltiplas opções de atendimento"
    },
    {
      icon: BarChart3,
      title: "Analytics Avançado",
      description: "Acompanhe métricas detalhadas de suas campanhas em tempo real"
    },
    {
      icon: Shield,
      title: "100% Seguro",
      description: "Seus dados protegidos com criptografia de ponta a ponta"
    },
    {
      icon: Zap,
      title: "Alta Performance",
      description: "Processamento rápido e confiável de grandes volumes"
    },
    {
      icon: Users,
      title: "Gestão de Contatos",
      description: "Organize seus contatos em grupos e segmentações inteligentes"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">SMS Sender</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/signup")}>
              Criar Conta
            </Button>
            <Button onClick={() => navigate("/login")}>
              Fazer Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Comunicação Profissional
            <br />
            Para Sua Empresa
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa de SMS e Voice para agências de marketing. 
            Alcance seus clientes de forma eficiente e mensurável.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/signup")}>
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
              Acessar Plataforma
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Recursos Poderosos</h3>
          <p className="text-muted-foreground">
            Tudo que você precisa para suas campanhas de marketing
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
          <CardContent className="py-12 text-center">
            <h3 className="text-3xl font-bold mb-4">
              Pronto para Revolucionar sua Comunicação?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de empresas que já confiam em nossa plataforma
            </p>
            <Button size="lg" onClick={() => navigate("/signup")}>
              Criar Conta Agora
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 SMS Sender. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
