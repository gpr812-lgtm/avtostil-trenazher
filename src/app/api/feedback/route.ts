import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { buildFeedbackPrompt } from '@/lib/prompts';
import { getScenarioById } from '@/data/scenarios';

export const runtime = 'nodejs';

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

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'Ты — опытный наставник по продажам. Отвечай СТРОГО в формате JSON, без markdown, без обёрток.',
        },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content || '';

    // Извлекаем JSON из ответа (на случай если модель обернёт в ```json)
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
      return NextResponse.json(
        {
          error: 'Не удалось разобрать ответ модели',
          raw: response,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Feedback API Error:', error);
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
