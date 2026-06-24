import { NextRequest } from 'next/server';
import { createChatCompletionStream } from '@/lib/zai-direct';
import { buildSystemPrompt } from '@/lib/prompts';
import { getScenarioById } from '@/data/scenarios';
import { getCarById } from '@/data/cars';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  scenarioId: string;
  messages: ChatMessage[];
  carId?: string;
}

const MAX_HISTORY = 6; // №2: только последние 6 реплик для скорости

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { scenarioId, messages, carId } = body;

    if (!scenarioId) {
      return new Response(JSON.stringify({ error: 'scenarioId обязателен' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return new Response(JSON.stringify({ error: 'Сценарий не найден' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const selectedCar = carId ? getCarById(carId) : undefined;
    const systemPrompt = buildSystemPrompt(scenario, selectedCar, messages.length);

    // №3: Сокращённый промпт — few-shot примеры только 2 (было 5)
    const fewShot = `
ПРИМЕРЫ:
Продавец: "Здравствуйте! Чем могу помочь?"
Клиент: "Здравствуйте. Я по поводу вашего Haval Jolion. Какая цена выходит?"
Продавец: "От двух миллионов. Для себя или семьи?"
Клиент: "Для семьи. А что с гарантией?"
❌ НЕ: "У нас есть комплектации", "Понимаю ваши сомнения", "Какой авто интересует"`;

    const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt + fewShot },
    ];

    if (messages.length === 0) {
      let openingMsg = scenario.openingMessage;
      if (selectedCar) {
        const carName = `${selectedCar.brand} ${selectedCar.model}`;
        const priceMln = (selectedCar.priceFrom / 1000000).toFixed(1).replace('.0', '');
        openingMsg = openingMsg.replace(/\{CAR\}/g, carName).replace(/\{PRICE\}/g, priceMln);
      } else {
        openingMsg = openingMsg.replace(/\{CAR\}/g, 'ваш автомобиль').replace(/\{PRICE\}/g, 'два с половиной');
      }
      llmMessages.push({
        role: 'user',
        content: `[Начало звонка. Первая реплика клиента. Начни: "${openingMsg}"]`,
      });
    } else {
      // №2: Ограничиваем историю — последние MAX_HISTORY реплик
      const recentMessages = messages.slice(-MAX_HISTORY);
      for (const msg of recentMessages) {
        llmMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    console.log('[chat-stream] Сообщений:', llmMessages.length, '| Сценарий:', scenario.id);

    // SSE-стрим — БЕЗ постобработки (№1: убрали correctRussian для скорости)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        let dialogueEnd = false;
        try {
          const aiStream = createChatCompletionStream(llmMessages);
          for await (const delta of aiStream) {
            fullText += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }

          if (fullText.includes('[[DIALOGUE_END]]')) dialogueEnd = true;
          const cleanText = fullText.replace('[[DIALOGUE_END]]', '').trim();

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullText: cleanText, dialogueEnd })}\n\n`));
          controller.close();
          console.log('[chat-stream] ✓ Готово:', cleanText.length, 'симв.');
        } catch (err) {
          console.error('[chat-stream] ✗ Ошибка:', err instanceof Error ? err.message : err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream error' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[chat-stream] Ошибка:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Ошибка' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
