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

  // 2. LLM API (z-ai-web-dev-sdk)
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    await ZAI.create();
    services.push({ name: 'llm', label: 'ИИ-движок (чат-бот)', status: 'ok' });
  } catch {
    services.push({ name: 'llm', label: 'ИИ-движок (чат-бот)', status: 'error' });
  }

  // 3. Amazon Polly (ttsmp3.com)
  try {
    const res = await fetch('https://ttsmp3.com/makemp3_new.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'msg=test&lang=Maxim&source=ttsmp3',
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.Error === 0 || data.success === 1) {
      services.push({ name: 'polly', label: 'Голоса (Amazon Polly)', status: 'ok' });
    } else {
      services.push({
        name: 'polly',
        label: 'Голоса (Amazon Polly)',
        status: 'error',
        detail: 'Лимит исчерпан',
      });
    }
  } catch {
    services.push({ name: 'polly', label: 'Голоса (Amazon Polly)', status: 'error' });
  }

  // 4. Google TTS (запасной)
  try {
    const res = await fetch('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ru&q=test', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    services.push({
      name: 'google_tts',
      label: 'Запасной голос (Google)',
      status: res.ok ? 'ok' : 'error',
    });
  } catch {
    services.push({ name: 'google_tts', label: 'Запасной голос (Google)', status: 'error' });
  }

  // 5. RUAccent сервер
  try {
    const res = await fetch('http://127.0.0.1:8765/health', {
      signal: AbortSignal.timeout(1000),
    });
    services.push({
      name: 'ruaccent',
      label: 'Система ударений',
      status: res.ok ? 'ok' : 'error',
    });
  } catch {
    services.push({ name: 'ruaccent', label: 'Система ударений', status: 'error' });
  }

  // 6. Браузерный TTS — проверяется на клиенте
  services.push({ name: 'browser_tts', label: 'Системный голос', status: 'ok' });

  const allOk = services.every(s => s.status === 'ok');

  return NextResponse.json({
    allReady: allOk,
    services,
    timestamp: Date.now(),
  });
}
