import { useState } from "react";
import { SmsForm } from "@/components/SmsForm";
import { VoiceCallForm } from "@/components/VoiceCallForm";
import { IVRMenuForm } from "@/components/IVRMenuForm";
import { IVRMenuFormV2 } from "@/components/IVRMenuFormV2";
import { BulkSendForm } from "@/components/BulkSendForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Phone, Menu, PhoneForwarded, Send, Inbox, PhoneIncoming, Monitor, Smartphone } from "lucide-react";
import { ReceivedSmsViewer } from "@/components/ReceivedSmsViewer";
import { ReceivedCallsViewer } from "@/components/ReceivedCallsViewer";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"sms" | "voice" | "ivr" | "ivr2" | "bulk" | "receive-sms" | "receive-calls">("sms");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

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
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{titles[activeTab]}</h2>
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

        {/* Tabs Navigation */}
        <div className="mb-6">
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
            /* === DESKTOP VIEW */
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

        {/* Content Description */}
        <div className="text-center space-y-2 mb-6">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {descriptions[activeTab]}
          </p>
        </div>

        {/* Tab Content */}
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
      </Tabs>
    </div>
  );
};

export default Index;
