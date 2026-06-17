'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { shopperCriteria, ShopperFeedback } from '@/lib/shopper';

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
  shopperFeedback?: ShopperFeedback | null;
  isShopperLoading?: boolean;
  onShopperLoad?: () => void;
  messages?: Array<{ role: string; content: string }>;
  scenarioId?: string;
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

function getScoreColor(score: number, max = 10): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-amber-600';
  if (pct >= 40) return 'text-orange-600';
  return 'text-rose-600';
}

function getProgressBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-amber-500';
  if (pct >= 40) return 'bg-orange-500';
  return 'bg-rose-500';
}

export function FeedbackPanel({
  feedback,
  isLoading,
  shopperFeedback,
  isShopperLoading,
  onShopperLoad,
  messages,
  scenarioId,
}: FeedbackPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('review');

  // Автозагрузка шопер-оценки при переключении на вкладку
  useEffect(() => {
    if (activeTab === 'shopper' && !shopperFeedback && !isShopperLoading && messages && messages.length > 0 && scenarioId && onShopperLoad) {
      onShopperLoad();
    }
  }, [activeTab, shopperFeedback, isShopperLoading, messages, scenarioId, onShopperLoad]);

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
              вашей работы и оценку по критериям.
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
      <CardHeader className="pb-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="review" className="text-xs gap-1">
              <Award className="w-3 h-3" />
              Разбор
            </TabsTrigger>
            <TabsTrigger value="shopper" className="text-xs gap-1">
              <ClipboardCheck className="w-3 h-3" />
              Шопер
            </TabsTrigger>
          </TabsList>

          {/* === ВКЛАДКА: РАЗБОР === */}
          <TabsContent value="review" className="mt-2">
            <ScrollArea className="h-[calc(100vh-340px)] min-h-[400px] px-1 pb-4 scrollbar-thin">
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
                    Оценки по 8 критериям
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
                        <Progress value={score * 10} className="h-1.5" />
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
                        <li key={i} className="text-sm flex gap-2 text-foreground/80">
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
                        <li key={i} className="text-sm flex gap-2 text-foreground/80">
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
                        <li key={i} className="text-sm flex gap-2 text-foreground/80">
                          <span className="text-yellow-600 flex-shrink-0">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === ВКЛАДКА: ШОПЕР === */}
          <TabsContent value="shopper" className="mt-2">
            {isShopperLoading ? (
              <div className="space-y-3 py-8">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Оценка по системе шопер...
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-2 bg-muted rounded animate-pulse w-3/4" />
                  </div>
                ))}
              </div>
            ) : shopperFeedback ? (
              <ShopperEvaluation feedback={shopperFeedback} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">
                  Оценка по системе шопер загрузится автоматически.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}

// === Компонент оценки шопер ===
function ShopperEvaluation({ feedback }: { feedback: ShopperFeedback }) {
  const pct = feedback.percentage;
  const grade = pct >= 80 ? 'Отлично' : pct >= 60 ? 'Хорошо' : pct >= 40 ? 'Удовлетворительно' : 'Неудовлетворительно';
  const gradeColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : pct >= 40 ? 'text-orange-600' : 'text-rose-600';
  const gradeBg = pct >= 80 ? 'bg-emerald-600' : pct >= 60 ? 'bg-amber-500' : pct >= 40 ? 'bg-orange-500' : 'bg-rose-500';

  return (
    <ScrollArea className="h-[calc(100vh-340px)] min-h-[400px] px-1 pb-4 scrollbar-thin">
      <div className="space-y-4">
        {/* Общий балл шопер */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/30 border border-primary/20">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Оценка шопер (из 100)
            </div>
            <div className={`text-3xl font-bold ${gradeColor}`}>
              {feedback.totalScore}
              <span className="text-base text-muted-foreground">/100</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {pct}% выполнено
            </div>
          </div>
          <Badge className={`${gradeBg} text-white hover:${gradeBg}`}>
            {grade}
          </Badge>
        </div>

        {/* Сводка */}
        <div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {feedback.summary}
          </p>
        </div>

        {/* Таблица 20 критериев */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Оценка по 20 критериям
          </h4>
          <div className="space-y-2">
            {feedback.scores.map((s) => {
              const criterion = shopperCriteria.find(c => c.id === s.criterionId);
              if (!criterion) return null;
              const scorePct = (s.score / criterion.maxScore) * 100;
              return (
                <div key={s.criterionId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground/80 font-medium">
                        {criterion.name}
                      </span>
                      <span className="text-muted-foreground block text-[10px] leading-tight">
                        {criterion.description}
                      </span>
                    </div>
                    <span className={`font-bold flex-shrink-0 ${getScoreColor(s.score, criterion.maxScore)}`}>
                      {s.score}/{criterion.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressBarColor(s.score, criterion.maxScore)}`}
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
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
                <li key={i} className="text-sm flex gap-2 text-foreground/80">
                  <span className="text-emerald-600 flex-shrink-0">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Что не сделано */}
        {feedback.weaknesses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Что не сделано
            </h4>
            <ul className="space-y-1.5">
              {feedback.weaknesses.map((item, i) => (
                <li key={i} className="text-sm flex gap-2 text-foreground/80">
                  <span className="text-rose-600 flex-shrink-0">✗</span>
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
                <li key={i} className="text-sm flex gap-2 text-foreground/80">
                  <span className="text-yellow-600 flex-shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
