'use client';

import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface LiveModePanelProps {
  isActive: boolean;
  isListening: boolean;
  isBotSpeaking: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  ttsEnabled: boolean;
  onStart: () => void;
  onStop: () => void;
  hasRussianVoice: boolean;
}

export function LiveModePanel({
  isActive,
  isListening,
  isBotSpeaking,
  isProcessing,
  currentTranscript,
  ttsEnabled,
  onStart,
  onStop,
  hasRussianVoice,
}: LiveModePanelProps) {
  // Статус-индикатор
  const statusText = !isActive
    ? 'Готов начать разговор'
    : isBotSpeaking
      ? 'Клиент говорит... слушайте'
      : isProcessing
        ? 'Клиент обдумывает ответ...'
        : isListening
          ? 'Слушаю вас... говорите'
          : 'Подождите...';

  const statusColor = !isActive
    ? 'text-muted-foreground'
    : isBotSpeaking
      ? 'text-blue-600'
      : isProcessing
        ? 'text-amber-600'
        : isListening
          ? 'text-emerald-600'
          : 'text-muted-foreground';

  return (
    <div className="space-y-3">
      {/* Большой индикатор статуса */}
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <span className={`w-2 h-2 rounded-full ${
          isActive
            ? isBotSpeaking
              ? 'bg-blue-500'
              : isListening
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-amber-500'
            : 'bg-muted-foreground/30'
        }`} />
        <span className={statusColor}>{statusText}</span>
      </div>

      {/* Главная кнопка */}
      <div className="flex justify-center">
        {!isActive ? (
          <Button
            onClick={onStart}
            disabled={!hasRussianVoice || isProcessing}
            size="lg"
            className="h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            title="Начать живой разговор"
          >
            <Phone className="w-6 h-6" />
          </Button>
        ) : (
          <Button
            onClick={onStop}
            size="lg"
            variant="destructive"
            className="h-16 w-16 rounded-full animate-pulse-record"
            title="Завершить разговор"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Визуализация активности */}
      {isActive && (
        <div className="flex justify-center items-center gap-1 h-8">
          {isListening && !isBotSpeaking && (
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
          {isBotSpeaking && (
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
          {isProcessing && !isBotSpeaking && (
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          )}
        </div>
      )}

      {/* Транскрипция речи пользователя */}
      {isActive && (isListening || currentTranscript) && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 min-h-[60px]">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1.5">
            {isListening ? (
              <>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Ваша речь (распознаётся в реальном времени)
              </>
            ) : (
              'Распознанная речь:'
            )}
          </div>
          <div className="text-sm leading-relaxed text-foreground">
            {currentTranscript || (
              <span className="text-muted-foreground italic">
                {isListening ? 'Ожидание речи...' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Подсказка */}
      {!isActive && (
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
          Нажмите зелёную кнопку — клиент позвонит вам.
          Говорите обычным голосом, бот будет слушать и отвечать голосом.
          Когда вы замолчаете на 1.5 секунды — ответ автоматически отправится.
          Никаких кнопок «Отправить» нажимать не нужно.
        </p>
      )}
      {isActive && (
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Замолчите на 1.5 сек — и ваш ответ отправится автоматически.
          Пока клиент говорит — микрофон на паузе (защита от эха).
        </p>
      )}
    </div>
  );
}
