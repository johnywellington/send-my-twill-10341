import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Phone } from "lucide-react";
import { toast } from "sonner";

export default function SIPMakeCall() {
  const [callType, setCallType] = useState<'internal' | 'external'>('internal');
  const [destination, setDestination] = useState('');

  const handleCall = () => {
    if (!destination) {
      toast.error('Digite o destino da chamada');
      return;
    }
    toast.info('Funcionalidade em desenvolvimento');
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Phone className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Fazer Chamada SIP</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova Chamada</CardTitle>
          <CardDescription>Escolha o tipo e destino da chamada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Tipo de Chamada</Label>
            <RadioGroup value={callType} onValueChange={(v) => setCallType(v as 'internal' | 'external')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="internal" id="internal" />
                <Label htmlFor="internal" className="cursor-pointer">
                  🟢 Interno (SIP para SIP)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external" id="external" />
                <Label htmlFor="external" className="cursor-pointer">
                  🌍 Externo (SIP para PSTN)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">
              {callType === 'internal' ? 'Ramal de Destino' : 'Número de Telefone'}
            </Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={callType === 'internal' ? 'Ex: 1002' : 'Ex: +5511999999999'}
            />
          </div>

          <Button onClick={handleCall} size="lg" className="w-full">
            <Phone className="h-5 w-5 mr-2" />
            Ligar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Chamadas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma chamada recente</p>
        </CardContent>
      </Card>
    </div>
  );
}