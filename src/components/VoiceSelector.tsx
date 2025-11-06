import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Sparkles, Play, Square, Loader2, Shield } from "lucide-react";
import { getVoicesByLanguage, isPortugueseLanguage, VoiceOption } from "@/lib/voice-options";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useVoicePreview } from "@/hooks/use-voice-preview";

interface VoiceSelectorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  onPremiumSuggestion?: (premium: boolean) => void;
}

export function VoiceSelector({ language, value, onChange, onPremiumSuggestion }: VoiceSelectorProps) {
  const isPortuguese = isPortugueseLanguage(language);
  const availableVoices = getVoicesByLanguage(language);
  const { isPlaying, isLoading, playPreview, stopPreview } = useVoicePreview();

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
                <div className="flex items-center justify-between w-full gap-3">
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
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (isPlaying === voice.value) {
                        stopPreview();
                      } else {
                        playPreview(voice.value, voice.language, true);
                      }
                    }}
                    disabled={isLoading === voice.value}
                  >
                    {isLoading === voice.value ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isPlaying === voice.value ? (
                      <Square className="h-3 w-3 fill-current" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedVoice && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {selectedVoice.description}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Fallback Automático
              </Badge>
              <span className="text-xs text-muted-foreground">
                Se indisponível, usará voz alternativa automaticamente
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
