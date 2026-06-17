// Тест разных голосов TTS и проверка ASR для русского языка
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function testVoices() {
  const zai = await ZAI.create();
  const text = 'Здравствуйте! Меня зовут Андрей, я звоню по поводу Haval Jolion. Скажите, какая итоговая цена выходит?';

  const voices = ['tongtong', 'chuichui', 'xiaochen', 'jam', 'kazi', 'douji', 'luodo'];

  console.log('=== Testing TTS voices for Russian text ===\n');
  
  for (const voice of voices) {
    try {
      const response = await zai.audio.tts.create({
        input: text,
        voice: voice,
        speed: 1.0,
        response_format: 'wav',
        stream: false,
      });
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      const filePath = `/tmp/tts_${voice}.wav`;
      fs.writeFileSync(filePath, buffer);
      console.log(`OK Voice "${voice}": ${buffer.length} bytes saved`);
    } catch (err: any) {
      console.error(`FAIL Voice "${voice}":`, err?.message || err);
    }
  }
}

async function testASR() {
  const zai = await ZAI.create();
  
  console.log('\n=== Testing ASR with generated audio files ===\n');
  
  const voices = ['tongtong', 'jam', 'kazi'];
  for (const voice of voices) {
    const filePath = `/tmp/tts_${voice}.wav`;
    if (!fs.existsSync(filePath)) continue;
    
    const audioBuffer = fs.readFileSync(filePath);
    const base64 = audioBuffer.toString('base64');
    
    try {
      const result = await zai.audio.asr.create({ file_base64: base64 });
      console.log(`ASR for ${voice}: "${result.text || JSON.stringify(result)}"`);
    } catch (err: any) {
      console.error(`ASR for ${voice} failed:`, err?.message || err);
    }
  }
}

(async () => {
  await testVoices();
  await testASR();
})();
