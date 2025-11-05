import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodes, parsePhoneNumber, getCountryByCode } from "@/lib/country-codes";

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultDdi?: string;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder = "911019866",
  required = false,
  defaultDdi = "+351",
  className,
}: PhoneInputProps) {
  const [ddi, setDdi] = React.useState(defaultDdi);
  const [localNumber, setLocalNumber] = React.useState("");

  // Inicializar com o valor se fornecido
  React.useEffect(() => {
    if (value) {
      const parsed = parsePhoneNumber(value);
      setDdi(parsed.ddi);
      setLocalNumber(parsed.localNumber);
    }
  }, []);

  // Atualizar o valor completo quando DDI ou número local mudar
  React.useEffect(() => {
    if (localNumber) {
      const fullNumber = `${ddi}${localNumber}`;
      if (fullNumber !== value) {
        onChange(fullNumber);
      }
    } else if (value) {
      onChange("");
    }
  }, [ddi, localNumber]);

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Se o usuário colar um número completo com DDI
    if (input.startsWith('+')) {
      const parsed = parsePhoneNumber(input);
      setDdi(parsed.ddi);
      setLocalNumber(parsed.localNumber);
      return;
    }
    
    // Remover caracteres não numéricos
    const cleaned = input.replace(/[^\d]/g, '');
    setLocalNumber(cleaned);
  };

  const currentCountry = getCountryByCode(ddi);
  const fullNumber = localNumber ? `${ddi}${localNumber}` : "";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={ddi} onValueChange={setDdi}>
          <SelectTrigger className="w-full sm:w-[160px] bg-background">
            <SelectValue>
              {currentCountry && (
                <span className="flex items-center gap-2">
                  <span className="text-lg">{currentCountry.flag}</span>
                  <span className="text-sm">{ddi}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-background max-h-[300px]">
            {countryCodes.map((country, index) => (
              <SelectItem key={index} value={country.code}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-sm font-medium">{country.code}</span>
                  <span className="text-xs text-muted-foreground">{country.country}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="tel"
          value={localNumber}
          onChange={handleLocalNumberChange}
          placeholder={placeholder}
          required={required}
          className="flex-1"
        />
      </div>

      {fullNumber && (
        <p className="text-xs text-muted-foreground">
          Número completo: <span className="font-mono font-medium">{fullNumber}</span>
        </p>
      )}
    </div>
  );
}
