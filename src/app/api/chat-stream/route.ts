import { NextRequest } from 'next/server';
import { createChatCompletionStream, correctRussian } from '@/lib/zai-direct';
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

    const selectedCar = carId ? getCarById(carId) : undefined;
    const systemPrompt = buildSystemPrompt(scenario, selectedCar, messages.length);

    // №4: System role вместо assistant — модель лучше слушается
    // №3: Few-shot примеры правильных диалогов
    const fewShotExamples = `
## ПРИМЕРЫ ПРАВИЛЬНЫХ РЕПЛИК КЛИЕНТА (учись на них):
Продавец: "Здравствуйте! Автосалон Автостиль, меня зовут Алексей. Чем могу помочь?"
Клиент: "Здравствуйте. Я по поводу вашего Haval Jolion. Скажите, какая цена выходит?"

Продавец: "От двух миллионов пятидесяти тысяч. Вам для себя или для семьи?"
Клиент: "Для семьи. А что с гарантией?"

Продавец: "Гарантия пять лет или сто тысяч километров. Хотите тест-драйв?"
Клиент: "Давайте. Можно на субботу?"

Продавец: "Дорого. А скидки какие-то есть?"
Клиент: "Ну не знаю. А если в кредит оформить?"

## ПРИМЕРЫ НЕПРАВИЛЬНЫХ РЕПЛИК (это речь ПРОДАВЦА, НЕ говори так):
❌ "У нас есть несколько комплектаций..."
❌ "Могу предложить вам скидку..."
❌ "Давайте я вас запишу на тест-драйв"
❌ "Понимаю ваши сомнения. На все модели гарантия..."
❌ "Какой автомобиль вас интересует?"
`;

    const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt + fewShotExamples },
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
      const carHint = selectedCar
        ? ` Клиент звонит по поводу ${selectedCar.brand} ${selectedCar.model}.`
        : '';
      llmMessages.push({
        role: 'user',
        content: `[Начало звонка. Сгенерируй первую реплику клиента. Начни с: "${openingMsg}"${carHint}]`,
      });
    } else {
      for (const msg of messages) {
        llmMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    console.log('[chat-stream] Стриминг к OpenRouter...');
    console.log('[chat-stream] Сообщений:', llmMessages.length, '| Сценарий:', scenario.id);

    // SSE-стрим — текст идёт по словам, пропуская reasoning
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        let dialogueEnd = false;
        try {
          const aiStream = createChatCompletionStream(llmMessages);
          for await (const delta of aiStream) {
            fullText += delta;
            // Отправляем каждый content-токен сразу (без коррекции — для скорости)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }

          if (fullText.includes('[[DIALOGUE_END]]')) {
            dialogueEnd = true;
          }
          let cleanText = fullText.replace('[[DIALOGUE_END]]', '').trim();

          // №1: Постобработка — исправление русского языка
          console.log('[chat-stream] Коррекция русского...');
          const correctedText = await correctRussian(cleanText);
          if (correctedText !== cleanText) {
            console.log('[chat-stream] ✓ Текст исправлен');
            cleanText = correctedText;
          }

          // Отправляем финальный исправленный текст
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullText: cleanText, dialogueEnd })}\n\n`));
          controller.close();
          console.log('[chat-stream] ✓ Стрим завершён, длина:', cleanText.length);
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
