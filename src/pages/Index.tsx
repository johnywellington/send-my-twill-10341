import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SmsForm } from "@/components/SmsForm";
import { VoiceCallForm } from "@/components/VoiceCallForm";
import { IVRMenuForm } from "@/components/IVRMenuForm";
import { IVRMenuFormV2 } from "@/components/IVRMenuFormV2";
import { BulkSendForm } from "@/components/BulkSendForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Phone, Menu, PhoneForwarded, LogOut, BarChart3, Users, Send, TrendingUp, FileText, Beaker, Inbox, PhoneIncoming, Monitor, Smartphone, Hash } from "lucide-react";
import { ReceivedSmsViewer } from "@/components/ReceivedSmsViewer";
import { ReceivedCallsViewer } from "@/components/ReceivedCallsViewer";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"sms" | "voice" | "ivr" | "ivr2" | "bulk" | "receive-sms" | "receive-calls">("sms");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao fazer logout");
    } else {
      toast.success("Logout realizado!");
      navigate("/auth");
    }
  };

  const tabConfig = {
    sms: {
      title: "SMS Sender",
      short: "SMS",
      icon: MessageSquare,
      description: "Envie mensagens SMS de forma simples e segura"
    },
    voice: {
      title: "Voice Call",
      short: "Voice",
      icon: Phone,
      description: "Faça chamadas de voz usando a API do Vonage"
    },
    ivr: {
      title: "Menu IVR",
      short: "IVR",
      icon: Menu,
      description: "Crie menus interativos de atendimento com captura de DTMF"
    },
    ivr2: {
      title: "IVR 2.0",
      short: "IVR 2.0",
      icon: PhoneForwarded,
      description: "Sistema IVR avançado com redirecionamento de chamadas"
    },
    bulk: {
      title: "Envio em Massa",
      short: "Envio",
      icon: Send,
      description: "Envie SMS ou chamadas de voz para múltiplos contatos"
    },
    "receive-sms": {
      title: "Receber SMS",
      short: "Rec. SMS",
      icon: Inbox,
      description: "Visualize e gerencie SMS recebidos em seus números"
    },
    "receive-calls": {
      title: "Receber Chamadas",
      short: "Rec. Calls",
      icon: PhoneIncoming,
      description: "Monitore e grave chamadas recebidas em tempo real"
    }
  };

  const titles = Object.fromEntries(
    Object.entries(tabConfig).map(([key, config]) => [key, config.title])
  ) as Record<string, string>;

  const descriptions = Object.fromEntries(
    Object.entries(tabConfig).map(([key, config]) => [key, config.description])
  ) as Record<string, string>;

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        {/* Header fixo com 2 linhas */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          {/* Linha 1: Navegação Principal */}
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold hidden sm:block">SMS Platform</h2>
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === "desktop" ? "default" : "outline"}
                  size="sm" 
                  onClick={() => setViewMode("desktop")}
                  className="gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  <span className="hidden sm:inline">Desktop</span>
                </Button>
                <Button 
                  variant={viewMode === "mobile" ? "default" : "outline"}
                  size="sm" 
                  onClick={() => setViewMode("mobile")}
                  className="gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Mobile</span>
                </Button>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/numbers")} className="gap-2">
                <Hash className="w-4 h-4" />
                <span className="hidden lg:inline">Números</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/contacts")} className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden lg:inline">Contatos</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/templates")} className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden lg:inline">Templates</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/analytics")} className="gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden lg:inline">Analytics</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden xl:inline">Dashboard</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/api-test")} className="gap-2">
                <Beaker className="w-4 h-4" />
                <span className="hidden xl:inline">API</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </nav>
          </div>

          {/* Linha 2: Tabs */}
          <div className="container mx-auto px-4 py-2 sm:py-3 flex justify-center">
            {viewMode === "mobile" ? (
              /* === MOBILE VIEW (Select Dropdown) === */
              <Select value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <SelectTrigger className="w-full max-w-md h-10 glass-effect">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const TabIcon = tabConfig[activeTab].icon;
                        return <TabIcon className="w-4 h-4" />;
                      })()}
                      <span>{tabConfig[activeTab].title}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  {Object.entries(tabConfig).map(([key, config]) => {
                    const TabIcon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <TabIcon className="w-4 h-4" />
                          <span>{config.title}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              /* === DESKTOP VIEW sem scroll === */
              <div className="relative w-full flex justify-center">
                <TabsList className="inline-flex h-11 p-1.5 glass-effect gap-2">
                  {Object.entries(tabConfig).map(([key, config]) => {
                    const TabIcon = config.icon;
                    return (
                      <TabsTrigger 
                        key={key}
                        value={key}
                        className="h-9 flex items-center justify-center gap-2 px-4
                                   data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary 
                                   data-[state=active]:to-accent data-[state=active]:text-primary-foreground 
                                   transition-all duration-200 rounded-md hover:bg-muted/50 text-sm font-medium"
                      >
                        <TabIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">{config.title}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            )}
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-4xl md:text-4xl font-bold text-foreground tracking-tight">
              {titles[activeTab]}
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              {descriptions[activeTab]}
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="tab-transition">
                <TabsContent value="sms">
                  <SmsForm />
                </TabsContent>
                
                <TabsContent value="voice">
                  <VoiceCallForm />
                </TabsContent>
                
                <TabsContent value="ivr">
                  <IVRMenuForm />
                </TabsContent>
                
                <TabsContent value="ivr2">
                  <IVRMenuFormV2 />
                </TabsContent>
                
                <TabsContent value="bulk">
                  <BulkSendForm />
                </TabsContent>
                
                <TabsContent value="receive-sms">
                  <ReceivedSmsViewer />
                </TabsContent>
                
                <TabsContent value="receive-calls">
                  <ReceivedCallsViewer />
                </TabsContent>
            </div>
          </div>
          </div>
        </main>

        {/* Footer com crédito */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-t border-border py-3">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-muted-foreground">
              Desenvolvido por{" "}
              <a 
                href="https://www.gordintech.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:underline transition-all"
              >
                Gordin Tech
              </a>
            </p>
          </div>
        </footer>
      </Tabs>
    </div>
  );
};

export default Index;
