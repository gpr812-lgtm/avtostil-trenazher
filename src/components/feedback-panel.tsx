'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';

export interface Feedback {
  scores: {
    greeting: number;
    needs: number;
    product: number;
    objections: number;
    value: number;
    closing: number;
    tone: number;
    structure: number;
  };
  totalScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  outcome: string;
}

interface FeedbackPanelProps {
  feedback: Feedback | null;
  isLoading: boolean;
}

const scoreLabels: Record<keyof Feedback['scores'], string> = {
  greeting: 'Приветствие и контакт',
  needs: 'Выявление потребностей',
  product: 'Знание продукта',
  objections: 'Отработка возражений',
  value: 'Аргументация ценности',
  closing: 'Закрытие сделки',
  tone: 'Тон и стиль',
  structure: 'Структура разговора',
};

const outcomeLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  closed_test_drive: { label: 'Тест-драйв назначен', variant: 'success' },
  closed_visit: { label: 'Визит согласован', variant: 'success' },
  closed_sale: { label: 'Сделка закрыта', variant: 'success' },
  client_left: { label: 'Клиент ушёл', variant: 'destructive' },
  no_close: { label: 'Не закрыто', variant: 'warning' },
};

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600';
  if (score >= 6) return 'text-amber-600';
  if (score >= 4) return 'text-orange-600';
  return 'text-rose-600';
}

export function FeedbackPanel({ feedback, isLoading }: FeedbackPanelProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-primary animate-pulse" />
            Анализ диалога...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-2 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!feedback) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Обратная связь
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Award className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">
              Завершите диалог, чтобы получить подробный разбор
              вашей работы и оценку по 8 критериям.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalScoreColor = getScoreColor(feedback.totalScore);
  const outcome = outcomeLabels[feedback.outcome] || outcomeLabels.no_close;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Разбор диалога
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px] px-4 pb-4 scrollbar-thin">
          <div className="space-y-4">
            {/* Общий балл */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/30 border border-primary/20">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Общая оценка
                </div>
                <div className={`text-3xl font-bold ${totalScoreColor}`}>
                  {feedback.totalScore.toFixed(1)}
                  <span className="text-base text-muted-foreground">/10</span>
                </div>
              </div>
              <Badge
                variant={outcome.variant === 'success' ? 'default' : 'secondary'}
                className={
                  outcome.variant === 'success'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                    : outcome.variant === 'destructive'
                      ? 'bg-rose-600 text-white hover:bg-rose-600'
                      : 'bg-amber-500 text-white hover:bg-amber-500'
                }
              >
                {outcome.label}
              </Badge>
            </div>

            {/* Сводка */}
            <div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {feedback.summary}
              </p>
            </div>

            {/* Оценки по критериям */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Оценки по критериям
              </h4>
              <div className="space-y-2">
                {Object.entries(feedback.scores).map(([key, score]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {scoreLabels[key as keyof typeof scoreLabels]}
                      </span>
                      <span className={`font-medium ${getScoreColor(score)}`}>
                        {score}/10
                      </span>
                    </div>
                    <Progress
                      value={score * 10}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Сильные стороны */}
            {feedback.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Сильные стороны
                </h4>
                <ul className="space-y-1.5">
                  {feedback.strengths.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm flex gap-2 text-foreground/80"
                    >
                      <span className="text-emerald-600 flex-shrink-0">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Что улучшить */}
            {feedback.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Что улучшить
                </h4>
                <ul className="space-y-1.5">
                  {feedback.weaknesses.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm flex gap-2 text-foreground/80"
                    >
                      <span className="text-amber-600 flex-shrink-0">−</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Рекомендации */}
            {feedback.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  Рекомендации
                </h4>
                <ul className="space-y-1.5">
                  {feedback.recommendations.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm flex gap-2 text-foreground/80"
                    >
                      <span className="text-yellow-600 flex-shrink-0">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
