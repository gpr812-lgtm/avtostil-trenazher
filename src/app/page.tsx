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
  Lightbulb,
  GraduationCap,
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
import { SoundEffects } from '@/components/sound-effects';
import { SellerTips } from '@/components/seller-tips';
import { HistoryPanel, saveTrainingRecord } from '@/components/training-history';
import { IdealReply } from '@/components/ideal-reply';
import { StageIndicator } from '@/components/stage-indicator';
import { markScenarioCompleted } from '@/components/scenario-progress';
import { CoachMode } from '@/components/coach-mode';
import { FeedbackTimeline } from '@/components/feedback-timeline';

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
  const [neuralVoice, setNeuralVoice] = useState<'male'>('male');
  const [isNeuralPlaying, setIsNeuralPlaying] = useState(false);
  const [leftTab, setLeftTab] = useState<'scenarios' | 'catalog'>('scenarios');
  const [mobileTab, setMobileTab] = useState<'customer' | 'call' | 'review'>('customer');
  const [callDuration, setCallDuration] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [coachEnabled, setCoachEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callStartRef = useRef<number>(0);

  // Форматирование длительности звонка
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Таймер звонка
  useEffect(() => {
    if (!isCallActive) { setCallDuration(0); return; }
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCallActive]);

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
  const neuralVoiceRef = useRef<'male'>('male');

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

  // Нейронный TTS — Edge TTS
  // ♂ Мужской: aidar (настоящий мужской русский голос)
  // 
  const playNeuralTTS = useCallback(
    (text: string) => {
      cancelTTS();
      setIsNeuralPlaying(true);
      console.log(`[TTS-Neural] Fetching: "${text.slice(0, 50)}..."`);

      // Timeout — если TTS не ответил за 6 сек, fallback на SpeechSynthesis
      // (было 15 сек — слишком долго, пользователь ждал)
      const ttsTimeout = setTimeout(() => {
        console.warn('[TTS-Neural] Timeout — fallback to SpeechSynthesis');
        setIsNeuralPlaying(false);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'ru-RU';
          u.rate = 0.95;
          u.pitch = 0.85; // мужской тембр
          // Ищем МУЖСКОЙ русский голос
          const voices = window.speechSynthesis.getVoices();
          const maleNames = ['pavel', 'yuri', 'yuriy', 'maxim', 'dmitry', 'dmitrii', 'nikolay', 'alexandr', 'sergey', 'andrey'];
          let ruVoice: SpeechSynthesisVoice | null | undefined = null;
          for (const name of maleNames) {
            const match = voices.find(v => v.lang.toLowerCase().startsWith('ru') && v.name.toLowerCase().includes(name));
            if (match) { ruVoice = match; break; }
          }
          // Если мужской не нашли — берём любой русский
          if (!ruVoice) ruVoice = voices.find(v => v.lang.toLowerCase().startsWith('ru'));
          if (ruVoice) u.voice = ruVoice;
          u.onstart = () => setIsNeuralPlaying(true);
          u.onend = () => setIsNeuralPlaying(false);
          u.onerror = () => setIsNeuralPlaying(false);
          window.speechSynthesis.speak(u);
        }
      }, 6000);

      fetch('/api/tts-wav?text=' + encodeURIComponent(text))
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then(async (blob) => {
          clearTimeout(ttsTimeout);
          console.log(`[TTS-Neural] Got audio: ${blob.size} bytes`);

          // === Web Audio API (приоритет) — переживает async fetch ===
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const w = window as any;
            if (!w.__audioCtx) {
              w.__audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const audioCtx: AudioContext = w.__audioCtx;
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
            }
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            // Останавливаем предыдущий source
            if (w.__ttsSource) {
              try { w.__ttsSource.stop(); } catch {}
              try { w.__ttsSource.disconnect(); } catch {}
            }

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            w.__ttsSource = source;

            await new Promise<void>((resolve) => {
              source.onended = () => {
                setIsNeuralPlaying(false);
                try { source.disconnect(); } catch {}
                if (w.__ttsSource === source) w.__ttsSource = null;
                console.log('[TTS-Neural] ▶ Web Audio playback ended');
                resolve();
              };
              try {
                source.start();
                console.log('[TTS-Neural] ▶ Web Audio playing — мужской голос Дмитрий');
              } catch (e: any) {
                console.warn('[TTS-Neural] source.start() failed:', e?.message);
                setIsNeuralPlaying(false);
                resolve();
              }
            });
          } catch (webAudioErr) {
            // === Fallback: HTML5 Audio ===
            console.warn('[TTS-Neural] Web Audio failed, fallback to HTML5:', webAudioErr instanceof Error ? webAudioErr.message : webAudioErr);
            const url = URL.createObjectURL(blob);
            const audio = audioRef.current || new Audio();
            audio.src = url;
            audio.volume = 1;
            audio.onended = () => { setIsNeuralPlaying(false); URL.revokeObjectURL(url); };
            audio.onerror = () => { setIsNeuralPlaying(false); URL.revokeObjectURL(url); };
            audio.play().catch(() => setIsNeuralPlaying(false));
          }
        })
        .catch((err) => {
          clearTimeout(ttsTimeout);
          console.error('[TTS-Neural] Error:', err);
          setIsNeuralPlaying(false);
          // Fallback на системный мужской голос
          if ('speechSynthesis' in window) {
            console.log('[TTS-Neural] Fallback to SpeechSynthesis (male)');
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'ru-RU';
            u.rate = 0.95;
            u.pitch = 0.85;
            const voices = window.speechSynthesis.getVoices();
            const maleNames = ['pavel', 'yuri', 'yuriy', 'maxim', 'dmitry', 'dmitrii', 'nikolay', 'alexandr', 'sergey', 'andrey'];
            let ruVoice: SpeechSynthesisVoice | null | undefined = null;
            for (const name of maleNames) {
              const match = voices.find(v => v.lang.toLowerCase().startsWith('ru') && v.name.toLowerCase().includes(name));
              if (match) { ruVoice = match; break; }
            }
            if (!ruVoice) ruVoice = voices.find(v => v.lang.toLowerCase().startsWith('ru'));
            if (ruVoice) u.voice = ruVoice;
            u.onstart = () => setIsNeuralPlaying(true);
            u.onend = () => setIsNeuralPlaying(false);
            u.onerror = () => setIsNeuralPlaying(false);
            window.speechSynthesis.speak(u);
          }
        });
    },
    [cancelTTS]
  );

  // Универсальная функция озвучки: всегда нейронный (Edge TTS)
  const playTTS = useCallback(
    (text: string) => {
      playNeuralTTS(text);
    },
    [playNeuralTTS]
  );

  // === PREWARM TTS ===
  // Предзагрузка аудио: запускаем fetch TTS сразу как только есть текст,
  // не дожидаясь окончания стриминга. Когда playTTS вызовут — аудио уже готово.
  const prewarmTTSCache = useRef<Map<string, Promise<Blob>>>(new Map());
  const prewarmTTS = useCallback((text: string) => {
    if (!text || text.length < 5) return;
    // Уже загружается?
    if (prewarmTTSCache.current.has(text)) return;
    // Ограничиваем кеш 5 элементами
    if (prewarmTTSCache.current.size >= 5) {
      const firstKey = prewarmTTSCache.current.keys().next().value;
      if (firstKey) prewarmTTSCache.current.delete(firstKey);
    }
    console.log(`[TTS-Prewarm] Starting: "${text.slice(0, 40)}..."`);
    const promise = fetch('/api/tts-wav?text=' + encodeURIComponent(text))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .catch((err) => {
        console.warn('[TTS-Prewarm] failed:', err);
        // Удаляем из кеша чтобы можно было повторить
        prewarmTTSCache.current.delete(text);
        throw err;
      });
    prewarmTTSCache.current.set(text, promise);
  }, []);

  // Воспроизведение с prewarm: если аудио уже в кеше — играем сразу
  const playTTSWithPrewarm = useCallback(
    (text: string) => {
      cancelTTS();
      setIsNeuralPlaying(true);
      console.log(`[TTS-Play] "${text.slice(0, 50)}..."`);

      const cached = prewarmTTSCache.current.get(text);
      if (cached) {
        // Аудио уже загружается/загружено — играем сразу когда готово
        console.log('[TTS-Play] Using prewarmed audio');
        cached
          .then(async (blob) => {
            console.log(`[TTS-Play] Prewarmed blob: ${blob.size} bytes`);
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const w = window as any;
              if (!w.__audioCtx) {
                w.__audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              const audioCtx: AudioContext = w.__audioCtx;
              if (audioCtx.state === 'suspended') await audioCtx.resume();
              const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

              if (w.__ttsSource) {
                try { w.__ttsSource.stop(); } catch {}
                try { w.__ttsSource.disconnect(); } catch {}
              }

              const source = audioCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioCtx.destination);
              w.__ttsSource = source;

              await new Promise<void>((resolve) => {
                source.onended = () => {
                  setIsNeuralPlaying(false);
                  try { source.disconnect(); } catch {}
                  if (w.__ttsSource === source) w.__ttsSource = null;
                  resolve();
                };
                try { source.start(); } catch (e) {
                  console.warn('[TTS-Play] start failed:', e);
                  setIsNeuralPlaying(false);
                  resolve();
                }
              });
            } catch (err) {
              console.warn('[TTS-Play] Web Audio failed, fallback to HTML5:', err);
              const url = URL.createObjectURL(blob);
              const audio = audioRef.current || new Audio();
              audio.src = url;
              audio.volume = 1;
              audio.onended = () => { setIsNeuralPlaying(false); URL.revokeObjectURL(url); };
              audio.onerror = () => { setIsNeuralPlaying(false); URL.revokeObjectURL(url); };
              audio.play().catch(() => setIsNeuralPlaying(false));
            }
          })
          .catch(() => {
            // Prewarm не сработал — обычный playNeuralTTS
            playNeuralTTS(text);
          });
      } else {
        // Нет в кеше — обычный playNeuralTTS
        playNeuralTTS(text);
      }
    },
    [cancelTTS, playNeuralTTS]
  );

  // Остановить любую озвучку
  const stopTTS = useCallback(() => {
    // Web Audio
    try {
      const w = window as any;
      if (w.__ttsSource) { try { w.__ttsSource.stop(); } catch {} try { w.__ttsSource.disconnect(); } catch {} w.__ttsSource = null; }
    } catch {}
    // HTML5 Audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
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
      `Здравствуйте! Это тестовое сообщение. Меня зовут Дмитрий, мужской голос. Если вы слышите меня на русском языке, озвучка настроена правильно.`
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

      if (!res.body) {
        throw new Error('Нет тела ответа от сервера');
      }

      // Читаем SSE-стрим
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let dialogueEnd = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.delta) {
              fullText += data.delta;
              onDelta(fullText);
            } else if (data.done) {
              fullText = data.fullText || fullText;
              dialogueEnd = data.dialogueEnd || false;
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            // Игнорируем битые строки
          }
        }
      }

      console.log(`[Stream] Total time: ${Date.now() - startTime}ms, length: ${fullText.length}`);

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
    setMobileTab('call'); // Переключаемся на вкладку "Звонок"

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
          // PREWARM TTS: когда текст достаточно длинный и заканчивается на знак препинания,
          // запускаем загрузку аудио параллельно со стримингом
          if (ttsEnabled && delta.length > 30 && /[.?!]\s*$/.test(delta)) {
            prewarmTTS(delta);
          }
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
        // Используем prewarm — аудио уже могло загрузиться во время стриминга
        playTTSWithPrewarm(fullText);
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
  }, [selectedScenario, ttsEnabled, playTTSWithPrewarm, prewarmTTS, streamChat]);

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
            // delta = ПОЛНЫЙ накопленный текст, заменяем содержимое
            setMessages((prev) =>
              prev.map((m) =>
                m.id === clientMessageId ? { ...m, content: delta } : m
              )
            );
            // PREWARM TTS: запускаем загрузку аудио до окончания стриминга
            if (ttsEnabledRef.current && delta.length > 30 && /[.?!]\s*$/.test(delta)) {
              prewarmTTS(delta);
            }
          }
        );

        const finalClientMessage = { ...clientMessage, content: fullText };
        messagesRef.current = [...newMessages, finalClientMessage];
        setIsTyping(false);

        // Озвучка реплики клиента (с prewarm — быстрее)
        if (ttsEnabledRef.current && fullText) {
          playTTSWithPrewarm(fullText);
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
    [playTTSWithPrewarm, prewarmTTS, streamChat]
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

  // === АВТОЗАПУСК МИКРОФОНА ===
  // Запускаем микрофон когда звонок активен и бот НЕ говорит
  const autoLiveStartedRef = useRef(false);
  useEffect(() => {
    if (isCallActive && !isBotSpeaking && !isTyping) {
      // Всегда пытаемся запустить микрофон когда бот замолчал
      const t = setTimeout(() => {
        if (isCallActive && !isBotSpeaking && !isTyping) {
          try {
            if (!liveConversation.isActive) {
              liveConversation.start();
              console.log('[AutoLive] Microphone started (was not active)');
            } else if (!liveConversation.isListening) {
              liveConversation.start();
              console.log('[AutoLive] Microphone re-started (was not listening)');
            }
          } catch (e) {
            console.warn('[AutoLive] Mic start failed:', e);
          }
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isCallActive, isBotSpeaking, isTyping, liveConversation]);

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
            // PREWARM TTS
            if (ttsEnabled && delta.length > 30 && /[.?!]\s*$/.test(delta)) {
              prewarmTTS(delta);
            }
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
          playTTSWithPrewarm(fullText);
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
  }, [selectedScenario, isCallActive, ttsEnabled, playTTSWithPrewarm, prewarmTTS, liveConversation, streamChat]);

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

    // Сразу переключаемся на вкладку "Разбор" на мобильных
    setMobileTab('review');

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

        // Сохраняем в историю и отмечаем сценарий пройденным
        if (data.feedback) {
          const carName = selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : 'Не выбрано';
          const score = data.feedback.totalScore || 0;
          saveTrainingRecord({
            id: crypto.randomUUID(),
            date: Date.now(),
            scenarioTitle: selectedScenario.title,
            customerName: selectedScenario.customerName,
            carName,
            totalScore: score,
            duration: callDuration,
            outcome: data.feedback.outcome || 'no_close',
            summary: data.feedback.summary || '',
          });
          markScenarioCompleted(selectedScenario.id, score);
        }
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
    <div className="h-dvh flex flex-col bg-gradient-to-br from-background via-background to-accent/10 overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Шапка */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">
                Автостиль
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                проект Тюрина М. В.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedScenario && (
              <Badge variant="outline" className="hidden md:flex">
                {selectedScenario.title}
              </Badge>
            )}
            {/* Тумблеры: подсказки и коуч */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-lg">
              <button
                onClick={() => setTipsEnabled(p => !p)}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${tipsEnabled ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'text-muted-foreground'}`}
                title="Подсказки продавцу"
              >
                <Lightbulb className="w-3 h-3" />
                <span className="hidden md:inline">Подсказки</span>
              </button>
              <button
                onClick={() => setCoachEnabled(p => !p)}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${coachEnabled ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-muted-foreground'}`}
                title="Режим коуча"
              >
                <GraduationCap className="w-3 h-3" />
                <span className="hidden md:inline">Коуч</span>
              </button>
            </div>
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-2 sm:gap-3 p-2 sm:p-3 min-h-0 overflow-hidden">
        {/* Левая колонка — сценарии и каталог */}
        <div className="hidden lg:flex flex-col min-h-0 overflow-hidden border border-border rounded-lg bg-card">
          <Tabs
            value={leftTab}
            onValueChange={(v) => setLeftTab(v as 'scenarios' | 'catalog')}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid grid-cols-2 w-full flex-shrink-0 rounded-none border-b border-border">
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
              className="flex-1 mt-0 min-h-0 overflow-hidden"
            >
              <ScenarioSelector
                selectedId={selectedScenario?.id}
                onSelect={handleSelectScenario}
                disabled={isCallActive}
              />
            </TabsContent>
            <TabsContent
              value="catalog"
              className="flex-1 mt-0 min-h-0 overflow-hidden"
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
            isBotSpeaking={isBotSpeaking}
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
        {/* === МОБИЛЬНАЯ ВЕРСИЯ: 3 ВКЛАДКИ === */}
        <div className="lg:hidden flex-1 flex flex-col min-h-0 gap-1 overflow-hidden">
          <Tabs defaultValue="customer" className="flex-1 flex flex-col min-h-0" value={mobileTab} onValueChange={(v) => setMobileTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full flex-shrink-0 h-9">
              <TabsTrigger value="customer" className="text-[11px] sm:text-xs px-1">Клиент</TabsTrigger>
              <TabsTrigger value="call" className="text-[11px] sm:text-xs px-1">Звонок</TabsTrigger>
              <TabsTrigger value="review" className="text-[11px] sm:text-xs px-1">Разбор</TabsTrigger>
            </TabsList>

            {/* Вкладка: Клиент — с прокруткой */}
            <TabsContent value="customer" className="flex-1 mt-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <Tabs defaultValue="scenarios">
                <TabsList className="grid grid-cols-2 w-full sticky top-0 z-10 bg-background">
                  <TabsTrigger value="scenarios" className="text-xs">Клиенты ({scenarios.length})</TabsTrigger>
                  <TabsTrigger value="catalog" className="text-xs">Авто</TabsTrigger>
                </TabsList>
                <TabsContent value="scenarios" className="mt-1">
                  <ScenarioSelector
                    selectedId={selectedScenario?.id}
                    onSelect={handleSelectScenario}
                    disabled={isCallActive}
                  />
                </TabsContent>
                <TabsContent value="catalog" className="mt-1">
                  <CarCatalog
                    selectedCarId={selectedCar?.id}
                    onSelectCar={setSelectedCar}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Вкладка: Звонок — чат занимает максимум места */}
            <TabsContent value="call" className="flex-1 mt-1 min-h-0 flex flex-col gap-1 overflow-hidden">
              {/* Индикатор этапов разговора */}
              <StageIndicator
                messages={messages.map(m => ({ role: m.role, content: m.content }))}
                isCallActive={isCallActive}
              />
              {selectedScenario && (
                <Card className="p-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-xs text-accent-foreground">
                        {selectedScenario.customerName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate">{selectedScenario.customerName}</div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{selectedScenario.customerProfile}</p>
                    </div>
                    {isCallActive && (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 flex-shrink-0">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        {formatDuration(callDuration)}
                      </span>
                    )}
                  </div>
                </Card>
              )}
              {/* Чат — flex-1 чтобы занять всё доступное место */}
              <div className="flex-1 min-h-0">
                <Dialogue
                  messages={messages}
                  scenario={selectedScenario}
                  isTyping={isTyping}
                  isProcessingVoice={isProcessingVoice}
                  isBotSpeaking={isBotSpeaking}
                />
              </div>
              {/* Панель ввода — внизу */}
              <div className="flex-shrink-0">
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
            </TabsContent>

            {/* Вкладка: Разбор — с прокруткой */}
            <TabsContent value="review" className="flex-1 mt-1 min-h-0 overflow-y-auto overflow-x-hidden">
              {feedback || isFeedbackLoading ? (
                <div className="space-y-3 pb-4">
                  <FeedbackPanel
                    feedback={feedback}
                    isLoading={isFeedbackLoading}
                    shopperFeedback={shopperFeedback}
                    isShopperLoading={isShopperLoading}
                    onShopperLoad={handleShopperLoad}
                    messages={messages.map(m => ({ role: m.role, content: m.content }))}
                    scenarioId={selectedScenario?.id}
                  />
                  {/* Таймлайн обратной связи */}
                  {feedback && !isFeedbackLoading && (
                    <FeedbackTimeline
                      messages={messages.map(m => ({ role: m.role, content: m.content }))}
                      scenarioId={selectedScenario?.id || ''}
                      totalScore={feedback.totalScore || 0}
                      summary={feedback.summary || ''}
                      outcome={feedback.outcome || ''}
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Здесь будет разбор звонка и оценка после завершения разговора.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
                </div>
              </div>
            </Card>
          ) : feedback || isFeedbackLoading ? (
            <FeedbackPanel
              feedback={feedback}
              isLoading={isFeedbackLoading}
              shopperFeedback={shopperFeedback}
              isShopperLoading={isShopperLoading}
              onShopperLoad={handleShopperLoad}
              messages={messages.map(m => ({ role: m.role, content: m.content }))}
              scenarioId={selectedScenario?.id}
            />
          ) : (
            <FeedbackPanel
              feedback={null}
              isLoading={false}
              shopperFeedback={null}
              isShopperLoading={false}
              onShopperLoad={handleShopperLoad}
              messages={messages.map(m => ({ role: m.role, content: m.content }))}
              scenarioId={selectedScenario?.id}
            />
          )}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />

      {/* Звуковые эффекты — звонок, фон, уведомления */}
      <SoundEffects
        isCallActive={isCallActive}
        isBotSpeaking={isBotSpeaking}
        hasNewMessage={messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'}
        callEnded={!isCallActive && messages.length > 0 && !!feedback}
      />

      {/* Подсказки продавцу — только если включены */}
      {tipsEnabled && (
        <SellerTips
          messages={messages.map(m => ({ role: m.role, content: m.content }))}
          isCallActive={isCallActive}
          isBotSpeaking={isBotSpeaking || isTyping}
        />
      )}

      {/* Идеальный ответ — показывает как надо было ответить */}
      {isCallActive && messages.length >= 2 && (() => {
        const lastClient = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
        const lastSeller = [...messages].reverse().find(m => m.role === 'user' && m.content);
        if (!lastClient || !lastSeller) return null;
        return (
          <IdealReply
            sellerMessage={lastSeller.content}
            clientMessage={lastClient.content}
            scenarioId={selectedScenario?.id || ''}
            callActive={isCallActive}
          />
        );
      })()}

      {/* Коуч — останавливает диалог с советом — только если включён */}
      {coachEnabled && (
        <CoachMode
          messages={messages.map(m => ({ role: m.role, content: m.content }))}
          isCallActive={isCallActive}
          onContinue={() => {}}
        />
      )}

      {/* История тренировок */}
      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}
