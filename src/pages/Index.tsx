import { useState } from "react";
import { SmsForm } from "@/components/SmsForm";
import { VoiceCallForm } from "@/components/VoiceCallForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Phone } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("sms");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)] mb-4">
            {activeTab === "sms" ? (
              <MessageSquare className="w-8 h-8" />
            ) : (
              <Phone className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {activeTab === "sms" ? "SMS Sender" : "Voice Call"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            {activeTab === "sms" 
              ? "Envie mensagens SMS de forma simples e segura"
              : "Faça chamadas de voz usando a API do Vonage"
            }
          </p>
        </div>
        
        <div className="flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-lg">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Voice Call
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sms">
              <SmsForm />
            </TabsContent>
            
            <TabsContent value="voice">
              <VoiceCallForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
