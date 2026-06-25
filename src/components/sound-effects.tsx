'use client';
import { useEffect, useRef } from 'react';

interface SoundEffectsProps {
  playRing?: boolean;
  playEnd?: boolean;
  playNotification?: boolean;
  callActive?: boolean;
}

// Заглушка — реальные звуки пока отключены, чтобы не блокировать сборку.
// Если нужны звуки — восстановите оригинальный компонент.
export function SoundEffects({ playRing, playEnd, playNotification, callActive }: SoundEffectsProps) {
  useEffect(() => {
    // no-op
  }, [playRing, playEnd, playNotification, callActive]);
  return null;
}
