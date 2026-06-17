import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ServiceStatus {
  name: string;
  label: string;
  status: 'ok' | 'error' | 'loading';
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

  // 5. Silero TTS сервер (основной мужской/женский голос)
  let sileroStatus: ServiceStatus = { name: 'silero', label: 'Голоса (Silero TTS)', status: 'loading', detail: 'Загружается...' };
  try {
    const res = await fetch('http://127.0.0.1:8766/health', {
      signal: AbortSignal.timeout(1500),
    });
    sileroStatus = {
      name: 'silero',
      label: 'Голоса (Silero TTS)',
      status: res.ok ? 'ok' : 'error',
    };
  } catch {
    // Проверим запущен ли процесс
    try {
      const { execSync } = await import('child_process');
      const output = execSync('pgrep -f silero_server', { encoding: 'utf-8', timeout: 1000 }).trim();
      if (output) {
        sileroStatus = { name: 'silero', label: 'Голоса (Silero TTS)', status: 'loading', detail: 'Загружается модель...' };
      } else {
        sileroStatus = { name: 'silero', label: 'Голоса (Silero TTS)', status: 'error' };
      }
    } catch {
      sileroStatus = { name: 'silero', label: 'Голоса (Silero TTS)', status: 'error' };
    }
  }
  services.push(sileroStatus);

  // 6. RUAccent сервер (может загружаться ~20 сек при старте)
  let ruaccentStatus: ServiceStatus = { name: 'ruaccent', label: 'Система ударений', status: 'loading', detail: 'Загружается...' };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('http://127.0.0.1:8765/health', {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        ruaccentStatus = { name: 'ruaccent', label: 'Система ударений', status: 'ok' };
        break;
      }
    } catch {
      // Не готово — попробуем ещё раз через 1 сек
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }
  }
  // Если после 3 попыток не ответило — проверим, запущен ли процесс
  if (ruaccentStatus.status !== 'ok') {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('pgrep -f accentize_server', { encoding: 'utf-8', timeout: 1000 }).trim();
      if (output) {
        // Процесс есть, но сервер ещё не отвечает — значит загружается
        ruaccentStatus = { name: 'ruaccent', label: 'Система ударений', status: 'loading', detail: 'Загружается модель...' };
      } else {
        ruaccentStatus = { name: 'ruaccent', label: 'Система ударений', status: 'error' };
      }
    } catch {
      ruaccentStatus = { name: 'ruaccent', label: 'Система ударений', status: 'error' };
    }
  }
  services.push(ruaccentStatus);

  // 6. Браузерный TTS — проверяется на клиенте
  services.push({ name: 'browser_tts', label: 'Системный голос', status: 'ok' });

  // "loading" не считается ошибкой — сервис просто ещё запускается
  // Google TTS — некритичный fallback, если Polly работает
  const pollyOk = services.find(s => s.name === 'polly')?.status === 'ok';
  const hasErrors = services.some(s =>
    s.status === 'error' &&
    !(s.name === 'google_tts' && pollyOk) // Google TTS не критичен если Polly работает
  );
  const allOk = !hasErrors;

  return NextResponse.json({
    allReady: allOk,
    services,
    timestamp: Date.now(),
  });
}
