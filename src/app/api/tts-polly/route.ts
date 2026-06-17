import { NextRequest, NextResponse } from 'next/server';
import { applyAccents } from '@/lib/accents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface RequestBody {
  text: string;
  voice?: 'male' | 'female';
}

const VOICE_MAP: Record<string, string> = {
  male: 'Maxim',     // Amazon Polly Maxim — мужской русский
  female: 'Tatyana', // Amazon Polly Tatyana — женский русский
};

// Amazon Polly имеет лимит ~1500 символов
function splitTextIntoChunks(text: string, maxLength = 1000): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+|\S+[^.!?]*$/g) || [text];

  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
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

async function generateChunk(text: string, voice: string): Promise<Buffer> {
  // ttsmp3.com API: возвращает JSON с URL на MP3
  const body = new URLSearchParams({
    msg: text,
    lang: voice,
    source: 'ttsmp3',
  });

  const res = await fetch('https://ttsmp3.com/makemp3_new.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://ttsmp3.com/',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`ttsmp3 API returned ${res.status}`);
  }

  const data = await res.json();

  if (data.Error !== 0 || !data.URL) {
    throw new Error(`ttsmp3 error: ${data.description || data.Error || 'unknown'}`);
  }

  // Скачиваем MP3
  const mp3Res = await fetch(data.URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!mp3Res.ok) {
    throw new Error(`Failed to download MP3: ${mp3Res.status}`);
  }

  const arrayBuffer = await mp3Res.arrayBuffer();
  return Buffer.from(new Uint8Array(arrayBuffer));
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'male' }: RequestBody = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Текст обязателен' },
        { status: 400 }
      );
    }

    const pollyVoice = VOICE_MAP[voice] || VOICE_MAP.male;

    // Применяем ударения к проблемным словам (Polly иногда коверкает ударения)
    const accentedText = applyAccents(text);
    if (accentedText !== text) {
      console.log(`[TTS-Polly] Applied accents. Original: "${text.slice(0, 60)}..." → Accented: "${accentedText.slice(0, 60)}..."`);
    }

    const chunks = splitTextIntoChunks(accentedText, 1000);
    console.log(`[TTS-Polly] voice=${pollyVoice}, chunks=${chunks.length}, total_chars=${accentedText.length}`);

    // Генерируем части с retry
    const buffers: Buffer[] = [];
    for (let i = 0; i < chunks.length; i++) {
      let buf: Buffer | null = null;
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          buf = await generateChunk(chunks[i], pollyVoice);
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`[TTS-Polly] Attempt ${attempt + 1}/3 failed for chunk ${i}:`, lastError.message);
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
      if (!buf) {
        throw lastError || new Error('Polly TTS failed after retries');
      }
      buffers.push(buf);
    }

    const combined = Buffer.concat(buffers);

    return new NextResponse(combined, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': combined.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Polly TTS API Error:', error);
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
