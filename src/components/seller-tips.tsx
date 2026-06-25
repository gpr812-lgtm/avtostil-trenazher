'use client';
import { Lightbulb } from 'lucide-react';

interface SellerTipsProps {
  messages: Array<{ role: string; content: string }>;
  scenarioId?: string;
  enabled?: boolean;
}

// Заглушка панели подсказок продавцу.
export function SellerTips({ messages, scenarioId, enabled }: SellerTipsProps) {
  if (!enabled) return null;
  if (!messages || messages.length === 0) return null;
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium mb-1">Подсказка</div>
          <div className="text-xs text-blue-700">
            Отвечайте на вопросы клиента и предлагайте конкретные условия.
          </div>
        </div>
      </div>
    </div>
  );
}
