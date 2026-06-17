import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { buildSystemPrompt } from '@/lib/prompts';
import { getScenarioById } from '@/data/scenarios';
import { getCarById } from '@/data/cars';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  scenarioId: string;
  messages: ChatMessage[];
  carId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { scenarioId, messages, carId } = body;

    if (!scenarioId) {
      return new Response(JSON.stringify({ error: 'scenarioId обязателен' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return new Response(JSON.stringify({ error: 'Сценарий не найден' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Находим выбранный автомобиль (если указан)
    const selectedCar = carId ? getCarById(carId) : undefined;

    const systemPrompt = buildSystemPrompt(scenario, selectedCar);

    const llmMessages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: systemPrompt },
    ];

    if (messages.length === 0) {
      const carHint = selectedCar
        ? ` Клиент звонит по поводу ${selectedCar.brand} ${selectedCar.model}.`
        : '';
      llmMessages.push({
        role: 'user',
        content: `[Начало звонка. Телефон звонит. Продавец берёт трубку. Сгенерируй свою первую реплику клиента в соответствии со сценарием. Начни с: "${scenario.openingMessage}"${carHint}]`,
      });
    } else {
      for (const msg of messages) {
        llmMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    const zai = await ZAI.create();

    // Запрос со stream=true
    const completion: any = await zai.chat.completions.create({
      messages: llmMessages as any,
      thinking: { type: 'disabled' },
      stream: true,
    });

    // SDK возвращает raw SSE-строку — собираем её в одну строку
    let rawSSE = '';
    if (completion && typeof completion[Symbol.asyncIterator] === 'function') {
      for await (const chunk of completion) {
        const text =
          typeof chunk === 'string'
            ? chunk
            : Buffer.isBuffer(chunk)
              ? chunk.toString('utf-8')
              : chunk instanceof Uint8Array
                ? new TextDecoder().decode(chunk)
                : JSON.stringify(chunk);
        rawSSE += text;
      }
    } else if (typeof completion === 'string') {
      rawSSE = completion;
    } else {
      // Если это уже объект с choices — берём контент напрямую
      const content = completion?.choices?.[0]?.message?.content || '';
      rawSSE = `data: {"choices":[{"delta":{"content":${JSON.stringify(content)}}]}\n\ndata: [DONE]\n\n`;
    }

    // Парсим SSE: ищем все "data: {...}" и достаём delta.content
    const deltas: string[] = [];
    const lines = rawSSE.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]' || !dataStr) continue;
        try {
          const data = JSON.parse(dataStr);
          const delta = data?.choices?.[0]?.delta?.content;
          if (delta) deltas.push(delta);
        } catch {
          // Игнорируем битые строки
        }
      }
    }

    const fullText = deltas.join('').replace('[[DIALOGUE_END]]', '').trim();
    const dialogueEnd = deltas.join('').includes('[[DIALOGUE_END]]');

    // Возвращаем как обычный JSON (без реального стриминга)
    // Но добавим streaming-friendly хедер, чтобы клиент мог читать по частям
    return new Response(
      JSON.stringify({
        response: fullText,
        dialogueEnd,
        // Имитация streaming: вернём массив частей для клиентского "печатающего" эффекта
        chunks: splitIntoChunks(fullText, 5),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Chat Stream API Error:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Ошибка при обработке сообщения',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Разбиваем текст на мелкие куски для имитации печати
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  const words = text.split(' ');
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).length > chunkSize) {
      if (current) chunks.push(current + ' ');
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
