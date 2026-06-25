import { NextRequest } from 'next/server';
import { createChatCompletionStream, createChatCompletion } from '@/lib/zai-direct';
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

const MAX_HISTORY = 6;

// Проверка — выглядит ли ответ как речь продавца
function isSellerSpeech(text: string): boolean {
  const lower = text.toLowerCase();
  const sellerPhrases = [
    'у нас есть', 'мы предлагаем', 'у нас официальная', 'можем предложить',
    'давайте я вас', 'давайте уточним', 'какую модель вы рассматриваете',
    'это поможет рассчитать', 'примерный ежемесячный', 'при сроке кредита',
    'понимаю ваши сомнения', 'какой автомобиль вас интересует',
    'на все модели', 'завод проходит', 'реальные владельцы',
    'запишу вас', 'оформим', 'наша комплектация', 'наши условия',
    'я готов предложить', 'давайте подберём', 'сколько вы готовы',
    'какой бюджет вы рассматриваете', 'оформить кредит',
  ];
  for (const phrase of sellerPhrases) {
    if (lower.includes(phrase)) return true;
  }
  return false;
}

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

    const fewShot = `
ПРИМЕРЫ правильных реплик КЛИЕНТА:
Продавец: "Здравствуйте! Чем могу помочь?"
Клиент: "Здравствуйте. Я по поводу вашего Haval Jolion. Какая цена выходит?"
Продавец: "От двух миллионов. Для себя или семьи?"
Клиент: "Для семьи. А что с гарантией?"
❌ ЗАПРЕЩЕНО (речь продавца): "у нас есть", "давайте уточним", "какую модель вы рассматриваете", "это поможет рассчитать"`;

    // ВАЖНО: промпт как 'user' (не 'system') — gpt-oss лучше слушается
    // + добавляем жёсткую инструкцию в начале
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
        content: `[Начало звонка. Ты клиент. Первая реплика. Начни: "${openingMsg}"]`,
      });
    } else {
      const recentMessages = messages.slice(-MAX_HISTORY);
      for (const msg of recentMessages) {
        llmMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
      // Добавляем напоминание роли в конце — чтобы модель не забыла
      llmMessages.push({
        role: 'user',
        content: '[ТИ КЛИЕНТ. Не продавай. Спрашивай. Не предлагай решения. Не спрашивай "какую модель". Одна короткая реплика клиента.]',
      });
    }

    console.log('[chat-stream] Сообщений:', llmMessages.length, '| Сценарий:', scenario.id);

    // SSE-стрим
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
          let cleanText = fullText.replace('[[DIALOGUE_END]]', '').trim();

          // ПРОВЕРКА: если ответ выглядит как речь продавца — перегенерируем
          if (isSellerSpeech(cleanText)) {
            console.warn('[chat-stream] ⚠️ Обнаружена речь продавца! Перегенерация...');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: '\n' })}\n\n`));

            // Перегенерация с усиленным напоминанием
            const retryMessages = [...llmMessages, {
              role: 'assistant' as const,
              content: cleanText,
            }, {
              role: 'user' as const,
              content: '[СТОП! Ты только что сказал фразу продавца: "' + cleanText.slice(0, 80) + '". Ты НЕ продавец! Перепиши свою реплику как КЛИЕНТ. Спрашивай, не предлагай. Одна короткая фраза.]',
            }];

            try {
              const retryText = await createChatCompletion(retryMessages);
              if (retryText && !isSellerSpeech(retryText)) {
                console.log('[chat-stream] ✓ Перегенерация успешна');
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: retryText })}\n\n`));
                cleanText = retryText.replace('[[DIALOGUE_END]]', '').trim();
                if (retryText.includes('[[DIALOGUE_END]]')) dialogueEnd = true;
              } else {
                console.warn('[chat-stream] Перегенерация тоже содержит речь продавца, используем как есть');
              }
            } catch (e) {
              console.error('[chat-stream] Перегенерация не удалась:', e instanceof Error ? e.message : e);
            }
          }

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
