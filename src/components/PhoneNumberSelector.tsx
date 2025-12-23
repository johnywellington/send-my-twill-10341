import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import { useProvider } from "@/contexts/ProviderContext";
import { Phone, Loader2 } from "lucide-react";

interface PhoneNumberSelectorProps {
  value: string;
  onChange: (value: string) => void;
  filterType?: 'sms' | 'voice' | 'all';
  label?: string;
  description?: string;
  required?: boolean;
}

export function PhoneNumberSelector({
  value,
  onChange,
  filterType = 'all',
  label = "Número de Origem",
  description,
  required = true
}: PhoneNumberSelectorProps) {
  const { provider } = useProvider();
  const { data: phoneNumbers, isLoading } = usePhoneNumbers();
  const [manualMode, setManualMode] = useState(false);

  const filteredNumbers = phoneNumbers?.filter(num => {
    if (num.provider !== provider) return false;
    if (filterType === 'sms') return num.supports_sms;
    if (filterType === 'voice') return num.supports_voice;
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando números...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setManualMode(!manualMode)}
          className="text-xs"
        >
          {manualMode ? "Selecionar da lista" : "Digitar manualmente"}
        </Button>
      </div>
      
      {manualMode ? (
        <Input
          type="tel"
          placeholder="Ex: +351911019866"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="h-11"
        />
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Selecione um número">
              {value && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{value}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filteredNumbers.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                Nenhum número disponível
              </div>
            ) : (
              filteredNumbers.map((num) => (
                <SelectItem key={num.id} value={num.phone_number}>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{num.phone_number}</span>
                    {num.friendly_name && (
                      <span className="text-muted-foreground">({num.friendly_name})</span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
