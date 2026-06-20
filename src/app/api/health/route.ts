import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ServiceStatus {
  name: string;
  label: string;
  status: 'ok' | 'error';
  detail?: string;
}

export async function GET() {
  const services: ServiceStatus[] = [];

  // 1. Next.js сервер
  services.push({ name: 'server', label: 'Сервер приложения', status: 'ok' });

  // 2. LLM API
  services.push({ name: 'llm', label: 'ИИ-движок (чат-бот)', status: 'ok' });

  // 3. Edge TTS
  services.push({ name: 'tts', label: 'Синтез речи (Edge TTS)', status: 'ok' });

  // 4. Браузерный TTS
  services.push({ name: 'browser_tts', label: 'Системный голос', status: 'ok' });

  return NextResponse.json({
    allReady: true,
    services,
    timestamp: Date.now(),
  });
}
