'use client';

interface StageIndicatorProps {
  messages: Array<{ role: string; content: string }>;
  scenarioId?: string;
}

// Заглушка — простой индикатор этапа диалога.
export function StageIndicator({ messages }: StageIndicatorProps) {
  const sellerCount = messages.filter(m => m.role === 'user').length;
  let stage = 'Приветствие';
  if (sellerCount >= 1) stage = 'Выявление потребностей';
  if (sellerCount >= 3) stage = 'Презентация';
  if (sellerCount >= 5) stage = 'Отработка возражений';
  if (sellerCount >= 7) stage = 'Закрытие сделки';

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <span className="font-medium">Этап:</span>
      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{stage}</span>
    </div>
  );
}
