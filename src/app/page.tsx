'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Phone,
  PhoneOff,
  Car,
  BarChart3,
  Sparkles,
  RotateCcw,
  Info,
} from 'lucide-react';
import { scenarios, Scenario } from '@/data/scenarios';
import { CarModel } from '@/data/cars';
import { ScenarioSelector } from '@/components/scenario-selector';
import { CarCatalog } from '@/components/car-catalog';
import { Dialogue, Message } from '@/components/dialogue';
import { InputPanel } from '@/components/input-panel';
import { FeedbackPanel, Feedback } from '@/components/feedback-panel';
import { ShopperFeedback } from '@/lib/shopper';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { useLiveConversation } from '@/hooks/use-live-conversation';
import { toast } from '@/hooks/use-toast';

interface DialogueMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [selectedCar, setSelectedCar] = useState<CarModel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [shopperFeedback, setShopperFeedback] = useState<ShopperFeedback | null>(null);
  const [isShopperLoading, setIsShopperLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsMode, setTtsMode] = useState<'neural' | 'system'>('neural');
  const [neuralVoice, setNeuralVoice] = useState<'male' | 'female'>('male');
  const [isNeuralPlaying, setIsNeuralPlaying] = useState(false);
  const [leftTab, setLeftTab] = useState<'scenarios' | 'catalog'>('scenarios');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callStartRef = useRef<number>(0);

  // Разблокируем audio при первом взаимодействии пользователя со страницей.
  // Это нужно из-за autoplay policy — без этого audio.play() будет молча падать
  useEffect(() => {
    let unlocked = false;

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      if (audioRef.current) {
        // Создаём короткий тихий сигнал через Web Audio API
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          const oscillator = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          gain.gain.value = 0.001; // Почти тихо
          oscillator.connect(gain);
          gain.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.05);
          console.log('[Audio] AudioContext unlocked');
        } catch (e) {
          console.warn('[Audio] AudioContext unlock failed:', e);
        }

        // Также разблокируем audio элемент через data URI (1 секунда тишины)
        try {
          const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
          audioRef.current.src = silentWav;
          audioRef.current.volume = 0;
          audioRef.current.play().then(() => {
            audioRef.current!.pause();
            audioRef.current!.volume = 1;
            audioRef.current!.src = '';
            console.log('[Audio] Audio element unlocked with silent wav');
          }).catch((e) => {
            console.warn('[Audio] Silent play failed:', e.message);
          });
        } catch (e) {
          console.warn('[Audio] Audio element unlock failed:', e);
        }
      }
    };

    // Любое взаимодействие разблокирует
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('mousedown', unlock);

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('mousedown', unlock);
    };
  }, []);

  // Refs для стабильных callbacks в live-режиме
  const messagesRef = useRef<Message[]>([]);
  const isCallActiveRef = useRef(false);
  const selectedScenarioRef = useRef<Scenario | null>(null);
  const ttsEnabledRef = useRef(true);
  const ttsModeRef = useRef<'neural' | 'system'>('neural');
  const neuralVoiceRef = useRef<'male' | 'female'>('male');

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    selectedScenarioRef.current = selectedScenario;
  }, [selectedScenario]);

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  useEffect(() => {
    ttsModeRef.current = ttsMode;
  }, [ttsMode]);

  useEffect(() => {
    neuralVoiceRef.current = neuralVoice;
  }, [neuralVoice]);

  // Браузерный TTS — поддерживает русский язык
  const {
    speak: speakTTS,
    cancel: cancelTTS,
    isSupported: ttsSupported,
    isSpeaking: isSystemSpeaking,
    hasRussianVoice,
    russianVoices,
    selectedVoice,
    setSelectedVoice,
  } = useSpeechSynthesis();

  // Бот "говорит" если либо системный TTS активен, либо нейронный MP3 играет
  const isBotSpeaking = isSystemSpeaking || isNeuralPlaying;

  // Предупреждение, если TTS не поддерживается браузером
  useEffect(() => {
    if (!ttsSupported) {
      toast({
        title: 'Озвучка недоступна',
        description: 'Ваш браузер не поддерживает синтез речи. Используйте Chrome, Edge или Yandex.Browser. Текстовый режим диалога работает.',
        variant: 'destructive',
      });
      setTtsEnabled(false);
    }
  }, [ttsSupported]);

  // Предупреждение, если нет русского голоса
  useEffect(() => {
    if (ttsSupported && !hasRussianVoice && ttsEnabled) {
      toast({
        title: 'Нет русского голоса в системе',
        description: 'В вашей ОС не установлен русский голос для синтеза речи. Установите русский голос в настройках системы, иначе озвучка будет на другом языке.',
        variant: 'destructive',
      });
    }
  }, [ttsSupported, hasRussianVoice, ttsEnabled]);

  // Нейронный TTS — Silero (локально, без лимитов)
  // ♂ Мужской: aidar (настоящий мужской русский голос)
  // ♀ Женский: kseniya (женский русский голос)
  const playNeuralTTS = useCallback(
    (text: string) => {
      cancelTTS();
      setIsNeuralPlaying(true);

      const voice = neuralVoiceRef.current;
      const isMale = voice === 'male';
      const voiceName = isMale ? 'Айдар (♂, Silero)' : 'Ксения (♀, Silero)';

      console.log(`[TTS-Neural] Generating with voice=${voice} (${voiceName}), text="${text.slice(0, 50)}..."`);

      const tryFetch = async (attempt: number): Promise<Blob> => {
        console.log(`[TTS-Neural] Attempt ${attempt}/3`);
        const res = await fetch('http://localhost:3000/api/tts-silero', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }

        const blob = await res.blob();
        if (blob.size < 100) {
          throw new Error(`Слишком маленький ответ: ${blob.size} bytes`);
        }
        return blob;
      };

      const fetchWithRetry = async (): Promise<Blob> => {
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            return await tryFetch(attempt);
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`[TTS-Neural] Attempt ${attempt} failed:`, lastError.message);
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 200 * attempt));
            }
          }
        }
        throw lastError;
      };

      fetchWithRetry()
        .then((blob) => {
          console.log(`[TTS-Neural] Got audio: ${blob.size} bytes, voice=${voiceName}`);
          const url = URL.createObjectURL(blob);

          const playAudio = (audio: HTMLAudioElement): Promise<void> => {
            audio.src = url;
            audio.onended = () => {
              setIsNeuralPlaying(false);
              URL.revokeObjectURL(url);
            };
            audio.onerror = () => {
              setIsNeuralPlaying(false);
              console.error('[TTS-Neural] Audio playback error');
            };
            return audio.play();
          };

          if (audioRef.current) {
            playAudio(audioRef.current).catch((err) => {
              console.warn('[TTS-Neural] audioRef.play failed, trying new Audio():', err.message);
              const newAudio = new Audio(url);
              newAudio.onended = () => {
                setIsNeuralPlaying(false);
                URL.revokeObjectURL(url);
              };
              newAudio.play().catch((err2) => {
                console.error('[TTS-Neural] new Audio failed too:', err2);
                setIsNeuralPlaying(false);
                toast({
                  title: 'Не удалось воспроизвести',
                  description: 'Кликните куда-нибудь на странице и попробуйте снова.',
                  variant: 'destructive',
                });
              });
            });
          } else {
            const newAudio = new Audio(url);
            newAudio.onended = () => {
              setIsNeuralPlaying(false);
              URL.revokeObjectURL(url);
            };
            newAudio.play().catch((err) => {
              console.error('[TTS-Neural] Audio play failed:', err);
              setIsNeuralPlaying(false);
            });
          }
        })
        .catch((err) => {
          console.error('[TTS-Neural] All retries failed:', err.message);
          setIsNeuralPlaying(false);
          toast({
            title: 'Нейронный голос недоступен',
            description: `Silero TTS не ответил. Попробуйте ещё раз.`,
            variant: 'destructive',
          });
        });
    },
    [cancelTTS]
  );

  // Универсальная функция озвучки: выбирает нейронный или системный
  const playTTS = useCallback(
    (text: string) => {
      if (ttsModeRef.current === 'neural') {
        playNeuralTTS(text);
      } else if (ttsSupported) {
        // Системный голос
        setTimeout(() => {
          speakTTS(text);
        }, 100);
      }
    },
    [ttsSupported, speakTTS, playNeuralTTS]
  );

  // Остановить любую озвучку
  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    cancelTTS();
    setIsNeuralPlaying(false);
  }, [cancelTTS]);

  // Тестовый голос — чтобы пользователь мог проверить, как звучит
  const handleTestVoice = useCallback(() => {
    // Разблокируем audio (пользователь кликнул кнопку «Тест»)
    if (audioRef.current) {
      const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      audioRef.current.src = silentWav;
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.volume = 1;
          audioRef.current.src = '';
        }
        console.log('[Audio] Unlocked on Test button');
      }).catch(() => {});
    }
    playTTS(
      `Здравствуйте! Это тестовое сообщение. ${neuralVoiceRef.current === 'male' ? 'Меня зовут Максим, мужской голос.' : 'Меня зовут Татьяна, женский голос.'} Если вы слышите меня на русском языке, озвучка настроена правильно.`
    );
  }, [playTTS]);

  // Streaming-запрос к LLM — текст появляется по мере генерации
  const streamChat = useCallback(
    async (
      scenarioId: string,
      messages: DialogueMessage[],
      onDelta: (delta: string) => void
    ): Promise<{ fullText: string; dialogueEnd: boolean }> => {
      const startTime = Date.now();
      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, messages, carId: selectedCar?.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка чата');
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const fullText: string = data.response || '';
      const dialogueEnd: boolean = data.dialogueEnd || false;
      const chunks: string[] = data.chunks || [fullText];

      // Имитация streaming — выводим по слову с задержкой
      // Это даёт эффект "печатающего" клиента
      for (const chunk of chunks) {
        onDelta(chunk);
        // Небольшая задержка между словами — печатающий эффект
        await new Promise((r) => setTimeout(r, 30));
      }

      console.log(`[Stream] Total time: ${Date.now() - startTime}ms, chunks: ${chunks.length}`);

      return { fullText, dialogueEnd };
    },
    []
  );

  const handleStartCall = useCallback(async () => {
    if (!selectedScenario) {
      toast({
        title: 'Выберите сценарий',
        description: 'Сначала выберите тип клиента из списка слева.',
        variant: 'destructive',
      });
      return;
    }

    // Принудительно разблокируем audio прямо сейчас (пользователь кликнул кнопку)
    if (audioRef.current) {
      try {
        const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        audioRef.current.src = silentWav;
        audioRef.current.volume = 0;
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.volume = 1;
        audioRef.current.src = '';
        console.log('[Audio] Unlocked on Accept Call button');
      } catch (e) {
        console.warn('[Audio] Unlock on Accept Call failed:', e);
      }
    }

    setMessages([]);
    messagesRef.current = [];
    setFeedback(null);
    setShopperFeedback(null);
    setIsCallActive(true);
    isCallActiveRef.current = true;
    callStartRef.current = Date.now();

    setIsTyping(true);

    // Создаём пустое сообщение клиента — будем заполнять его по мере стриминга
    const clientMessageId = crypto.randomUUID();
    const clientMessage: Message = {
      id: clientMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages([clientMessage]);
    messagesRef.current = [clientMessage];

    try {
      const { fullText, dialogueEnd } = await streamChat(
        selectedScenario.id,
        [],
        (delta) => {
          // Обновляем содержимое сообщения в реальном времени
          setMessages((prev) =>
            prev.map((m) =>
              m.id === clientMessageId
                ? { ...m, content: m.content + delta }
                : m
            )
          );
        }
      );

      // Финальное обновление
      setMessages((prev) =>
        prev.map((m) =>
          m.id === clientMessageId ? { ...m, content: fullText } : m
        )
      );
      messagesRef.current = [{ ...clientMessage, content: fullText }];
      setIsTyping(false);

      if (ttsEnabled && fullText) {
        playTTS(fullText);
      }
    } catch (err) {
      console.error('Start call error:', err);
      toast({
        title: 'Ошибка звонка',
        description: err instanceof Error ? err.message : 'Не удалось начать звонок',
        variant: 'destructive',
      });
      setIsTyping(false);
      setIsCallActive(false);
      isCallActiveRef.current = false;
    }
  }, [selectedScenario, ttsEnabled, playTTS, streamChat]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      const scenario = selectedScenarioRef.current;
      const callActive = isCallActiveRef.current;
      if (!scenario || !callActive) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      const newMessages = [...messagesRef.current, userMessage];
      messagesRef.current = newMessages;
      setMessages(newMessages);
      setIsTyping(true);

      try {
        const dialogueHistory: DialogueMessage[] = newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Создаём пустое сообщение клиента для постепенного заполнения
        const clientMessageId = crypto.randomUUID();
        const clientMessage: Message = {
          id: clientMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };
        // Добавим пустое сообщение — оно будет заполняться по мере стриминга
        setMessages((prev) => [...prev, clientMessage]);

        const { fullText } = await streamChat(
          scenario.id,
          dialogueHistory,
          (delta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === clientMessageId
                  ? { ...m, content: m.content + delta }
                  : m
              )
            );
          }
        );

        // Финальное обновление
        const finalClientMessage = { ...clientMessage, content: fullText };
        messagesRef.current = [...newMessages, finalClientMessage];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === clientMessageId ? finalClientMessage : m
          )
        );
        setIsTyping(false);

        // Озвучка реплики клиента
        if (ttsEnabledRef.current && fullText) {
          playTTS(fullText);
        }
      } catch (err) {
        console.error('Send message error:', err);
        toast({
          title: 'Ошибка',
          description:
            err instanceof Error ? err.message : 'Не удалось отправить сообщение',
          variant: 'destructive',
        });
        setIsTyping(false);
      }
    },
    [playTTS, streamChat]
  );

  // Живой разговор: авто-отправка по паузе, half-duplex с TTS
  const liveConversation = useLiveConversation({
    onUserMessage: handleSendMessage,
    isBotSpeaking: isBotSpeaking || isTyping,
    silenceThreshold: 1500,
    minMessageLength: 3,
  });

  // Ошибки live-режима показываем тостом
  useEffect(() => {
    if (liveConversation.error) {
      toast({
        title: 'Ошибка микрофона',
        description: liveConversation.error,
        variant: 'destructive',
      });
    }
  }, [liveConversation.error]);

  // При активации live-режима — стартуем звонок, если ещё не активен
  const handleLiveStart = useCallback(async () => {
    if (!selectedScenario) {
      toast({
        title: 'Выберите сценарий',
        description: 'Сначала выберите тип клиента из списка слева.',
        variant: 'destructive',
      });
      return;
    }

    // Если звонок ещё не активен — инициализируем
    if (!isCallActive) {
      setMessages([]);
      messagesRef.current = [];
      setFeedback(null);
      setShopperFeedback(null);
      setIsCallActive(true);
      isCallActiveRef.current = true;
      callStartRef.current = Date.now();

      setIsTyping(true);

      // Создаём пустое сообщение клиента для стриминга
      const clientMessageId = crypto.randomUUID();
      const clientMessage: Message = {
        id: clientMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      setMessages([clientMessage]);
      messagesRef.current = [clientMessage];

      try {
        const { fullText } = await streamChat(
          selectedScenario.id,
          [],
          (delta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === clientMessageId
                  ? { ...m, content: m.content + delta }
                  : m
              )
            );
          }
        );

        const finalClientMessage = { ...clientMessage, content: fullText };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === clientMessageId ? finalClientMessage : m
          )
        );
        messagesRef.current = [finalClientMessage];
        setIsTyping(false);

        if (ttsEnabled && fullText) {
          playTTS(fullText);
        }
      } catch (err) {
        console.error('Live start error:', err);
        toast({
          title: 'Ошибка звонка',
          description: err instanceof Error ? err.message : 'Не удалось начать звонок',
          variant: 'destructive',
        });
        setIsTyping(false);
        setIsCallActive(false);
        isCallActiveRef.current = false;
        return;
      }
    }

    // Запускаем микрофон (после небольшой задержки, чтобы TTS стартовало)
    setTimeout(() => {
      liveConversation.start();
    }, 500);
  }, [selectedScenario, isCallActive, ttsEnabled, playTTS, liveConversation, streamChat]);

  const handleLiveStop = useCallback(() => {
    liveConversation.stop();
    stopTTS();
  }, [liveConversation, stopTTS]);

  const handleEndCall = useCallback(async () => {
    if (!isCallActive) return;
    liveConversation.stop();
    setIsCallActive(false);
    isCallActiveRef.current = false;
    setIsTyping(false);
    setIsProcessingVoice(false);

    stopTTS(); // Останавливаем любую озвучку клиента

    // Запрос обратной связи
    if (messages.length > 0 && selectedScenario) {
      setIsFeedbackLoading(true);
      try {
        const dialogueHistory: DialogueMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: selectedScenario.id,
            messages: dialogueHistory,
          }),
        });

        if (!res.ok) {
          throw new Error('Не удалось получить обратную связь');
        }

        const data = await res.json();
        setFeedback(data.feedback);
      } catch (err) {
        console.error('Feedback error:', err);
        toast({
          title: 'Ошибка анализа',
          description:
            err instanceof Error ? err.message : 'Не удалось проанализировать диалог',
          variant: 'destructive',
        });
      } finally {
        setIsFeedbackLoading(false);
      }
    }
  }, [isCallActive, messages, selectedScenario, stopTTS]);

  const handleReset = useCallback(() => {
    liveConversation.stop();
    setMessages([]);
    messagesRef.current = [];
    setFeedback(null);
    setShopperFeedback(null);
    setIsCallActive(false);
    isCallActiveRef.current = false;
    setIsTyping(false);
    setIsProcessingVoice(false);
    stopTTS();
  }, [stopTTS, liveConversation]);

  // Загрузка шопер-оценки
  const handleShopperLoad = useCallback(async () => {
    if (!selectedScenario || messagesRef.current.length === 0) return;

    setIsShopperLoading(true);
    try {
      const dialogueHistory = messagesRef.current.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/shopper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          messages: dialogueHistory,
        }),
      });

      if (!res.ok) {
        throw new Error('Не удалось получить оценку шопер');
      }

      const data = await res.json();
      setShopperFeedback(data.feedback);
    } catch (err) {
      console.error('Shopper error:', err);
      toast({
        title: 'Ошибка оценки шопер',
        description: err instanceof Error ? err.message : 'Не удалось оценить',
        variant: 'destructive',
      });
    } finally {
      setIsShopperLoading(false);
    }
  }, [selectedScenario]);

  const handleSelectScenario = (scenario: Scenario) => {
    if (isCallActive) {
      toast({
        title: 'Завершите текущий звонок',
        description: 'Сначала завершите текущий разговор, потом выберите новый сценарий.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedScenario(scenario);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/10">
      {/* Шапка */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">
                АвтоТренажёр
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Тренировка телефонных продаж китайских авто
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedScenario && (
              <Badge variant="outline" className="hidden md:flex">
                {selectedScenario.title}
              </Badge>
            )}
            {isCallActive ? (
              <>
                <Button
                  onClick={handleEndCall}
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  Завершить звонок
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Сбросить</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStartCall}
                disabled={!selectedScenario || isFeedbackLoading}
                size="sm"
                className="gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                {messages.length > 0 ? 'Начать заново' : 'Принять звонок'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Основная сетка */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-3 p-3 min-h-0 overflow-hidden">
        {/* Левая колонка — сценарии и каталог */}
        <div className="hidden lg:flex flex-col min-h-0">
          <Tabs
            value={leftTab}
            onValueChange={(v) => setLeftTab(v as 'scenarios' | 'catalog')}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="scenarios" className="text-xs gap-1">
                <Sparkles className="w-3 h-3" />
                Клиенты
              </TabsTrigger>
              <TabsTrigger value="catalog" className="text-xs gap-1">
                <Car className="w-3 h-3" />
                Авто
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="scenarios"
              className="flex-1 mt-2 min-h-0 overflow-hidden"
            >
              <ScenarioSelector
                selectedId={selectedScenario?.id}
                onSelect={handleSelectScenario}
                disabled={isCallActive}
              />
            </TabsContent>
            <TabsContent
              value="catalog"
              className="flex-1 mt-2 min-h-0 overflow-hidden"
            >
              <CarCatalog
                selectedCarId={selectedCar?.id}
                onSelectCar={setSelectedCar}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Мобильная версия левой колонки */}
        <div className="lg:hidden">
          <Tabs defaultValue="scenarios">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="scenarios" className="text-xs gap-1">
                <Sparkles className="w-3 h-3" />
                Клиенты ({scenarios.length})
              </TabsTrigger>
              <TabsTrigger value="catalog" className="text-xs gap-1">
                <Car className="w-3 h-3" />
                Авто
              </TabsTrigger>
            </TabsList>
            <TabsContent value="scenarios" className="mt-2">
              <ScenarioSelector
                selectedId={selectedScenario?.id}
                onSelect={handleSelectScenario}
                disabled={isCallActive}
              />
            </TabsContent>
            <TabsContent value="catalog" className="mt-2">
              <CarCatalog
                selectedCarId={selectedCar?.id}
                onSelectCar={setSelectedCar}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Центральная колонка — диалог */}
        <div className="hidden lg:flex flex-col min-h-0 gap-3">
          {/* Инфо о клиенте */}
          {selectedScenario && (
            <Card className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <span className="font-semibold text-accent-foreground">
                    {selectedScenario.customerName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">
                      {selectedScenario.customerName}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        selectedScenario.difficulty === 'Лёгкий'
                          ? 'bg-emerald-100 text-emerald-700'
                          : selectedScenario.difficulty === 'Средний'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {selectedScenario.difficulty}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {selectedScenario.customerProfile}
                  </p>
                  {selectedCar && (
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                      <Car className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-primary truncate">
                        {selectedCar.brand} {selectedCar.model}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                        {Math.round(selectedCar.priceFrom / 1000000 * 10) / 10}-{Math.round(selectedCar.priceTo / 1000000 * 10) / 10} млн ₽
                      </span>
                    </div>
                  )}
                </div>
                {isCallActive && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    На линии
                  </div>
                )}
              </div>
            </Card>
          )}

          <Dialogue
            messages={messages}
            scenario={selectedScenario}
            isTyping={isTyping}
            isProcessingVoice={isProcessingVoice}
          />

          <InputPanel
            onSendMessage={handleSendMessage}
            disabled={!isCallActive}
            isProcessing={isTyping}
            ttsEnabled={ttsEnabled}
            onToggleTts={() => setTtsEnabled(!ttsEnabled)}
            russianVoices={russianVoices}
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            hasRussianVoice={hasRussianVoice}
            onTestVoice={handleTestVoice}
            ttsMode={ttsMode}
            onTtsModeChange={setTtsMode}
            neuralVoice={neuralVoice}
            onNeuralVoiceChange={setNeuralVoice}
            liveMode={{
              isActive: liveConversation.isActive,
              isListening: liveConversation.isListening,
              isBotSpeaking: isBotSpeaking,
              isProcessing: isTyping,
              currentTranscript: liveConversation.currentTranscript,
              onStart: handleLiveStart,
              onStop: handleLiveStop,
            }}
          />
        </div>

        {/* Мобильная версия центра */}
        <div className="lg:hidden flex flex-col min-h-0 gap-2">
          {selectedScenario && (
            <Card className="p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <span className="font-semibold text-sm text-accent-foreground">
                    {selectedScenario.customerName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs">
                    {selectedScenario.customerName}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {selectedScenario.customerProfile}
                  </p>
                </div>
                {isCallActive && (
                  <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    На линии
                  </span>
                )}
              </div>
            </Card>
          )}

          <div className="flex-1 min-h-[300px]">
            <Dialogue
              messages={messages}
              scenario={selectedScenario}
              isTyping={isTyping}
              isProcessingVoice={isProcessingVoice}
            />
          </div>

          <InputPanel
            onSendMessage={handleSendMessage}
            disabled={!isCallActive}
            isProcessing={isTyping}
            ttsEnabled={ttsEnabled}
            onToggleTts={() => setTtsEnabled(!ttsEnabled)}
            russianVoices={russianVoices}
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            hasRussianVoice={hasRussianVoice}
            onTestVoice={handleTestVoice}
            ttsMode={ttsMode}
            onTtsModeChange={setTtsMode}
            neuralVoice={neuralVoice}
            onNeuralVoiceChange={setNeuralVoice}
            liveMode={{
              isActive: liveConversation.isActive,
              isListening: liveConversation.isListening,
              isBotSpeaking: isBotSpeaking,
              isProcessing: isTyping,
              currentTranscript: liveConversation.currentTranscript,
              onStart: handleLiveStart,
              onStop: handleLiveStop,
            }}
          />
        </div>

        {/* Правая колонка — обратная связь / справка */}
        <div className="hidden lg:flex flex-col min-h-0">
          {!isCallActive && !feedback && messages.length === 0 ? (
            <Card className="h-full">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Как тренироваться</h3>
                </div>
                <ol className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">1.</span>
                    <span>
                      Выберите <b>тип клиента</b> слева — каждый со своим
                      характером и целью звонка.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">2.</span>
                    <span>
                      Нажмите <b>«Принять звонок»</b> — клиент позвонит вам
                      и задаст первый вопрос.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">3.</span>
                    <span>
                      Выберите режим ответа в панели ввода:
                      <br />
                      <b>Текст</b> — печатаете вручную.
                      <br />
                      <b>Голос</b> — нажмите кнопку, скажите фразу, отправьте.
                      <br />
                      <b>Живой</b> — говорите без кнопок! Замолчите на 1.5 сек —
                      ответ отправится сам. Бот отвечает голосом.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">4.</span>
                    <span>
                      Озвучка реплик клиента — на русском. Два режима:
                      <br />
                      <b>Нейро</b> (по умолчанию) — Microsoft Edge TTS, голоса
                      как у живого человека. Можно выбрать мужской (Дмитрий) или
                      женский (Светлана).
                      <br />
                      <b>ОС</b> — голоса из операционной системы (работает офлайн).
                      <br />
                      Переключайте «Нейро/ОС» и «♂/♀» в панели ввода.
                      Нажмите «Тест», чтобы услышать, как звучит.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">5.</span>
                    <span>
                      Используйте <b>каталог авто</b> слева — там модели, цены,
                      характеристики китайских брендов.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">6.</span>
                    <span>
                      Когда закончите разговор — нажмите <b>«Завершить звонок»</b>,
                      и справа появится <b>разбор по 8 критериям</b>.
                    </span>
                  </li>
                </ol>
                <div className="pt-3 border-t border-border">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Бот играет роль реального клиента и не подсказывает.
                    Цель — провести звонок так, чтобы записать клиента на
                    тест-драйв или визит в салон.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">
                    <b>Важно:</b> для голосового режима нужен Chrome, Edge или
                    Yandex.Browser с доступом к микрофону.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">
                    <b>Озвучка клиента:</b> используйте кнопку «Тест» рядом с
                    выбором голоса, чтобы убедиться, что звучит по-русски.
                    Если русских голосов нет — установите их в настройках ОС
                    (Windows: Параметры → Речь).
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <FeedbackPanel
              feedback={feedback}
              isLoading={isFeedbackLoading}
              shopperFeedback={shopperFeedback}
              isShopperLoading={isShopperLoading}
              onShopperLoad={handleShopperLoad}
              messages={messages.map(m => ({ role: m.role, content: m.content }))}
              scenarioId={selectedScenario?.id}
            />
          )}
        </div>

        {/* Мобильная версия правой колонки */}
        <div className="lg:hidden">
          {feedback || isFeedbackLoading ? (
            <FeedbackPanel
              feedback={feedback}
              isLoading={isFeedbackLoading}
              shopperFeedback={shopperFeedback}
              isShopperLoading={isShopperLoading}
              onShopperLoad={handleShopperLoad}
              messages={messages.map(m => ({ role: m.role, content: m.content }))}
              scenarioId={selectedScenario?.id}
            />
          ) : null}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
