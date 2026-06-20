import { spawn } from 'child_process';
import { join } from 'path';
import { transliterateForTTS } from '@/lib/translit';
import { applyAccents } from '@/lib/accents';

/**
 * Универсальная функция TTS через edge-tts + StressRNN.
 * Пайплайн: transliterateForTTS → applyAccents → StressRNN → edge-tts
 */
export async function generateTTSWithStress(
  text: string,
  outputPath: string,
  voice: string = 'ru-RU-DmitryNeural'
): Promise<void> {
  const transliterated = transliterateForTTS(text);
  const accentedText = applyAccents(transliterated);

  const ttsScriptPath = join(process.cwd(), 'scripts', 'tts_with_stress.py');
  const ttsInput = JSON.stringify({
    text: accentedText,
    voice,
    output_path: outputPath,
  });

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('/usr/bin/python3', [ttsScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`TTS script exited with code ${code}: ${stderr.slice(-500)}`));
      } else {
        resolve();
      }
    });
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('TTS script timeout (60s)'));
    }, 60000);
    proc.on('close', () => clearTimeout(timer));
    proc.stdin.write(ttsInput);
    proc.stdin.end();
  });
}
