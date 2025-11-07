import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSIPRoutes } from "@/hooks/use-sip-routes";

interface SIPRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SIPRouteDialog({ open, onOpenChange }: SIPRouteDialogProps) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'twilio' | 'vonage'>('twilio');
  const [routeType, setRouteType] = useState<'sip_to_sip' | 'sip_to_pstn' | 'pstn_to_sip'>('sip_to_sip');
  const [fromPattern, setFromPattern] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [priority, setPriority] = useState('0');

  const { createRoute, isCreating } = useSIPRoutes();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !fromPattern || !forwardTo) {
      return;
    }

    createRoute({
      name,
      provider,
      route_type: routeType,
      from_pattern: fromPattern,
      to_pattern: fromPattern,
      forward_to: forwardTo,
      priority: parseInt(priority),
    });

    onOpenChange(false);
    // Reset form
    setName('');
    setFromPattern('');
    setForwardTo('');
    setPriority('0');
  };

  const getRouteTypeLabel = (type: string) => {
    switch (type) {
      case 'sip_to_sip': return 'SIP → SIP (Ramal para Ramal)';
      case 'sip_to_pstn': return 'SIP → PSTN (Ramal para Telefone)';
      case 'pstn_to_sip': return 'PSTN → SIP (Telefone para Ramal)';
      default: return type;
    }
  };

  const getPlaceholderForPattern = () => {
    switch (routeType) {
      case 'sip_to_sip': return '^1001$ (regex do ramal origem)';
      case 'sip_to_pstn': return '^1001$ (regex do ramal origem)';
      case 'pstn_to_sip': return '^\\+5511.*$ (regex do telefone)';
      default: return '';
    }
  };

  const getPlaceholderForForward = () => {
    switch (routeType) {
      case 'sip_to_sip': return '1002 (ramal destino)';
      case 'sip_to_pstn': return '+5511999999999';
      case 'pstn_to_sip': return '1001 (ramal destino)';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Rota SIP</DialogTitle>
          <DialogDescription>
            Configure uma nova regra de roteamento de chamadas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Rota *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rota Ramal 1001"
              required
            />
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
            <Label htmlFor="routeType">Tipo de Rota</Label>
            <Select value={routeType} onValueChange={(v) => setRouteType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sip_to_sip">{getRouteTypeLabel('sip_to_sip')}</SelectItem>
                <SelectItem value="sip_to_pstn">{getRouteTypeLabel('sip_to_pstn')}</SelectItem>
                <SelectItem value="pstn_to_sip">{getRouteTypeLabel('pstn_to_sip')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromPattern">Padrão de Origem (Regex) *</Label>
            <Input
              id="fromPattern"
              value={fromPattern}
              onChange={(e) => setFromPattern(e.target.value)}
              placeholder={getPlaceholderForPattern()}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use regex para identificar a origem da chamada
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="forwardTo">Encaminhar Para *</Label>
            <Input
              id="forwardTo"
              value={forwardTo}
              onChange={(e) => setForwardTo(e.target.value)}
              placeholder={getPlaceholderForForward()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="0"
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Maior prioridade = executada primeiro
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar Rota"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
