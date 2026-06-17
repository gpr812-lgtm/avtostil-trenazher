'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
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
  const { isRecording, startRecording, stopRecording, error } =
    useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recDurationRef = useRef(0);
  const recTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Ошибка микрофона',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error]);

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleStartRec = async () => {
    await startRecording();
    recDurationRef.current = 0;
    setRecSeconds(0);
    recTimerRef.current = setInterval(() => {
      recDurationRef.current += 1;
      setRecSeconds((s) => s + 1);
    }, 1000);
  };

  const handleStopRec = async () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    const duration = recDurationRef.current;
    const blob = await stopRecording();
    if (!blob) return;

    // Минимальная длина записи — 1 секунда
    if (duration < 1) {
      toast({
        title: 'Слишком короткая запись',
        description: 'Поговорите подольше — хотя бы 1 секунду.',
        variant: 'destructive',
      });
      return;
    }

    // Отправляем на ASR
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const fileExt = blob.type.includes('webm')
        ? 'webm'
        : blob.type.includes('ogg')
          ? 'ogg'
          : 'wav';
      formData.append('audio', blob, `recording.${fileExt}`);

      const res = await fetch('/api/asr', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка распознавания речи');
      }

      const data = await res.json();
      const transcription = data.transcription?.trim();
      if (!transcription) {
        throw new Error('Речь не распознана. Попробуйте говорить чётче.');
      }

      onSendMessage(transcription);
    } catch (err) {
      toast({
        title: 'Ошибка распознавания',
        description:
          err instanceof Error ? err.message : 'Не удалось распознать речь',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
    }
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
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                mode === 'voice'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Голос
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
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Голосовой режим */}
        {mode === 'voice' && (
          <div className="flex items-center justify-center gap-3 py-2">
            {!isRecording ? (
              <Button
                onClick={handleStartRec}
                disabled={disabled || isProcessing || isTranscribing}
                variant="outline"
                className="flex items-center gap-2 h-12 px-6"
              >
                <Mic className="w-5 h-5 text-primary" />
                <span>{isTranscribing ? 'Распознавание...' : 'Начать говорить'}</span>
              </Button>
            ) : (
              <Button
                onClick={handleStopRec}
                variant="destructive"
                className="flex items-center gap-2 h-12 px-6 animate-pulse-record"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Остановить · {formatTime(recSeconds)}</span>
              </Button>
            )}

            {isRecording && (
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
        )}
      </div>
    </div>
  );
}
