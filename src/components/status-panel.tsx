'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  label: string;
  status: 'ok' | 'error' | 'loading';
  detail?: string;
}

interface HealthResponse {
  allReady: boolean;
  services: ServiceStatus[];
  timestamp: number;
}

export function StatusPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({
          allReady: false,
          services: [{ name: 'server', label: 'Сервер', status: 'error' }],
          timestamp: Date.now(),
        });
      }
    } catch {
      setHealth({
        allReady: false,
        services: [{ name: 'server', label: 'Сервер', status: 'error' }],
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Проверка при загрузке
  useEffect(() => {
    checkHealth();
    // Проверяем каждые 30 секунд
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Если всё ok и свёрнуто — показываем компактный бейдж
  if (health?.allReady && !isExpanded) {
    const hasLoading = health.services.some(s => s.status === 'loading');
    if (hasLoading) {
      // Есть загружающиеся сервисы — показываем жёлтый бейдж
      return (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-colors text-xs font-medium"
            title="Некоторые сервисы загружаются. Нажмите для деталей."
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Системы загружаются...
          </button>
        </div>
      );
    }
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
          title="Все системы работают. Нажмите для деталей."
        >
          <ShieldCheck className="w-4 h-4" />
          Все системы готовы
          <CheckCircle2 className="w-3 h-3 opacity-80" />
        </button>
      </div>
    );
  }

  // Если есть ошибки или развёрнуто — показываем панель
  const hasErrors = health?.services.some(s => s.status === 'error');
  const hasLoading = health?.services.some(s => s.status === 'loading');
  const showWarning = hasErrors || hasLoading;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className={`border-2 ${hasErrors ? 'border-amber-400' : 'border-emerald-400'} shadow-xl`}>
        <CardContent className="p-4 space-y-3">
          {/* Заголовок */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : hasErrors ? (
                <AlertCircle className="w-5 h-5 text-rose-500" />
              ) : hasLoading ? (
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              )}
              <span className="text-sm font-semibold">
                {isLoading ? 'Проверка систем...' :
                 hasErrors ? 'Не все системы готовы' :
                 hasLoading ? 'Системы загружаются...' :
                 'Все системы готовы'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={checkHealth}
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={isLoading}
                title="Обновить"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              {health?.allReady && (
                <Button
                  onClick={() => setIsExpanded(false)}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Свернуть"
                >
                  <span className="text-xs">✕</span>
                </Button>
              )}
            </div>
          </div>

          {/* Список сервисов */}
          {health && (
            <div className="space-y-1.5">
              {health.services.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between gap-2 py-1 px-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {service.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : service.status === 'loading' ? (
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-foreground/80 truncate">
                      {service.label}
                    </span>
                  </div>
                  {service.detail && (
                    <span className="text-[10px] text-amber-600 whitespace-nowrap">
                      {service.detail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Сообщение для пользователя */}
          {hasErrors && (
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] text-rose-700 leading-relaxed">
                ❌ Некоторые сервисы недоступны. Можно начинать тренировку, но часть функций может не работать.
              </p>
            </div>
          )}

          {!hasErrors && hasLoading && (
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                ⏳ Некоторые сервисы ещё загружаются. Как только всё будет готово — вы увидите зелёный значок «Все системы готовы». Можно начинать тренировку уже сейчас.
              </p>
            </div>
          )}

          {health?.allReady && (
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                ✅ Всё готово к работе! Выбирайте сценарий и автомобиль, нажимайте «Принять звонок».
              </p>
            </div>
          )}

          {/* Время последней проверки */}
          {health && (
            <div className="text-[10px] text-muted-foreground text-right">
              Проверено: {new Date(health.timestamp).toLocaleTimeString('ru-RU')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
