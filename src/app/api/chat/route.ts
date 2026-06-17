import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { buildSystemPrompt, buildCarCatalogText } from '@/lib/prompts';
import { getScenarioById } from '@/data/scenarios';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  scenarioId: string;
  messages: ChatMessage[];
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { scenarioId, messages } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId обязателен' },
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

    const carCatalog = buildCarCatalogText();
    const systemPrompt = buildSystemPrompt(scenario, carCatalog);

    // Подготовка сообщений для LLM
    // System prompt + инструкция о первой реплике — одним сообщением
    const fullSystemPrompt = `${systemPrompt}

## ПЕРВОЕ СООБЩЕНИЕ

Сейчас начни диалог СВОЕЙ первой репликой клиента:
"${scenario.openingMessage}"

После этого жди ответа продавца и продолжай диалог в роли клиента.`;

    const llmMessages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: fullSystemPrompt },
    ];

    if (messages.length === 0) {
      // Первый вызов — нужен user-запрос, чтобы модель начала генерацию
      llmMessages.push({
        role: 'user',
        content:
          '[Начало звонка. Телефон звонит. Продавец берёт трубку. Сгенерируй свою первую реплику клиента в соответствии со сценарием.]',
      });
    } else {
      // Добавляем историю диалога
      for (const msg of messages) {
        llmMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: llmMessages as any,
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content;

    if (!response || response.trim().length === 0) {
      return NextResponse.json(
        { error: 'Пустой ответ от модели' },
        { status: 500 }
      );
    }

    // Проверяем, не завершён ли диалог
    const isDialogueEnd = response.includes('[[DIALOGUE_END]]');
    const cleanResponse = response.replace('[[DIALOGUE_END]]', '').trim();

    return NextResponse.json({
      response: cleanResponse,
      dialogueEnd: isDialogueEnd,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ошибка при обработке сообщения',
      },
      { status: 500 }
    );
  }
}
