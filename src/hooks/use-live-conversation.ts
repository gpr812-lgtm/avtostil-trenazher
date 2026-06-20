'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseLiveConversationOptions {
  /** Вызывается, когда пользователь закончил говорить (пауза > silenceThreshold) */
  onUserMessage: (text: string) => void;
  /** Пока true — бот отвечает, микрофон отключается */
  isBotSpeaking: boolean;
  /** Порог тишины в мс, после которого отправляем сообщение */
  silenceThreshold?: number;
  /** Минимальная длина сообщения для отправки */
  minMessageLength?: number;
}

interface UseLiveConversationReturn {
  isActive: boolean;
  isListening: boolean;
  currentTranscript: string;
  start: () => void;
  stop: () => void;
  isSupported: boolean;
  error: string | null;
}

/**
 * Хук для живого диалога:
 * - Слушает микрофон постоянно
 * - При паузе в речи (>silenceThreshold) автоматически отправляет текст
 * - На время озвучки бота ставит микрофон на паузу (half-duplex)
 * - После озвучки бота снова включает микрофон
 */
export function useLiveConversation({
  onUserMessage,
  isBotSpeaking,
  silenceThreshold = 1500,
  minMessageLength = 3,
}: UseLiveConversationOptions): UseLiveConversationReturn {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef('');
  const lastSpeechTimeRef = useRef<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isBotSpeakingRef = useRef(false);
  const isActiveRef = useRef(false);
  const onUserMessageRef = useRef(onUserMessage);

  // Синхронизируем refs
  useEffect(() => {
    isBotSpeakingRef.current = isBotSpeaking;
  }, [isBotSpeaking]);

  useEffect(() => {
    onUserMessageRef.current = onUserMessage;
  }, [onUserMessage]);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Инициализация распознавания речи
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      // Если бот говорит — игнорируем (защита от эха)
      if (isBotSpeakingRef.current) return;

      let interim = '';
      let final = finalTextRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      finalTextRef.current = final;
      setCurrentTranscript((final + ' ' + interim).trim());
      lastSpeechTimeRef.current = Date.now();

      // Перезапускаем таймер тишины
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Если есть финальный текст — запускаем таймер на отправку
      if (final.trim().length >= minMessageLength) {
        silenceTimerRef.current = setTimeout(() => {
          // Двойная проверка — бот мог заговорить
          if (!isBotSpeakingRef.current && isActiveRef.current) {
            const textToSend = finalTextRef.current.trim();
            if (textToSend.length >= minMessageLength) {
              console.log('[Live] Auto-sending:', textToSend);
              onUserMessageRef.current(textToSend);
              finalTextRef.current = '';
              setCurrentTranscript('');
            }
          }
        }, silenceThreshold);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Live] Recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Это нормально в режиме ожидания — не показываем ошибку
        return;
      }
      if (event.error === 'not-allowed') {
        setError('Доступ к микрофону запрещён. Разрешите доступ в браузере.');
        setIsActive(false);
        isActiveRef.current = false;
        return;
      }
      if (event.error === 'audio-capture') {
        setError('Микрофон недоступен.');
        setIsActive(false);
        isActiveRef.current = false;
        return;
      }
      // На других ошибках просто перезапускаем
      console.warn('[Live] Recognition error, will restart:', event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Авто-перезапуск, если активен и бот не говорит
      if (isActiveRef.current && !isBotSpeakingRef.current) {
        try {
          recognition.start();
          setIsListening(true);
        } catch (err) {
          console.warn('[Live] Restart failed:', err);
          // Повторная попытка через 200мс
          setTimeout(() => {
            if (isActiveRef.current && !isBotSpeakingRef.current) {
              try {
                recognition.start();
                setIsListening(true);
              } catch {}
            }
          }, 200);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {}
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isSupported, silenceThreshold, minMessageLength]);

  // Управление микрофоном в зависимости от isBotSpeaking
  useEffect(() => {
    if (!isActive || !recognitionRef.current) return;

    if (isBotSpeaking) {
      // Бот говорит — ставим микрофон на паузу
      console.log('[Live] Bot speaking — pausing mic');
      try {
        recognitionRef.current.stop();
      } catch {}
      // setIsListening будет вызван в recognition.onend
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      // Очищаем накопленный текст, чтобы не отправить эхо
      finalTextRef.current = '';
      // setCurrentTranscript опускаем — он обновится в onresult при следующей речи
    } else {
      // Бот закончил — включаем микрофон
      console.log('[Live] Bot finished — resuming mic');
      // Небольшая задержка, чтобы избежать захвата последних звуков бота
      const resumeTimer = setTimeout(() => {
        if (isActiveRef.current && !isBotSpeakingRef.current) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
            lastSpeechTimeRef.current = Date.now();
          } catch (err) {
            console.warn('[Live] Resume failed:', err);
          }
        }
      }, 300);
      return () => clearTimeout(resumeTimer);
    }
  }, [isBotSpeaking, isActive]);

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Браузер не поддерживает распознавание речи. Используйте Chrome или Edge.');
      return;
    }

    setError(null);
    finalTextRef.current = '';
    setCurrentTranscript('');
    isActiveRef.current = true;
    setIsActive(true);

    if (!isBotSpeakingRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        lastSpeechTimeRef.current = Date.now();
      } catch (err) {
        console.warn('[Live] Start failed:', err);
      }
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    finalTextRef.current = '';
    setCurrentTranscript('');
  }, []);

  return {
    isActive,
    isListening,
    currentTranscript,
    start,
    stop,
    isSupported,
    error,
  };
}
