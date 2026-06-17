import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
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

// Проверка доступности RUAccent сервера (кэшированная)
let accentizeAvailable: boolean | null = null;

async function checkAccentizeServer(): Promise<boolean> {
  if (accentizeAvailable !== null) return accentizeAvailable;
  try {
    const res = await fetch('http://127.0.0.1:8765/health', {
      signal: AbortSignal.timeout(300),
    });
    accentizeAvailable = res.ok;
    if (accentizeAvailable) {
      console.log('[TTS-Polly] RUAccent server is available');
    } else {
      console.log('[TTS-Polly] RUAccent server is NOT available, using dictionary');
    }
  } catch {
    accentizeAvailable = false;
  }
  // Проверяем каждые 60 секунд
  setTimeout(() => { accentizeAvailable = null; }, 60000);
  return accentizeAvailable;
}

// Получить авто-ударения через RUAccent сервер + ручной словарь для брендов
async function getAutoAccents(text: string): Promise<string> {
  // Сначала применяем ручной словарь — для брендов, моделей, редких слов
  const dictAccented = applyAccents(text);

  const isAvailable = await checkAccentizeServer();
  if (!isAvailable) {
    return dictAccented;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch('http://127.0.0.1:8765/accentize', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const ruaccented = await res.text();
    if (!ruaccented || ruaccented.length === 0) {
      throw new Error('Empty response');
    }

    // Если в исходном тексте есть бренды (Haval, Chery и т.д.) —
    // берём их форму из словаря, остальное из RUAccent
    // Простой подход: если словарь что-то заменил (отличается от оригинала),
    // а RUAccent тоже обработал — используем словарь (он точнее для брендов)
    // Для простоты: если бренды есть в тексте — берём словарь,
    // иначе — RUAccent

    const brands = ['Haval', 'Chery', 'Geely', 'Changan', 'Tank', 'Exeed',
                    'Omoda', 'Jaecoo', 'Jetour', 'Dongfeng', 'BAIC', 'FAW', 'GAC',
                    'Jolion', 'Dargo', 'Tiggo', 'Arrizo', 'Coolray', 'Atlas',
                    'Monjaro', 'Tugella', 'Emgrand', 'UNI-K', 'UNI-V'];
    const hasBrands = brands.some(b => text.includes(b));

    if (hasBrands) {
      // Комбинируем: RUAccent для общего текста, но бренды берём из словаря
      // Простой способ — применить словарь к результату RUAccent
      // (он не тронет уже расставленные бренды, потому что они не в его словаре)
      // Но это сложно. Проще — для текста с брендами используем словарь
      return dictAccented;
    }

    return ruaccented;
  } catch (err) {
    console.warn('[TTS-Polly] RUAccent failed, fallback to dictionary:', err);
    accentizeAvailable = false;
    setTimeout(() => { accentizeAvailable = null; }, 5000);
    return dictAccented;
  }
}

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

    // Применяем ударения через RUAccent (нейросеть) с fallback на ручной словарь
    const accentedText = await getAutoAccents(text);
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
