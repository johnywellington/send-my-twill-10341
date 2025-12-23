import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Pause, SkipBack, SkipForward, Loader2, Download, Volume2 } from "lucide-react";
import WaveSurfer from "wavesurfer.js";

interface IVRVoiceTestDialogProps {
  defaultText?: string;
  language: string;
  voiceName: string;
}

export function IVRVoiceTestDialog({ defaultText = "", language, voiceName }: IVRVoiceTestDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(defaultText);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  // Atualizar texto quando defaultText mudar
  useEffect(() => {
    if (defaultText) {
      setText(defaultText);
    }
  }, [defaultText]);

  // Inicializar WaveSurfer quando tiver áudio
  useEffect(() => {
    if (audioData && waveformRef.current && !wavesurferRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'hsl(var(--primary) / 0.3)',
        progressColor: 'hsl(var(--primary))',
        cursorColor: 'hsl(var(--accent))',
        height: 80,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
      });

      wavesurfer.load(audioData);

      wavesurfer.on('ready', () => {
        setDuration(wavesurfer.getDuration());
      });

      wavesurfer.on('audioprocess', () => {
        setCurrentTime(wavesurfer.getCurrentTime());
      });

      wavesurfer.on('finish', () => {
        setIsPlaying(false);
      });

      wavesurferRef.current = wavesurfer;

      return () => {
        wavesurfer.destroy();
        wavesurferRef.current = null;
      };
    }
  }, [audioData]);

  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      toast.error("Por favor, insira um texto");
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-ivr-preview', {
        body: { text, voiceName, language }
      });

      if (error) throw error;

      // Converter base64 para Blob URL
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      setAudioData(audioUrl);
      toast.success('✅ Áudio gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar áudio:', err);
      toast.error('❌ Erro ao gerar áudio. Verifique sua API key do ElevenLabs.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
      setIsPlaying(false);
    } else {
      wavesurferRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleRewind = () => {
    if (!wavesurferRef.current) return;
    const newTime = Math.max(0, currentTime - 5);
    wavesurferRef.current.seekTo(newTime / duration);
  };

  const handleForward = () => {
    if (!wavesurferRef.current) return;
    const newTime = Math.min(duration, currentTime + 5);
    wavesurferRef.current.seekTo(newTime / duration);
  };

  const handleSaveAudio = () => {
    if (!audioData) return;

    const a = document.createElement('a');
    a.href = audioData;
    a.download = `ivr-preview-${Date.now()}.mp3`;
    a.click();

    toast.success('✅ Áudio salvo!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Volume2 className="mr-2 h-4 w-4" />
          Testar Voz
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Testar Voz URA</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Voz Selecionada */}
          <div className="space-y-2">
            <Label>Voz Selecionada</Label>
            <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-md border border-accent/20">
              <Volume2 className="h-4 w-4 text-accent" />
              <span className="font-medium">{voiceName || 'Padrão'}</span>
              <span className="text-sm text-muted-foreground">
                ({language === 'pt-BR' ? '🇧🇷 Português Brasil' : '🇵🇹 Português Portugal'})
              </span>
            </div>
          </div>

          {/* Texto para Gerar */}
          <div className="space-y-2">
            <Label htmlFor="preview-text">Texto para Preview</Label>
            <Textarea
              id="preview-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite o texto que deseja ouvir..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este é o texto que será convertido em áudio para preview
            </p>
          </div>

          {/* Botão Gerar */}
          <Button
            onClick={handleGenerateAudio}
            disabled={isGenerating || !text.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando áudio...
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Gerar Áudio
              </>
            )}
          </Button>

          {/* Player de Áudio */}
          {audioData && (
            <div className="space-y-4 p-4 bg-accent/5 rounded-lg border border-accent/20">
              {/* Waveform */}
              <div className="bg-background rounded-md p-2">
                <div ref={waveformRef} />
              </div>

              {/* Controles */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleRewind}>
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <Button size="icon" onClick={handlePlayPause}>
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <Button variant="outline" size="icon" onClick={handleForward}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tempo */}
                <div className="text-sm text-muted-foreground font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Botão Salvar */}
                <Button variant="outline" onClick={handleSaveAudio} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Salvar Áudio
                </Button>
              </div>
            </div>
          )}

          {/* Informação */}
          {!audioData && (
            <div className="text-center text-sm text-muted-foreground p-8 border border-dashed rounded-lg">
              Clique em "Gerar Áudio" para ouvir como sua mensagem URA vai soar
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
