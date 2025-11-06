import { useState, useRef, useEffect } from "react";
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
import { MessageSquare, Phone, Menu, PhoneForwarded, LogOut, BarChart3, Users, Send, TrendingUp, FileText, Beaker, Inbox, PhoneIncoming } from "lucide-react";
import { ReceivedSmsViewer } from "@/components/ReceivedSmsViewer";
import { ReceivedCallsViewer } from "@/components/ReceivedCallsViewer";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"sms" | "voice" | "ivr" | "ivr2" | "bulk" | "receive-sms" | "receive-calls">("sms");
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const element = tabsListRef.current;
      if (!element) return;

      const { scrollLeft, scrollWidth, clientWidth } = element;
      setShowLeftGradient(scrollLeft > 10);
      setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const element = tabsListRef.current;
    if (element) {
      handleScroll();
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

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

  const Icon = tabConfig[activeTab].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-4 sm:p-6 md:p-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/contacts")} className="gap-2">
          <Users className="w-4 h-4" />
          Contatos
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/templates")} className="gap-2">
          <FileText className="w-4 h-4" />
          Templates
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/analytics")} className="gap-2">
          <TrendingUp className="w-4 h-4" />
          Analytics
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/api-test")} className="gap-2">
          <Beaker className="w-4 h-4" />
          API Test
        </Button>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-4xl space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[var(--shadow-elegant)] mb-6 hover-lift">
            <Icon className="w-10 h-10" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
            {titles[activeTab]}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            {descriptions[activeTab]}
          </p>
        </div>
        
        <div className="flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab as any} className={`w-full ${activeTab === 'bulk' || activeTab === 'receive-sms' || activeTab === 'receive-calls' ? 'max-w-4xl' : 'max-w-lg'}`}>
            {/* Mobile Dropdown (<640px) */}
            <div className="sm:hidden mb-8">
              <Select value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <SelectTrigger className="w-full h-12 glass-effect">
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
            </div>

            {/* Desktop/Tablet Tabs (>=640px) */}
            <div className="hidden sm:block relative mb-8">
              {/* Left Gradient Indicator */}
              {showLeftGradient && (
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background/95 to-transparent z-10 pointer-events-none animate-fade-in" />
              )}
              
              {/* Right Gradient Indicator */}
              {showRightGradient && (
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/95 to-transparent z-10 pointer-events-none animate-fade-in" />
              )}

              <TabsList 
                ref={tabsListRef}
                className="flex w-full overflow-x-auto scrollbar-hide h-12 p-1.5 glass-effect scroll-smooth gap-1"
              >
                {Object.entries(tabConfig).map(([key, config]) => {
                  const TabIcon = config.icon;
                  return (
                    <TabsTrigger 
                      key={key}
                      value={key} 
                      className="flex items-center gap-2 flex-shrink-0 min-w-fit px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground transition-all duration-200"
                    >
                      <TabIcon className="w-4 h-4" />
                      {/* Mobile: icon only, Tablet: short text, Desktop: full text */}
                      <span className="hidden sm:inline md:hidden">{config.short}</span>
                      <span className="hidden md:inline">{config.title}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            
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
          </Tabs>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
