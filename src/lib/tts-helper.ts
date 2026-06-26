import { transliterateForTTS } from '@/lib/translit';

/**
 * Универсальная функция TTS через msedge-tts (Node.js, без Python).
 *
 * Пайплайн:
 *   1. transliterateForTTS(text) — Haval → Хавал (бренды на русский)
 *   2. Очистка от артефактов LLM ([[DIALOGUE_END]] и т.п.)
 *   3. msedge-tts — синтез через Microsoft Edge TTS (DmitryNeural)
 *
 * ВАЖНО: НЕ применяем applyAccents (U+0301 combining character).
 * Microsoft Edge TTS с DmitryNeural сам отлично знает русские ударения.
 * Добавление U+0301 ломает чтение — бот коверкает слова.
 *
 * Голос: ru-RU-DmitryNeural — мужской русский, естественный тембр.
 *
 * outputPath — полный путь к MP3 файлу который нужно создать.
 *            msedge-tts сам записывает файл через toFile().
 */
export async function generateTTSWithStress(
  text: string,
  outputPath: string,
  voice: string = 'ru-RU-DmitryNeural'
): Promise<void> {
  // 1. Транслитерация брендов (Haval → Хавал) — БЕЗ ударений
  let processed = transliterateForTTS(text);

  // 2. Очистка: убираем знаки которые плохо читаются
  processed = processed
    .replace(/\[\[DIALOGUE_END\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`[tts-helper] TTS: voice=${voice}, text="${processed.slice(0, 60)}..."`);

  // 3. msedge-tts сам создаёт файл — даём ему директорию
  const { rename, mkdir } = await import('fs/promises');
  const { existsSync } = await import('fs');
  const { dirname } = await import('path');
  const dir = dirname(outputPath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const tts = new (await import('msedge-tts')).MsEdgeTTS();
  try {
    const { OUTPUT_FORMAT } = await import('msedge-tts');
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const result = await tts.toFile(dir, processed, {
      rate: '+25%',     // +25% — быстрее как живая речь
      volume: '+0%',
      pitch: '+0Hz',
    });

    if (!result?.audioFilePath || !existsSync(result.audioFilePath)) {
      throw new Error('TTS did not produce output file');
    }

    // Переименовываем в нужный путь
    if (result.audioFilePath !== outputPath) {
      await rename(result.audioFilePath, outputPath);
    }

    const { statSync } = await import('fs');
    const stats = statSync(outputPath);
    if (stats.size < 100) {
      throw new Error(`TTS output too small: ${stats.size} bytes`);
    }

    console.log(`[tts-helper] ✓ TTS готов: ${stats.size} bytes`);
  } finally {
    try { tts.close?.(); } catch {}
  }
}
