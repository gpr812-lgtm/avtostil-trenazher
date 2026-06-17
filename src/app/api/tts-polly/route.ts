import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { applyAccents } from '@/lib/accents';
import { applySSML, shouldUseSSML } from '@/lib/ssml';
import { normalizeNumbers } from '@/lib/numbers';

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

// Кэш для авто-ударений (LRU на 1000 записей)
const accentCache = new Map<string, string>();
const ACCENT_CACHE_MAX = 1000;

function getCachedAccent(text: string): string | null {
  if (accentCache.has(text)) {
    const value = accentCache.get(text)!;
    // Move to end (LRU)
    accentCache.delete(text);
    accentCache.set(text, value);
    return value;
  }
  return null;
}

function setCachedAccent(text: string, accented: string) {
  if (accentCache.size >= ACCENT_CACHE_MAX) {
    // Remove oldest
    const firstKey = accentCache.keys().next().value;
    if (firstKey !== undefined) {
      accentCache.delete(firstKey);
    }
  }
  accentCache.set(text, accented);
}

// Получить авто-ударения через RUAccent сервер + ручной словарь для брендов
async function getAutoAccents(text: string): Promise<string> {
  // Проверяем кэш
  const cached = getCachedAccent(text);
  if (cached !== null) {
    console.log('[TTS-Polly] Using cached accents');
    return cached;
  }

  // Сначала применяем ручной словарь — для брендов, моделей, редких слов
  const dictAccented = applyAccents(text);

  const isAvailable = await checkAccentizeServer();
  if (!isAvailable) {
    setCachedAccent(text, dictAccented);
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

    // Комбинируем: для текста с брендами используем словарь, иначе RUAccent
    const brands = ['Haval', 'Chery', 'Geely', 'Changan', 'Tank', 'Exeed',
                    'Omoda', 'Jaecoo', 'Jetour', 'Dongfeng', 'BAIC', 'FAW', 'GAC',
                    'Jolion', 'Dargo', 'Tiggo', 'Arrizo', 'Coolray', 'Atlas',
                    'Monjaro', 'Tugella', 'Emgrand', 'UNI-K', 'UNI-V',
                    'BYD', 'Zeekr', 'Nio', 'Xpeng', 'Hongqi', 'JAC',
                    'Great Wall', 'Wey', 'Li Auto'];
    const hasBrands = brands.some(b => text.includes(b));

    const result = hasBrands ? dictAccented : ruaccented;
    setCachedAccent(text, result);
    return result;
  } catch (err) {
    console.warn('[TTS-Polly] RUAccent failed, fallback to dictionary:', err);
    accentizeAvailable = false;
    setTimeout(() => { accentizeAvailable = null; }, 5000);
    setCachedAccent(text, dictAccented);
    return dictAccented;
  }
}

// Amazon Polly имеет лимит ~1500 символов
// Безопасная разбивка — не разрывает SSML-теги
function splitTextIntoChunks(text: string, maxLength = 1000): string[] {
  const chunks: string[] = [];

  // Разбиваем по предложениям, сохраняя знаки препинания
  // Учитываем, что внутри предложений могут быть SSML-теги с точками/восклицаниями
  // Простое решение — сначала разбиваем по «. », потом проверяем теги

  // Сначала проверим, что текст не слишком длинный — если да, разобьём
  if (text.length <= maxLength) {
    return [text];
  }

  // Разбиваем по предложениям
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];

  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        // Проверим, что текущий чанк не заканчивается разорванным тегом
        chunks.push(balanceSSML(currentChunk.trim()));
      }
      if (sentence.length > maxLength) {
        // Разбиваем по словам, но не разрываем SSML-теги
        const words = splitPreservingTags(sentence, maxLength);
        for (const word of words) {
          if ((currentChunk + ' ' + word).length <= maxLength) {
            currentChunk = (currentChunk + ' ' + word).trim();
          } else {
            if (currentChunk) chunks.push(balanceSSML(currentChunk));
            currentChunk = word;
          }
        }
      } else {
        currentChunk = sentence;
      }
    }
  }
  if (currentChunk) chunks.push(balanceSSML(currentChunk.trim()));
  return chunks;
}

// Разбивает строку на части, не разрывая SSML-теги
function splitPreservingTags(text: string, maxLength: number): string[] {
  const parts: string[] = [];
  // Простая стратегия: разбиваем по пробелам, но проверяем, что не внутри тега
  let current = '';
  let inTag = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '<') inTag = true;
    current += ch;
    if (ch === '>') inTag = false;

    if (ch === ' ' && !inTag && current.length >= maxLength) {
      parts.push(current.trim());
      current = '';
    }
  }
  if (current) parts.push(current.trim());
  return parts;
}

// Закрывает незакрытые SSML-теги в чанке
function balanceSSML(text: string): string {
  // Подсчитываем открытые и закрытые теги
  const openTags = text.match(/<(prosody|emphasis|break|speak|phoneme|amazon:domain)[^>]*>/g) || [];
  const closeTags = text.match(/<\/(prosody|emphasis|speak|phoneme|amazon:domain)>/g) || [];

  // <break> не нужно закрывать
  const openWithoutBreak = openTags.filter(t => !t.startsWith('<break'));

  // Если открытых больше, чем закрытых — добавим закрывающие
  const unclosedCount = openWithoutBreak.length - closeTags.length;
  if (unclosedCount > 0) {
    // Найдём какие теги не закрыты
    const openTagNames = openWithoutBreak.map(t => t.match(/<(\w+)/)?.[1]).filter(Boolean) as string[];
    const closeTagNames = closeTags.map(t => t.match(/<\/(\w+)/)?.[1]).filter(Boolean) as string[];

    // Найдём незакрытые
    const unclosed: string[] = [];
    const closeCopy = [...closeTagNames];
    for (const name of openTagNames) {
      const idx = closeCopy.indexOf(name);
      if (idx >= 0) {
        closeCopy.splice(idx, 1);
      } else {
        unclosed.push(name);
      }
    }

    // Добавим закрывающие теги в обратном порядке
    let result = text;
    for (const name of unclosed.reverse()) {
      result += `</${name}>`;
    }
    return result;
  }
  return text;
}

// Кэш для MP3-аудио (LRU на 100 записей, чтобы не раздуть память)
const audioCache = new Map<string, Buffer>();
const AUDIO_CACHE_MAX = 100;

function getCachedAudio(key: string): Buffer | null {
  if (audioCache.has(key)) {
    const value = audioCache.get(key)!;
    audioCache.delete(key);
    audioCache.set(key, value);
    return value;
  }
  return null;
}

function setCachedAudio(key: string, audio: Buffer) {
  if (audioCache.size >= AUDIO_CACHE_MAX) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey !== undefined) {
      audioCache.delete(firstKey);
    }
  }
  audioCache.set(key, audio);
}

async function generateChunk(text: string, voice: string): Promise<Buffer> {
  // Проверяем кэш аудио
  const cacheKey = `${voice}:${text}`;
  const cached = getCachedAudio(cacheKey);
  if (cached) {
    console.log('[TTS-Polly] Using cached audio');
    return cached;
  }

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
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));

  // Сохраняем в кэш
  setCachedAudio(cacheKey, buffer);

  return buffer;
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

    // 0. Нормализуем числа (2.8 → "две целых восемь десятых", 2400000 → "два миллиона...")
    const normalizedText = normalizeNumbers(text);
    if (normalizedText !== text) {
      console.log(`[TTS-Polly] Normalized numbers. Original: "${text.slice(0, 60)}..." → Normalized: "${normalizedText.slice(0, 60)}..."`);
    }

    // 1. Применяем ударения через RUAccent (нейросеть) с fallback на ручной словарь
    const accentedText = await getAutoAccents(normalizedText);
    if (accentedText !== normalizedText) {
      console.log(`[TTS-Polly] Applied accents. Original: "${normalizedText.slice(0, 60)}..." → Accented: "${accentedText.slice(0, 60)}..."`);
    }

    // 2. Применяем SSML-разметку (паузы, замедление, акценты)
    let finalText = accentedText;
    if (shouldUseSSML(accentedText)) {
      finalText = applySSML(accentedText);
      console.log(`[TTS-Polly] Applied SSML: ${finalText.slice(0, 80)}...`);
    }

    const chunks = splitTextIntoChunks(finalText, 1000);
    console.log(`[TTS-Polly] voice=${pollyVoice}, chunks=${chunks.length}, total_chars=${finalText.length}`);

    // Генерируем части с retry
    const buffers: Buffer[] = [];
    let pollyFailed = false; // Если Polly упала — переключаемся на Google TTS
    for (let i = 0; i < chunks.length; i++) {
      let buf: Buffer | null = null;
      let lastError: Error | null = null;

      if (!pollyFailed) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            buf = await generateChunk(chunks[i], pollyVoice);
            break;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`[TTS-Polly] Attempt ${attempt + 1}/2 failed for chunk ${i}:`, lastError.message);
            // Если "Usage Limit exceeded" — не ретраим, сразу переключаемся
            if (lastError.message.includes('Usage Limit') || lastError.message.includes('limit')) {
              pollyFailed = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          }
        }
      }

      // Fallback на Google TTS если Polly недоступна
      if (!buf) {
        console.log(`[TTS-Polly] Falling back to Google TTS for chunk ${i}`);
        try {
          // Для Google TTS убираем SSML-теги — он их не поддерживает
          const cleanText = chunks[i].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          const googleRes = await fetch('http://localhost:3000/api/tts-neural', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText }),
          });
          if (googleRes.ok) {
            const googleBlob = await googleRes.blob();
            buf = Buffer.from(await googleBlob.arrayBuffer());
            console.log(`[TTS-Polly] Google TTS fallback succeeded: ${buf.length} bytes`);
          }
        } catch (googleErr) {
          console.error('[TTS-Polly] Google TTS fallback also failed:', googleErr);
        }
      }

      if (!buf) {
        throw lastError || new Error('All TTS sources failed');
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
