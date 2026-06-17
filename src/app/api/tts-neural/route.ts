import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface RequestBody {
  text: string;
  voice?: 'ru' | 'ru-ru'; // Google Translate TTS поддерживает только один русский голос
  speed?: number; // 0.5 - 2.0
}

// Google Translate TTS имеет ограничение на длину текста ~200 символов
// Разбиваем длинный текст на части по предложениям
function splitTextIntoChunks(text: string, maxLength = 180): string[] {
  const chunks: string[] = [];
  // Сначала по предложениям
  const sentences = text.match(/[^.!?]+[.!?]+|\S+[^.!?]*$/g) || [text];

  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      // Если предложение само по себе длиннее maxLength — режем по словам
      if (sentence.length > maxLength) {
        const words = sentence.split(' ');
        currentChunk = '';
        for (const word of words) {
          if ((currentChunk + ' ' + word).length <= maxLength) {
            currentChunk = (currentChunk + ' ' + word).trim();
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = word;
          }
        }
      } else {
        currentChunk = sentence;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function fetchTTSAudio(text: string): Promise<Buffer> {
  const encoded = encodeURIComponent(text);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ru&q=${encoded}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
      Accept: '*/*',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Google TTS API returned ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(new Uint8Array(arrayBuffer));
}

export async function POST(req: NextRequest) {
  try {
    const { text, speed = 1.0 }: RequestBody = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Текст обязателен' },
        { status: 400 }
      );
    }

    // Разбиваем длинный текст на части
    const chunks = splitTextIntoChunks(text, 180);
    console.log(`[TTS-Neural] Split into ${chunks.length} chunks, total chars: ${text.length}`);

    // Загружаем все части параллельно
    const audioBuffers = await Promise.all(
      chunks.map((chunk) => fetchTTSAudio(chunk))
    );

    // Склеиваем все MP3 в один буфер
    const combined = Buffer.concat(audioBuffers);

    return new NextResponse(combined, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': combined.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Neural TTS API Error:', error);
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
