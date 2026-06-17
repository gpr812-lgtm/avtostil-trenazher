'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Square, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { toast } from '@/hooks/use-toast';

interface InputPanelProps {
  onSendMessage: (text: string) => void;
  disabled: boolean;
  isProcessing: boolean;
  ttsEnabled: boolean;
  onToggleTts: () => void;
}

export function InputPanel({
  onSendMessage,
  disabled,
  isProcessing,
  ttsEnabled,
  onToggleTts,
}: InputPanelProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
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
          </div>

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
        </div>

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
