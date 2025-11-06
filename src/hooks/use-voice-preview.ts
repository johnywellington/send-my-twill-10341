import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useVoicePreview() {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, string>>(new Map());

  const playPreview = useCallback(async (
    voiceName: string,
    language: string,
    premium: boolean
  ) => {
    try {
      setIsLoading(voiceName);

      // Verificar cache local primeiro
      const cacheKey = `${voiceName}-${language}-${premium}`;
      const cachedUrl = audioCache.current.get(cacheKey);

      let audioUrl: string;

      if (cachedUrl) {
        console.log('🎵 Using cached audio URL');
        audioUrl = cachedUrl;
      } else {
        // Chamar edge function
        console.log('📡 Fetching audio sample...');
        const { data, error } = await supabase.functions.invoke('generate-voice-sample', {
          body: { voiceName, language, premium }
        });

        if (error) throw error;

        audioUrl = data.audioUrl;
        
        // Cachear URL localmente
        audioCache.current.set(cacheKey, audioUrl);

        // Mostrar toast informativo sobre a fonte
        if (data.source === 'storage') {
          toast({
            title: '🎵 Sample carregado',
            description: 'Áudio recuperado do cache',
            duration: 2000
          });
        } else {
          toast({
            title: '✨ Sample gerado',
            description: 'Áudio gerado e salvo para próximas vezes',
            duration: 3000
          });
        }
      }

      // Parar audio anterior se existir
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Criar novo elemento de audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(null);
      };

      audio.onerror = () => {
        toast({
          title: 'Erro ao reproduzir',
          description: 'Não foi possível reproduzir o sample de áudio',
          variant: 'destructive'
        });
        setIsPlaying(null);
      };

      await audio.play();
      setIsPlaying(voiceName);

    } catch (error) {
      console.error('Error playing preview:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o sample de áudio',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(null);
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(null);
  }, []);

  return {
    isPlaying,
    isLoading,
    playPreview,
    stopPreview
  };
}
