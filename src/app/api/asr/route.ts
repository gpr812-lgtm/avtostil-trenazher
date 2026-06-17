import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Аудиофайл не предоставлен' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const base64Audio = buffer.toString('base64');

    const zai = await ZAI.create();

    const response = await zai.audio.asr.create({
      file_base64: base64Audio,
    });

    const transcription = (response as any).text || '';

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json(
        { error: 'Не удалось распознать речь' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      transcription: transcription.trim(),
    });
  } catch (error) {
    console.error('ASR API Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ошибка при распознавании речи',
      },
      { status: 500 }
    );
  }
}
