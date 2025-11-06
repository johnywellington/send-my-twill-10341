import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Sparkles } from "lucide-react";
import { getVoicesByLanguage, isPortugueseLanguage, VoiceOption } from "@/lib/voice-options";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VoiceSelectorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  onPremiumSuggestion?: (premium: boolean) => void;
}

export function VoiceSelector({ language, value, onChange, onPremiumSuggestion }: VoiceSelectorProps) {
  const isPortuguese = isPortugueseLanguage(language);
  const availableVoices = getVoicesByLanguage(language);

  if (!isPortuguese || availableVoices.length === 0) {
    return null;
  }

  const handleVoiceChange = (voiceName: string) => {
    onChange(voiceName);
    const selectedVoice = availableVoices.find(v => v.value === voiceName);
    if (selectedVoice?.type === 'neural' && onPremiumSuggestion) {
      onPremiumSuggestion(true);
    }
  };

  const selectedVoice = availableVoices.find(v => v.value === value);

  return (
    <div className="space-y-3">
      <Alert className="border-primary/20 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Vozes Específicas Disponíveis!</strong> Selecione uma voz natural em português abaixo.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="voice-selector" className="text-sm font-medium">
            Voz Específica
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  <strong>Vozes Neural:</strong> Usam IA para som ultra-natural e expressivo.
                  Recomendamos ativar "Voz Premium" para melhor qualidade.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Select value={value} onValueChange={handleVoiceChange}>
          <SelectTrigger id="voice-selector" className="h-11">
            <SelectValue placeholder="Selecione uma voz..." />
          </SelectTrigger>
          <SelectContent>
            {availableVoices.map((voice) => (
              <SelectItem key={voice.value} value={voice.value}>
                <div className="flex items-center gap-2">
                  <span>{voice.flag}</span>
                  <span>{voice.label}</span>
                  <Badge variant={voice.type === 'neural' ? 'default' : 'secondary'} className="text-xs">
                    {voice.type === 'neural' ? '⭐ Neural' : 'Standard'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {voice.gender === 'female' ? '♀️' : '♂️'}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedVoice && (
          <p className="text-xs text-muted-foreground">
            {selectedVoice.description}
          </p>
        )}
      </div>
    </div>
  );
}
