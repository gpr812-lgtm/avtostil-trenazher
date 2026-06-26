import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

async function generate(text, label) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('ru-RU-DmitryNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const dir = join(tmpdir(), 'tts-test');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const result = await tts.toFile(dir, text);
  const stat = await import('fs').then(fs => fs.statSync(result.audioFilePath));
  console.log(`${label}: text="${text}" → ${stat.size} bytes`);
  console.log(`  file: ${result.audioFilePath}`);
  tts.close();
  return result.audioFilePath;
}

// Сравнение: с ударениями vs без
const withAccents = 'Здра́вствуйте, ско́лько сто́ит Ха́вал Джо́лион';
const withoutAccents = 'Здравствуйте, сколько стоит Haval Jolion';

console.log('=== ТЕСТ TTS: ударения vs без ===');
await generate(withAccents, 'С УДАРЕНИЯМИ');
await generate(withoutAccents, 'БЕЗ УДАРЕНИЙ');
