'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { scenarios, Scenario } from '@/data/scenarios';
import { Users, Target, TrendingUp } from 'lucide-react';

interface ScenarioSelectorProps {
  selectedId?: string;
  onSelect: (scenario: Scenario) => void;
  disabled?: boolean;
}

const difficultyVariant = {
  'Лёгкий': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'Средний': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  'Сложный': 'bg-rose-100 text-rose-700 hover:bg-rose-100',
} as const;

export function ScenarioSelector({
  selectedId,
  onSelect,
  disabled,
}: ScenarioSelectorProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Сценарии клиентов</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Выберите тип клиента для тренировки
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px] px-3 pb-3 scrollbar-thin">
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                onClick={() => !disabled && onSelect(scenario)}
                className={`p-3 rounded-lg border transition-all ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:border-primary/50 hover:bg-accent/50'
                } ${
                  selectedId === scenario.id
                    ? 'border-primary bg-accent/50 glow-primary'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold text-sm flex-1">
                    {scenario.title}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${difficultyVariant[scenario.difficulty]}`}
                  >
                    {scenario.difficulty}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {scenario.description}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {scenario.customerName}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {scenario.customerGoal.length > 35
                      ? scenario.customerGoal.slice(0, 35) + '...'
                      : scenario.customerGoal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
