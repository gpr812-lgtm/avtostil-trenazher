import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { buildShopperPrompt, shopperCriteria } from '@/lib/shopper';
import { getScenarioById } from '@/data/scenarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RequestBody {
  scenarioId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const { scenarioId, messages }: RequestBody = await req.json();

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

    const prompt = buildShopperPrompt(messages, scenario);

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'Ты — опытный тайный покупатель. Отвечай СТРОГО в формате JSON, без markdown, без обёрток.',
        },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content || '';

    // Извлекаем JSON
    let jsonText = response.trim();
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      const plainMatch = jsonText.match(/```\s*([\s\S]*?)```/);
      if (plainMatch) jsonText = plainMatch[1].trim();
    }
    if (!jsonText.startsWith('{')) {
      const braceMatch = jsonText.match(/(\{[\s\S]*\})/);
      if (braceMatch) jsonText = braceMatch[1];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: 'Не удалось разобрать ответ модели', raw: response },
        { status: 500 }
      );
    }

    // Преобразуем в наш формат
    const scores = shopperCriteria.map(c => ({
      criterionId: c.id,
      score: Math.min(parsed.scores?.[c.id] ?? 0, c.maxScore),
      comment: '',
    }));

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const maxTotal = shopperCriteria.reduce((sum, c) => sum + c.maxScore, 0);
    const percentage = Math.round((totalScore / maxTotal) * 100);

    return NextResponse.json({
      feedback: {
        scores,
        totalScore,
        maxTotal,
        percentage,
        summary: parsed.summary || '',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || [],
      },
    });
  } catch (error) {
    console.error('Shopper API Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ошибка при оценке',
      },
      { status: 500 }
    );
  }
}
