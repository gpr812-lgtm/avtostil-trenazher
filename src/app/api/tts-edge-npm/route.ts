import { NextRequest, NextResponse } from 'next/server';
import { transliterateForTTS } from '@/lib/translit';
import { generateTTSWithStress } from '@/lib/tts-helper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ttsCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length === 0) return NextResponse.json({ error: 'text is required' }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: 'text too long' }, { status: 400 });

    const cacheKey = transliterateForTTS(text).slice(0, 200);
    const cached = ttsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new NextResponse(new Uint8Array(cached.buffer), { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': cached.buffer.length.toString(), 'Cache-Control': 'no-cache', 'X-TTS-Cache': 'HIT' } });
    }

    const { readFile, unlink, mkdir } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const { tmpdir } = await import('os');
    const { randomUUID } = await import('crypto');
    const tmpDir = join(tmpdir(), 'autotrainer-edge-tts');
    if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true });
    const outFile = join(tmpDir, `${randomUUID()}.mp3`);

    await generateTTSWithStress(text, outFile);
    if (!existsSync(outFile)) throw new Error('TTS did not produce output');
    const buffer = await readFile(outFile);
    unlink(outFile).catch(() => {});
    if (buffer.length < 100) throw new Error('TTS output too small');

    if (ttsCache.size >= 50) { const oldest = Array.from(ttsCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0]; if (oldest) ttsCache.delete(oldest[0]); }
    ttsCache.set(cacheKey, { buffer, timestamp: Date.now() });

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length.toString(), 'Cache-Control': 'no-cache', 'X-TTS-Cache': 'MISS' } });
  } catch (err: any) {
    console.error('[TTS-EDGE-NPM] error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'TTS failed' }, { status: 500 });
  }
}
