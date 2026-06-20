import { NextRequest, NextResponse } from 'next/server';
import { transliterateForTTS } from '@/lib/translit';
import { applyAccents } from '@/lib/accents';
import { generateTTSWithStress } from '@/lib/tts-helper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ttsCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const text = url.searchParams.get('text') || '';
    if (!text || text.trim().length === 0) return NextResponse.json({ error: 'text is required' }, { status: 400 });
    if (text.length > 500) return NextResponse.json({ error: 'text too long' }, { status: 400 });

    const cacheKey = transliterateForTTS(text);
    const cached = ttsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new NextResponse(new Uint8Array(cached.buffer), { status: 200, headers: { 'Content-Type': 'audio/wav', 'Content-Length': cached.buffer.length.toString(), 'Cache-Control': 'public, max-age=1800', 'X-TTS-Cache': 'HIT' } });
    }

    const { readFile, unlink, mkdir } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const { tmpdir } = await import('os');
    const { randomUUID } = await import('crypto');
    const tmpDir = join(tmpdir(), 'autotrainer-edge-tts');
    if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true });
    const mp3File = join(tmpDir, `${randomUUID()}.mp3`);
    const wavFile = join(tmpDir, `${randomUUID()}.wav`);

    await generateTTSWithStress(text, mp3File);
    if (!existsSync(mp3File)) throw new Error('TTS did not produce output');

    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    await execFileAsync('ffmpeg', ['-y', '-i', mp3File, '-ac', '1', '-ar', '24000', '-acodec', 'pcm_s16le', wavFile], { timeout: 10000, maxBuffer: 5 * 1024 * 1024 });
    unlink(mp3File).catch(() => {});
    if (!existsSync(wavFile)) throw new Error('ffmpeg did not produce WAV');

    const buffer = await readFile(wavFile);
    unlink(wavFile).catch(() => {});
    if (buffer.length < 100) throw new Error('WAV too small');

    if (ttsCache.size >= 50) { const oldest = Array.from(ttsCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0]; if (oldest) ttsCache.delete(oldest[0]); }
    ttsCache.set(cacheKey, { buffer, timestamp: Date.now() });

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'audio/wav', 'Content-Length': buffer.length.toString(), 'Cache-Control': 'public, max-age=1800', 'X-TTS-Cache': 'MISS' } });
  } catch (err: any) {
    console.error('[TTS-WAV] error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'TTS failed' }, { status: 500 });
  }
}
