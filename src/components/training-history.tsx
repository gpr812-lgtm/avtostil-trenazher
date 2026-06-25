'use client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TrainingRecord {
  scenarioId: string;
  scenarioTitle: string;
  date: string;
  duration: number;
  score: number;
  outcome: string;
  messagesCount: number;
}

const STORAGE_KEY = 'avtostil-training-history';

export function saveTrainingRecord(record: TrainingRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch (e) {
    console.warn('saveTrainingRecord failed:', e);
  }
}

export function getTrainingHistory(): TrainingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const [history, setHistory] = useState<TrainingRecord[]>([]);

  useEffect(() => {
    if (open) setHistory(getTrainingHistory());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>История тренировок</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              История пустая. Завершите звонок чтобы увидеть записи.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((r, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{r.scenarioTitle}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(r.date).toLocaleString('ru-RU')} · {Math.floor(r.duration / 60)}:{(r.duration % 60).toString().padStart(2, '0')} · {r.messagesCount} реплик
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{r.score.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">{r.outcome}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
