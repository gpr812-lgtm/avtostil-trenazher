import ZAI from 'z-ai-web-dev-sdk';

(async () => {
  const zai = await ZAI.create();

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: 'Ты помощник.' },
      { role: 'user', content: 'Скажи привет на русском' },
    ],
    thinking: { type: 'disabled' },
    stream: true,
  });

  let count = 0;
  for await (const chunk of completion as any) {
    // Возможно это Uint8Array или строка
    const text = typeof chunk === 'string'
      ? chunk
      : Buffer.isBuffer(chunk)
        ? chunk.toString('utf-8')
        : typeof chunk === 'object' && chunk instanceof Uint8Array
          ? new TextDecoder().decode(chunk)
          : JSON.stringify(chunk);
    console.log(`Chunk ${count}:`, text.slice(0, 500));
    console.log('---');
    count++;
    if (count > 10) break;
  }
  console.log(`Total: ${count}`);
})();
