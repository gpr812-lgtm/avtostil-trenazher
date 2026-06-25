'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';

interface CoachModeProps {
  open: boolean;
  onClose: () => void;
  lastUserMessage?: string;
  lastBotMessage?: string;
  scenarioId?: string;
}

// Заглушка режима коуча — показывает совет.
export function CoachMode({ open, onClose, lastBotMessage }: CoachModeProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Режим коуча
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded">
            <div className="font-medium text-amber-900 mb-1">Совет</div>
            <div className="text-amber-800">
              {lastBotMessage
                ? 'Клиент ждёт конкретики. Назовите цену, гарантию, предложите тест-драйв.'
                : 'Спокойно ответьте на вопрос клиента и предложите следующий шаг.'}
            </div>
          </div>
        </div>
        <Button onClick={onClose}>Понятно, продолжить</Button>
      </DialogContent>
    </Dialog>
  );
}
