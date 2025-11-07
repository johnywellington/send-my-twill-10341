import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMakeSIPCall } from "@/hooks/use-make-sip-call";

interface SIPCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SIPCallDialog({ open, onOpenChange }: SIPCallDialogProps) {
  const [callType, setCallType] = useState<'internal' | 'external'>('internal');
  const [provider, setProvider] = useState<'twilio' | 'vonage'>('twilio');
  const [destination, setDestination] = useState('');

  const { makeCall, isCalling } = useMakeSIPCall();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!destination) {
      return;
    }

    makeCall({
      provider,
      call_type: callType,
      destination,
    });

    onOpenChange(false);
    setDestination('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Fazer Chamada SIP</DialogTitle>
          <DialogDescription>
            Inicie uma chamada através do seu ramal SIP
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Chamada</Label>
            <RadioGroup value={callType} onValueChange={(v) => setCallType(v as 'internal' | 'external')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="internal" id="internal" />
                <Label htmlFor="internal" className="font-normal cursor-pointer">
                  Interna (Ramal para Ramal)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external" id="external" />
                <Label htmlFor="external" className="font-normal cursor-pointer">
                  Externa (Ramal para Telefone)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provedor</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as 'twilio' | 'vonage')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">
              {callType === 'internal' ? 'Ramal Destino' : 'Número de Telefone'} *
            </Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={callType === 'internal' ? '1002' : '+5511999999999'}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCalling}>
              {isCalling ? "Ligando..." : "Ligar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
