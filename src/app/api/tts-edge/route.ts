import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { applyAccents } from '@/lib/accents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface RequestBody {
  text: string;
  voice?: 'male' | 'female';
}

// Edge TTS имеет ограничение на длину текста. Разбиваем по предложениям.
function splitTextIntoChunks(text: string, maxLength = 1500): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+|\S+[^.!?]*$/g) || [text];

  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      if (sentence.length > maxLength) {
        // Режем по словам
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

const VOICE_MAP: Record<string, string> = {
  male: 'ru-RU-DmitryNeural',
  female: 'ru-RU-SvetlanaNeural',
};

async function generateChunk(
  text: string,
  voice: string,
  tmpDir: string,
  index: number
): Promise<Buffer> {
  const outputFile = path.join(tmpDir, `chunk_${index}.mp3`);

  return new Promise<Buffer>((resolve, reject) => {
    // Запускаем через shell, чтобы использовать корректное окружение
    const cmd = `cd /home/z/my-project && /home/z/.venv/bin/python3 /home/z/my-project/scripts/tts_edge.py --voice ${JSON.stringify(voice)} --text ${JSON.stringify(text)} --output ${JSON.stringify(outputFile)}`;

    const proc = spawn('/bin/bash', ['-c', cmd], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        HOME: '/home/z',
        PATH: '/home/z/.venv/bin:/home/z/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      },
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Edge TTS failed (exit ${code}): ${stderr}`));
        return;
      }
      try {
        const data = await readFile(outputFile);
        await unlink(outputFile).catch(() => {});
        if (data.length === 0) {
          reject(new Error('Edge TTS: empty output'));
          return;
        }
        resolve(data);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Spawn failed: ${err.message}`));
    });
  });
}

export async function POST(req: NextRequest) {
  let tmpDir = '';
  try {
    const { text, voice = 'male' }: RequestBody = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Текст обязателен' },
        { status: 400 }
      );
    }

    const edgeVoice = VOICE_MAP[voice] || VOICE_MAP.male;

    // Применяем ударения к проблемным словам
    const accentedText = applyAccents(text);

    // Создаём временную директорию
    tmpDir = path.join(os.tmpdir(), `tts-edge-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });

    // Разбиваем длинный текст
    const chunks = splitTextIntoChunks(accentedText, 1500);
    console.log(`[TTS-Edge] voice=${edgeVoice}, chunks=${chunks.length}, total_chars=${accentedText.length}`);

    // Генерируем части последовательно с retry
    const buffers: Buffer[] = [];
    for (let i = 0; i < chunks.length; i++) {
      let buf: Buffer | null = null;
      let lastError: Error | null = null;
      // До 5 попыток — Edge TTS часто капризничает
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          buf = await generateChunk(chunks[i], edgeVoice, tmpDir, i);
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`[TTS-Edge] Attempt ${attempt + 1}/5 failed for chunk ${i}:`, lastError.message);
          // Ждём дольше на каждой попытке
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      if (!buf) {
        throw lastError || new Error('Edge TTS failed after 5 retries');
      }
      buffers.push(buf);
    }

    const combined = Buffer.concat(buffers);

    // Очистка
    await unlink(tmpDir).catch(() => {});

    return new NextResponse(combined, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': combined.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Edge TTS API Error:', error);
    // Очистка при ошибке
    if (tmpDir && existsSync(tmpDir)) {
      try {
        const files = await import('fs/promises').then(m => m.readdir(tmpDir));
        await Promise.all(files.map(f => unlink(path.join(tmpDir, f)).catch(() => {})));
        await unlink(tmpDir).catch(() => {});
      } catch {}
    }
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
