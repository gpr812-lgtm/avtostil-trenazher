'use client';

import { useState, useRef, useCallback } from 'react';
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
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [leftTab, setLeftTab] = useState<'scenarios' | 'catalog'>('scenarios');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callStartRef = useRef<number>(0);

  const handleStartCall = useCallback(async () => {
    if (!selectedScenario) {
      toast({
        title: 'Выберите сценарий',
        description: 'Сначала выберите тип клиента из списка слева.',
        variant: 'destructive',
      });
      return;
    }

    setMessages([]);
    setFeedback(null);
    setIsCallActive(true);
    callStartRef.current = Date.now();

    // Отправляем стартовую реплику клиента
    setIsTyping(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          messages: [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка при инициации звонка');
      }

      const data = await res.json();
      const clientMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };
      setMessages([clientMessage]);
      setIsTyping(false);

      if (ttsEnabled) {
        playTTS(data.response);
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
    }
  }, [selectedScenario, ttsEnabled]);

  const playTTS = async (text: string) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!selectedScenario || !isCallActive) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsTyping(true);

      try {
        const dialogueHistory: DialogueMessage[] = newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: selectedScenario.id,
            messages: dialogueHistory,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Ошибка при отправке сообщения');
        }

        const data = await res.json();
        const clientMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, clientMessage]);
        setIsTyping(false);

        // Не завершаем автоматически — пусть продавец сам завершит звонок
        // Если есть маркер — показываем подсказку, что клиент готов положить трубку
        if (ttsEnabled) {
          playTTS(data.response);
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
    [selectedScenario, isCallActive, messages, ttsEnabled]
  );

  const handleEndCall = useCallback(async () => {
    if (!isCallActive) return;
    setIsCallActive(false);
    setIsTyping(false);
    setIsProcessingVoice(false);

    if (audioRef.current) {
      audioRef.current.pause();
    }

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
  }, [isCallActive, messages, selectedScenario]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setFeedback(null);
    setIsCallActive(false);
    setIsTyping(false);
    setIsProcessingVoice(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

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
                      Отвечайте <b>текстом</b> или <b>голосом</b> (микрофон).
                      Можно включить озвучку клиента.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">4.</span>
                    <span>
                      Используйте <b>каталог авто</b> слева — там модели, цены,
                      характеристики китайских брендов.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">5.</span>
                    <span>
                      Когда клиент положит трубку — справа появится
                      <b> разбор по 8 критериям</b> с оценкой и рекомендациями.
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
          ) : (
            <FeedbackPanel feedback={feedback} isLoading={isFeedbackLoading} />
          )}
        </div>

        {/* Мобильная версия правой колонки */}
        <div className="lg:hidden">
          {feedback || isFeedbackLoading ? (
            <FeedbackPanel feedback={feedback} isLoading={isFeedbackLoading} />
          ) : null}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
