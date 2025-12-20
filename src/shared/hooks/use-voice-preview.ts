import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { VoiceOption } from '@/lib/voice-options';

const CACHE_KEY_PREFIX = 'voice-cache-';

// Restaurar cache do localStorage ao inicializar
function restoreCacheFromStorage(): Map<string, string> {
  const cache = new Map<string, string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          const cacheKey = key.replace(CACHE_KEY_PREFIX, '');
          cache.set(cacheKey, value);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to restore voice cache from localStorage:', error);
  }
  return cache;
}

export function useVoicePreview() {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, string>>(restoreCacheFromStorage());
  const preloadedAudioElements = useRef<Map<string, HTMLAudioElement>>(new Map());

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
        
        // Cachear URL localmente e no localStorage
        audioCache.current.set(cacheKey, audioUrl);
        try {
          localStorage.setItem(`${CACHE_KEY_PREFIX}${cacheKey}`, audioUrl);
        } catch (error) {
          console.warn('Failed to cache voice URL in localStorage:', error);
        }

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

  const preloadAllSamples = useCallback(async (voices: VoiceOption[]) => {
    if (voices.length === 0) return;

    setIsPreloading(true);
    setPreloadProgress({ loaded: 0, total: voices.length });

    console.log(`🚀 Pré-carregando ${voices.length} samples de voz...`);

    const promises = voices.map(async (voice) => {
      const cacheKey = `${voice.value}-${voice.language}-true`;
      
      // Verificar se já está no cache
      if (audioCache.current.has(cacheKey)) {
        console.log(`✓ ${voice.value} já está em cache`);
        return { voice: voice.value, cached: true };
      }

      try {
        // Buscar do edge function
        const { data, error } = await supabase.functions.invoke('generate-voice-sample', {
          body: { voiceName: voice.value, language: voice.language, premium: true }
        });

        if (error) throw error;
        
        // Se retornou erro 404 (sample não disponível), ignorar silenciosamente
        if (data.error === 'Sample não disponível') {
          console.log(`⏭️ ${voice.value} - sample não disponível, pulando`);
          return { voice: voice.value, skipped: true };
        }

        const audioUrl = data.audioUrl;
        
        // Cachear URL
        audioCache.current.set(cacheKey, audioUrl);
        try {
          localStorage.setItem(`${CACHE_KEY_PREFIX}${cacheKey}`, audioUrl);
        } catch (storageError) {
          console.warn('Failed to persist cache:', storageError);
        }

        // Pré-carregar audio no browser
        const audio = new Audio(audioUrl);
        audio.preload = 'auto';
        preloadedAudioElements.current.set(voice.value, audio);

        console.log(`✓ ${voice.value} pré-carregado (fonte: ${data.source})`);
        return { voice: voice.value, cached: false, source: data.source };
      } catch (error) {
        console.error(`✗ Erro ao pré-carregar ${voice.value}:`, error);
        return { voice: voice.value, error: true };
      }
    });

    const results = await Promise.allSettled(promises);
    
    let loadedCount = 0;
    let skipped = 0;
    let errors = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const value = result.value as any;
        if (value.skipped) {
          skipped++;
        } else if (!value.error) {
          loadedCount++;
        } else {
          errors++;
        }
        setPreloadProgress({ loaded: loadedCount + skipped, total: voices.length });
      } else {
        errors++;
      }
    });

    setIsPreloading(false);

    if (errors === 0 && skipped === 0) {
      console.log(`✅ ${loadedCount}/${voices.length} samples pré-carregados com sucesso`);
    } else if (skipped > 0) {
      console.log(`ℹ️ ${loadedCount} carregados, ${skipped} não disponíveis ainda`);
      toast({
        title: 'Samples não disponíveis',
        description: `${skipped} vozes ainda não têm samples. Os botões de preview não funcionarão para essas vozes.`,
        variant: 'default',
        duration: 4000
      });
    } else {
      console.warn(`⚠️ ${loadedCount}/${voices.length} carregados (${errors} falhas)`);
      toast({
        title: 'Erro ao carregar samples',
        description: `${errors} samples falharam. Verifique sua conexão.`,
        variant: 'destructive',
        duration: 3000
      });
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    isPreloading,
    preloadProgress,
    playPreview,
    stopPreview,
    preloadAllSamples
  };
}
