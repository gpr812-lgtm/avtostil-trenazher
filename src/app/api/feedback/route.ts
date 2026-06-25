import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion } from '@/lib/zai-direct';
import { buildFeedbackPrompt } from '@/lib/prompts';
import { getScenarioById } from '@/data/scenarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface FeedbackRequest {
  scenarioId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const { scenarioId, messages }: FeedbackRequest = await req.json();

    if (!scenarioId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Некорректные данные запроса' },
        { status: 400 }
      );
    }

    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Сценарий не найден' },
        { status: 404 }
      );
    }

    const prompt = buildFeedbackPrompt(messages, scenario);

    console.log('[feedback] Запрос обратной связи. Сообщений:', messages.length, '| Сценарий:', scenario.id);

    // Используем OpenRouter (как и chat-stream) — не z-ai-web-dev-sdk
    // Для feedback нужен большой лимит — JSON с 8 оценками + развёрнутые комментарии
    const response = await createChatCompletion([
      {
        role: 'assistant',
        content:
          'Ты — опытный наставник по продажам. Отвечай СТРОГО в формате JSON, без markdown, без обёрток. Только валидный JSON.',
      },
      { role: 'user', content: prompt },
    ], { maxTokens: 2000, temperature: 0.4 });

    console.log('[feedback] Получен ответ, длина:', response.length);

    // Извлекаем JSON из ответа
    let jsonText = response.trim();
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      const plainMatch = jsonText.match(/```\s*([\s\S]*?)```/);
      if (plainMatch) jsonText = plainMatch[1].trim();
    }

    // Пытаемся найти {...}
    if (!jsonText.startsWith('{')) {
      const braceMatch = jsonText.match(/(\{[\s\S]*\})/);
      if (braceMatch) jsonText = braceMatch[1];
    }

    let feedback;
    try {
      feedback = JSON.parse(jsonText);
    } catch (e) {
      console.error('[feedback] Не удалось разобрать JSON:', jsonText.slice(0, 300));
      return NextResponse.json(
        {
          error: 'Не удалось разобрать ответ модели',
          raw: response,
        },
        { status: 500 }
      );
    }

    console.log('[feedback] ✓ Успешно. Total score:', feedback.totalScore);
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('[feedback] Ошибка:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ошибка при генерации обратной связи',
      },
      { status: 500 }
    );
  }
}
