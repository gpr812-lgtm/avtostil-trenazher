'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Square, Volume2, VolumeX, Loader2, ChevronDown, Phone, PhoneOff, Sparkles, Cpu } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { toast } from '@/hooks/use-toast';

interface LiveModeProps {
  isActive: boolean;
  isListening: boolean;
  isBotSpeaking: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  onStart: () => void;
  onStop: () => void;
}

interface InputPanelProps {
  onSendMessage: (text: string) => void;
  disabled: boolean;
  isProcessing: boolean;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  russianVoices?: SpeechSynthesisVoice[];
  selectedVoice?: SpeechSynthesisVoice | null;
  onSelectVoice?: (voice: SpeechSynthesisVoice) => void;
  hasRussianVoice?: boolean;
  onTestVoice?: () => void;
  liveMode?: LiveModeProps;
  ttsMode?: 'neural' | 'system';
  onTtsModeChange?: (mode: 'neural' | 'system') => void;
  neuralVoice?: 'male' | 'female';
  onNeuralVoiceChange?: (voice: 'male' | 'female') => void;
}

export function InputPanel({
  onSendMessage,
  disabled,
  isProcessing,
  ttsEnabled,
  onToggleTts,
  russianVoices = [],
  selectedVoice = null,
  onSelectVoice,
  hasRussianVoice = true,
  onTestVoice,
  liveMode,
  ttsMode = 'neural',
  onTtsModeChange,
  neuralVoice = 'male',
  onNeuralVoiceChange,
}: InputPanelProps) {
  const [mode, setMode] = useState<'text' | 'voice' | 'live'>('text');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [text, setText] = useState('');
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: asrSupported,
    error: asrError,
  } = useSpeechRecognition();
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Реф для финального текста (чтобы был доступен в handleStopRec)
  const finalTranscriptRef = useRef('');

  // Показываем ошибки ASR
  useEffect(() => {
    if (asrError) {
      toast({
        title: 'Распознавание речи',
        description: asrError,
        variant: 'destructive',
      });
    }
  }, [asrError]);

  // Таймер записи — setState только в callback setInterval
  useEffect(() => {
    if (!isListening) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Синхронизируем ref с transcript
  useEffect(() => {
    finalTranscriptRef.current = transcript;
  }, [transcript]);

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText('');
    resetTranscript();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleStartRec = () => {
    if (!asrSupported) {
      toast({
        title: 'Браузер не поддерживается',
        description: 'Для голосового ввода используйте Chrome, Edge или Yandex.Browser.',
        variant: 'destructive',
      });
      return;
    }
    setText('');
    setSeconds(0);
    resetTranscript();
    startListening();
  };

  const handleStopRec = () => {
    stopListening();
    // Авто-отправка, если есть распознанный текст
    setTimeout(() => {
      const finalText = (finalTranscriptRef.current || transcript || '').trim();
      if (finalText) {
        onSendMessage(finalText);
        setText('');
        resetTranscript();
      } else {
        toast({
          title: 'Речь не распознана',
          description: 'Попробуйте говорить чётче и громче.',
          variant: 'destructive',
        });
      }
    }, 300);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="p-3 space-y-2">
        {/* Переключатель режима + TTS */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setMode('text')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                mode === 'text'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Текст
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                mode === 'voice'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Голос
              {!asrSupported && (
                <span className="text-[10px] text-rose-500">(?)</span>
              )}
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                mode === 'live'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Живой разговор: говорите и слушайте без нажатия кнопок"
            >
              <Phone className="w-3 h-3" />
              Живой
              {!asrSupported && (
                <span className="text-[10px] text-rose-500">(?)</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleTts}
              disabled={disabled}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              title={ttsEnabled ? 'Выключить озвучку клиента' : 'Включить озвучку клиента'}
            >
              {ttsEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {ttsEnabled ? 'Озвучка вкл' : 'Озвучка выкл'}
              </span>
            </button>

            {/* Переключатель режима TTS: нейронный / системный */}
            {ttsEnabled && onTtsModeChange && (
              <div className="flex items-center gap-0.5 bg-muted/70 rounded-md p-0.5">
                <button
                  onClick={() => onTtsModeChange('neural')}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${
                    ttsMode === 'neural'
                      ? 'bg-card text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Нейронный голос (Google) — звучит как живой человек, нужен интернет"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="hidden sm:inline">Нейро</span>
                </button>
                <button
                  onClick={() => onTtsModeChange('system')}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${
                    ttsMode === 'system'
                      ? 'bg-card text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Системный голос — голоса из ОС, работает офлайн"
                >
                  <Cpu className="w-3 h-3" />
                  <span className="hidden sm:inline">ОС</span>
                </button>
              </div>
            )}

            {/* Выбор мужской/женский — только для нейронного режима */}
            {ttsEnabled && ttsMode === 'neural' && onNeuralVoiceChange && (
              <div className="flex items-center gap-0.5 bg-muted/70 rounded-md p-0.5">
                <button
                  onClick={() => onNeuralVoiceChange('male')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${
                    neuralVoice === 'male'
                      ? 'bg-card text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Мужской голос (Дмитрий)"
                >
                  <span className="hidden sm:inline">♂ Муж</span>
                  <span className="sm:hidden">М</span>
                </button>
                <button
                  onClick={() => onNeuralVoiceChange('female')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${
                    neuralVoice === 'female'
                      ? 'bg-card text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Женский голос (Светлана)"
                >
                  <span className="hidden sm:inline">♀ Жен</span>
                  <span className="sm:hidden">Ж</span>
                </button>
              </div>
            )}

            {/* Выбор голоса — только для системного режима */}
            {ttsEnabled && ttsMode === 'system' && (
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                    disabled={disabled}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors px-2 py-1 rounded-md hover:bg-muted"
                    title="Выбрать голос"
                  >
                    <span className="max-w-[120px] truncate">
                      {selectedVoice?.name || (hasRussianVoice ? 'Русский голос' : 'Нет русского!')}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showVoiceSelector && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowVoiceSelector(false)}
                      />
                      {/* Dropdown */}
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[240px] max-h-[260px] overflow-y-auto scrollbar-thin">
                        {russianVoices.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground">
                            <p className="font-medium text-rose-600 mb-2">
                              Русский голос не найден
                            </p>
                            <p className="leading-relaxed">
                              Установите русский голос в настройках ОС:
                            </p>
                            <ul className="mt-1.5 space-y-1">
                              <li><b>Windows:</b> Параметры → Время и язык → Речь → Добавить голоса</li>
                              <li><b>macOS:</b> Системные настройки → Универсальный доступ → Речь → Голос</li>
                              <li><b>Linux:</b> sudo apt install espeak-ng mbrola-ru1</li>
                            </ul>
                          </div>
                        ) : (
                          <div className="py-1">
                            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Русские голоса ({russianVoices.length})
                            </div>
                            {russianVoices.map((voice) => (
                              <button
                                key={`${voice.name}-${voice.lang}`}
                                onClick={() => {
                                  onSelectVoice?.(voice);
                                  setShowVoiceSelector(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-accent/50 transition-colors flex items-center justify-between gap-2 ${
                                  selectedVoice?.name === voice.name
                                    ? 'bg-accent/30 text-foreground font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="truncate">{voice.name}</div>
                                  <div className="text-[10px] opacity-70">
                                    {voice.lang}
                                    {!voice.localService && ' · облачный'}
                                  </div>
                                </div>
                                {selectedVoice?.name === voice.name && (
                                  <span className="text-primary text-xs">✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Кнопка теста голоса — работает в любом режиме, доступна всегда */}
            {ttsEnabled && (
              <button
                onClick={() => onTestVoice?.()}
                disabled={isProcessing || (ttsMode === 'system' && !hasRussianVoice)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors px-2 py-1 rounded-md hover:bg-muted"
                title="Проверить голос"
              >
                <Volume2 className="w-3 h-3" />
                <span className="hidden md:inline">Тест</span>
              </button>
            )}
          </div>
        </div>

        {/* Предупреждение об отсутствии русского голоса — только для системного режима */}
        {ttsEnabled && ttsMode === 'system' && !hasRussianVoice && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2">
            ⚠️ В системе не найден русский голос для озвучки. Установите русский голос в настройках ОС (Windows: Параметры → Речь; macOS: Универсальный доступ → Речь; Linux: espeak-ng mbrola-ru1).
          </div>
        )}

        {/* Предупреждение о неподдержке */}
        {mode === 'voice' && !asrSupported && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-2">
            Ваш браузер не поддерживает распознавание речи. Используйте Chrome, Edge или Yandex.Browser.
            Либо переключитесь в текстовый режим.
          </div>
        )}

        {/* Текстовый режим */}
        {mode === 'text' && (
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled
                  ? 'Выберите сценарий и начните звонок...'
                  : 'Введите ответ клиенту... (Enter — отправить, Shift+Enter — новая строка)'
              }
              disabled={disabled || isProcessing}
              className="resize-none min-h-[44px] max-h-[120px] text-sm scrollbar-thin"
              rows={1}
            />
            <Button
              onClick={handleSendText}
              disabled={disabled || isProcessing || !text.trim()}
              size="icon"
              className="h-[44px] w-[44px] flex-shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Живой режим (live conversation) */}
        {mode === 'live' && liveMode && (
          <div className="space-y-3 py-2">
            {/* Статус-индикатор */}
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <span className={`w-2 h-2 rounded-full ${
                liveMode.isActive
                  ? liveMode.isBotSpeaking
                    ? 'bg-blue-500'
                    : liveMode.isListening
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  : 'bg-muted-foreground/30'
              }`} />
              <span className={
                !liveMode.isActive
                  ? 'text-muted-foreground'
                  : liveMode.isBotSpeaking
                    ? 'text-blue-600'
                    : liveMode.isProcessing
                      ? 'text-amber-600'
                      : liveMode.isListening
                        ? 'text-emerald-600'
                        : 'text-muted-foreground'
              }>
                {!liveMode.isActive
                  ? 'Готов начать разговор'
                  : liveMode.isBotSpeaking
                    ? 'Клиент говорит... слушайте'
                    : liveMode.isProcessing
                      ? 'Клиент обдумывает ответ...'
                      : liveMode.isListening
                        ? 'Слушаю вас... говорите'
                        : 'Подождите...'}
              </span>
            </div>

            {/* Главная кнопка */}
            <div className="flex justify-center">
              {!liveMode.isActive ? (
                <Button
                  onClick={liveMode.onStart}
                  disabled={isProcessing || !asrSupported}
                  size="lg"
                  className="h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  title="Начать живой разговор"
                >
                  <Phone className="w-6 h-6" />
                </Button>
              ) : (
                <Button
                  onClick={liveMode.onStop}
                  size="lg"
                  variant="destructive"
                  className="h-16 w-16 rounded-full"
                  title="Завершить разговор"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              )}
            </div>

            {/* Визуализация активности */}
            {liveMode.isActive && (
              <div className="flex justify-center items-center gap-1 h-8">
                {liveMode.isListening && !liveMode.isBotSpeaking && (
                  <>
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <span
                        key={i}
                        className="audio-wave-bar w-1 bg-emerald-500 rounded-full"
                        style={{
                          animationDelay: `${i * 0.08}s`,
                          height: '8px',
                        }}
                      />
                    ))}
                  </>
                )}
                {liveMode.isBotSpeaking && (
                  <>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="audio-wave-bar w-1.5 bg-blue-500 rounded-full"
                        style={{
                          animationDelay: `${i * 0.12}s`,
                          height: '12px',
                        }}
                      />
                    ))}
                  </>
                )}
                {liveMode.isProcessing && !liveMode.isBotSpeaking && (
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                )}
              </div>
            )}

            {/* Транскрипция речи пользователя */}
            {liveMode.isActive && (liveMode.isListening || liveMode.currentTranscript) && (
              <div className="bg-muted/50 border border-border rounded-lg p-3 min-h-[60px]">
                <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1.5">
                  {liveMode.isListening ? (
                    <>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Ваша речь (распознаётся в реальном времени)
                    </>
                  ) : (
                    'Распознанная речь:'
                  )}
                </div>
                <div className="text-sm leading-relaxed text-foreground">
                  {liveMode.currentTranscript || (
                    <span className="text-muted-foreground italic">
                      {liveMode.isListening ? 'Ожидание речи...' : ''}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Подсказка */}
            {!liveMode.isActive ? (
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
                Нажмите зелёную кнопку — клиент позвонит вам.
                Говорите обычным голосом, бот будет слушать и отвечать голосом.
                Когда вы замолчите на 1.5 секунды — ответ отправится автоматически.
                Никаких кнопок «Отправить» нажимать не нужно.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Замолчите на 1.5 сек — и ваш ответ отправится автоматически.
                Пока клиент говорит — микрофон на паузе (защита от эха).
              </p>
            )}
          </div>
        )}

        {/* Голосовой режим */}
        {mode === 'voice' && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3 py-1">
              {!isListening ? (
                <Button
                  onClick={handleStartRec}
                  disabled={disabled || isProcessing || !asrSupported}
                  variant="outline"
                  className="flex items-center gap-2 h-12 px-6"
                >
                  <Mic className="w-5 h-5 text-primary" />
                  <span>{isProcessing ? 'Обработка...' : 'Начать говорить'}</span>
                </Button>
              ) : (
                <Button
                  onClick={handleStopRec}
                  variant="destructive"
                  className="flex items-center gap-2 h-12 px-6 animate-pulse-record"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Отправить · {formatTime(seconds)}</span>
                </Button>
              )}

              {isListening && (
                <div className="flex items-center gap-1 h-8">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="audio-wave-bar w-1 bg-primary rounded-full"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        height: '8px',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Отображение транскрипции в реальном времени */}
            {(isListening || transcript || interimTranscript) && (
              <div className="bg-muted/50 border border-border rounded-md p-3 min-h-[60px]">
                <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1.5">
                  {isListening ? (
                    <>
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                      Слушаю... говорите сейчас
                    </>
                  ) : (
                    'Распознанная речь:'
                  )}
                </div>
                <div className="text-sm leading-relaxed">
                  {transcript && (
                    <span className="text-foreground">{transcript} </span>
                  )}
                  {interimTranscript && (
                    <span className="text-muted-foreground italic">
                      {interimTranscript}
                    </span>
                  )}
                  {!transcript && !interimTranscript && isListening && (
                    <span className="text-muted-foreground italic">
                      Ожидание речи...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Кнопка ручной отправки распознанного текста */}
            {transcript && !isListening && (
              <div className="flex gap-2">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Отредактируйте при необходимости..."
                  className="resize-none min-h-[44px] max-h-[120px] text-sm scrollbar-thin"
                  rows={1}
                />
                <Button
                  onClick={handleSendText}
                  disabled={!text.trim() || isProcessing}
                  size="icon"
                  className="h-[44px] w-[44px] flex-shrink-0"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
