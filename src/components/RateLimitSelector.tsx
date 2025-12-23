import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Info } from "lucide-react";
import { RATE_LIMITS, THROTTLE_PERCENTAGES } from "@/lib/rate-limits";

interface RateLimitSelectorProps {
  provider: 'twilio' | 'vonage';
  type: 'sms' | 'voice';
  value: number;
  onChange: (value: number) => void;
}

export function RateLimitSelector({ provider, type, value, onChange }: RateLimitSelectorProps) {
  const limit = RATE_LIMITS[provider][type];
  const effectiveRate = (limit.default * value).toFixed(2);
  
  const getBadgeColor = () => {
    if (value <= 0.25) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (value <= 0.50) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    if (value <= 0.75) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };
  
  return (
    <div className="space-y-3 p-4 border border-border rounded-md bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Velocidade de Envio</Label>
        <Badge variant="outline" className={`gap-1 ${getBadgeColor()}`}>
          <Zap className="w-3 h-3" />
          {effectiveRate} {limit.unit}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Limite da API: {limit.max} {limit.unit}</span>
          <span>Usando: {(value * 100).toFixed(0)}%</span>
        </div>
        
        <RadioGroup value={value.toString()} onValueChange={(v) => onChange(parseFloat(v))}>
          <div className="grid grid-cols-4 gap-2">
            {THROTTLE_PERCENTAGES.map(({ value: v, label }) => (
              <div key={v} className="flex items-center space-x-2">
                <RadioGroupItem value={v.toString()} id={`${provider}-${type}-${v}`} />
                <Label 
                  htmlFor={`${provider}-${type}-${v}`} 
                  className="cursor-pointer text-sm"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
        
        <Alert className="py-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Velocidades menores reduzem risco de throttling e são mais seguras para grandes volumes.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
