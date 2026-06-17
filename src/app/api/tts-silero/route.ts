import { NextRequest, NextResponse } from 'next/server';
import { applyAccents } from '@/lib/accents';
import { normalizeNumbers } from '@/lib/numbers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface RequestBody {
  text: string;
  voice?: 'male' | 'female';
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'male' }: RequestBody = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Текст обязателен' }, { status: 400 });
    }

    // Нормализуем числа
    const normalized = normalizeNumbers(text);

    // Применяем ударения (Silero понимает U+0301)
    const accented = applyAccents(normalized);

    // Запрос к Silero серверу
    const res = await fetch('http://127.0.0.1:8766/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: accented, voice }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      throw new Error(`Silero server returned ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Silero TTS API Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ошибка при генерации речи',
      },
      { status: 500 }
    );
  }
}
