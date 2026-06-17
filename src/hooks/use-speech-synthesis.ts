'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  russianVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  hasRussianVoice: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [russianVoices, setRussianVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Синхронизируем ref с состоянием, чтобы использовать в callback
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  // Фильтрация русских голосов по разным признакам
  const filterRussianVoices = useCallback(
    (allVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] => {
      return allVoices.filter((v) => {
        const lang = v.lang.toLowerCase();
        // ru-RU, ru_RU, ru, russian
        return (
          lang === 'ru-ru' ||
          lang === 'ru_ru' ||
          lang.startsWith('ru') ||
          /russian|русск/i.test(v.name)
        );
      });
    },
    []
  );

  // Выбор лучшего русского голоса
  const pickBestRussianVoice = useCallback(
    (ruVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
      if (ruVoices.length === 0) return null;

      // 1. Предпочитаем локальные голоса (не сетевые)
      const local = ruVoices.filter((v) => v.localService);
      if (local.length > 0) {
        // Из локальных — предпочитаем женские (Milena, Irina, Katya)
        const preferredNames = ['milena', 'irina', 'katya', 'elena', 'yuri', 'pavel', 'maxim'];
        for (const name of preferredNames) {
          const match = local.find((v) => v.name.toLowerCase().includes(name));
          if (match) return match;
        }
        return local[0];
      }
      return ruVoices[0];
    },
    []
  );

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length === 0) return;

      console.log('[TTS] Loaded voices:', availableVoices.length, availableVoices.slice(0, 5).map(v => `${v.name} (${v.lang})`));

      setVoices(availableVoices);

      const ruVoices = filterRussianVoices(availableVoices);
      setRussianVoices(ruVoices);
      console.log('[TTS] Russian voices:', ruVoices.map((v) => `${v.name} (${v.lang}, local=${v.localService})`));

      // Если голос ещё не выбран или выбран не русский — выбираем лучший русский
      setSelectedVoice((prev) => {
        // Если уже выбран русский голос — оставляем
        if (prev && ruVoices.includes(prev)) {
          return prev;
        }
        // Иначе выбираем лучший русский
        const best = pickBestRussianVoice(ruVoices);
        if (best) {
          console.log('[TTS] Auto-selected Russian voice:', best.name, best.lang);
        } else {
          console.warn('[TTS] No Russian voice available! Available langs:', [...new Set(availableVoices.map(v => v.lang))]);
        }
        return best;
      });
    };

    // Загружаем сразу
    loadVoices();
    // И подписываемся на изменение (Chrome грузит асинхронно)
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Периодически проверяем — иногда onvoiceschanged не срабатывает
    const interval = setInterval(() => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0 && voices.length === 0) {
        loadVoices();
        clearInterval(interval);
      }
    }, 500);

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      clearInterval(interval);
      window.speechSynthesis.cancel();
    };
  }, [isSupported, filterRussianVoices, pickBestRussianVoice, voices.length]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Отменяем предыдущую речь
      window.speechSynthesis.cancel();

      // Небольшая задержка после cancel — иначе Chrome может не запустить новую
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Получаем свежий список голосов (могли подгрузиться)
        const allVoices = window.speechSynthesis.getVoices();
        let voiceToUse = selectedVoiceRef.current;

        // Если выбранный голос не русский или нет — ищем русский заново
        if (!voiceToUse || !voiceToUse.lang.toLowerCase().startsWith('ru')) {
          const ruVoices = filterRussianVoices(allVoices);
          voiceToUse = pickBestRussianVoice(ruVoices);
          if (voiceToUse) {
            console.log('[TTS] Re-selected Russian voice on speak:', voiceToUse.name);
          }
        }

        if (voiceToUse) {
          utterance.voice = voiceToUse;
          utterance.lang = voiceToUse.lang; // Синхронизируем lang с голосом
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          console.error('[TTS] Speech error:', e);
          setIsSpeaking(false);
        };

        utteranceRef.current = utterance;
        console.log('[TTS] Speaking with voice:', utterance.voice?.name || 'default', 'lang:', utterance.lang);

        window.speechSynthesis.speak(utterance);
      }, 50);
    },
    [isSupported, filterRussianVoices, pickBestRussianVoice]
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const hasRussianVoice = russianVoices.length > 0;

  return {
    speak,
    cancel,
    isSpeaking,
    isSupported,
    voices,
    russianVoices,
    selectedVoice,
    setSelectedVoice,
    hasRussianVoice,
  };
}
