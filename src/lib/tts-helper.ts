import { transliterateForTTS } from '@/lib/translit';
import { applyAccents } from '@/lib/accents';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { join, dirname } from 'path';

/**
 * Универсальная функция TTS через msedge-tts (Node.js, без Python).
 *
 * Пайплайн:
 *   1. transliterateForTTS(text) — Haval → Хавал (бренды на русский)
 *   2. applyAccents(text) — расстановка ударений (Хавал → Ха́вал)
 *   3. msedge-tts — синтез через Microsoft Edge TTS (DmitryNeural)
 *
 * Голос: ru-RU-DmitryNeural — мужской русский, естественный тембр.
 *
 * outputPath — полный путь к MP3 файлу который нужно создать.
 *            msedge-tTS сам записывает файл через toFile().
 */
export async function generateTTSWithStress(
  text: string,
  outputPath: string,
  voice: string = 'ru-RU-DmitryNeural'
): Promise<void> {
  // 1. Транслитерация брендов
  let processed = transliterateForTTS(text);

  // 2. Расстановка ударений через словарь applyAccents
  try {
    processed = applyAccents(processed);
  } catch (e) {
    console.warn('[tts-helper] applyAccents failed, using plain text:', e instanceof Error ? e.message : e);
  }

  // 3. Очистка: убираем знаки которые плохо читаются
  processed = processed
    .replace(/\[\[DIALOGUE_END\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`[tts-helper] TTS: voice=${voice}, text="${processed.slice(0, 60)}..."`);

  // 4. msedge-tts сам создаёт файл — даём ему директорию и имя
  //    toFile(dirPath, input) создаёт файл с рандомным именем в dirPath
  //    Потом переименовываем в нужный нам outputPath
  const { rename, mkdir } = await import('fs/promises');
  const { existsSync } = await import('fs');
  const dir = dirname(outputPath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const result = await tts.toFile(dir, processed, {
      rate: '+25%',
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
