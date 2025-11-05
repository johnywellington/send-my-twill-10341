import { useState } from "react";
import { SmsForm } from "@/components/SmsForm";
import { VoiceCallForm } from "@/components/VoiceCallForm";
import { IVRMenuForm } from "@/components/IVRMenuForm";
import { IVRMenuFormV2 } from "@/components/IVRMenuFormV2";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Phone, Menu, PhoneForwarded } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"sms" | "voice" | "ivr" | "ivr2">("sms");

  const titles = {
    sms: "SMS Sender",
    voice: "Voice Call",
    ivr: "Menu IVR",
    ivr2: "IVR 2.0"
  };

  const descriptions = {
    sms: "Envie mensagens SMS de forma simples e segura",
    voice: "Faça chamadas de voz usando a API do Vonage",
    ivr: "Crie menus interativos de atendimento com captura de DTMF",
    ivr2: "Sistema IVR avançado com redirecionamento de chamadas"
  };

  const icons = {
    sms: MessageSquare,
    voice: Phone,
    ivr: Menu,
    ivr2: PhoneForwarded
  };

  const Icon = icons[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4 sm:p-6 md:p-8">
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
          <Tabs value={activeTab} onValueChange={setActiveTab as any} className="w-full max-w-lg">
            <TabsList className="grid w-full grid-cols-4 mb-8 h-12 p-1.5 glass-effect">
              <TabsTrigger value="sms" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground transition-all duration-200">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">SMS</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground transition-all duration-200">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Voice</span>
              </TabsTrigger>
              <TabsTrigger value="ivr" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground transition-all duration-200">
                <Menu className="w-4 h-4" />
                <span className="hidden sm:inline">IVR</span>
              </TabsTrigger>
              <TabsTrigger value="ivr2" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground transition-all duration-200">
                <PhoneForwarded className="w-4 h-4" />
                <span className="hidden sm:inline">IVR 2.0</span>
              </TabsTrigger>
            </TabsList>
            
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
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
