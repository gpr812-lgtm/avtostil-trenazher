'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IdealReplyProps {
  open: boolean;
  onClose: () => void;
  lastUserMessage: string;
  scenarioId?: string;
}

// Заглушка — показывает рекомендацию "ответить на вопрос клиента".
export function IdealReply({ open, onClose, lastUserMessage }: IdealReplyProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Идеальный ответ</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="text-gray-600">Вопрос клиента:</div>
          <div className="bg-gray-50 p-3 rounded italic">&laquo;{lastUserMessage}&raquo;</div>
          <div className="text-gray-600">Рекомендация:</div>
          <div className="bg-blue-50 p-3 rounded">
            Ответьте коротко и по делу. Сначала ответ на вопрос, потом встречный вопрос или предложение.
          </div>
        </div>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogContent>
    </Dialog>
  );
}
