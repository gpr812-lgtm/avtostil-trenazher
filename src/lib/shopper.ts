// Критерии оценки по системе "Шопер" (Mystery Shopper)
// Основано на файле шопер.xlsx

export interface ShopperCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

export const shopperCriteria: ShopperCriterion[] = [
  {
    id: 'greeting',
    name: 'Приветствие',
    description: 'Поприветствовал ли клиент корректно при ответе на звонок',
    maxScore: 2,
  },
  {
    id: 'name_usage',
    name: 'Обращение по имени',
    description: 'Обращался ли к клиенту по имени не менее 3 раз за разговор',
    maxScore: 2,
  },
  {
    id: 'location',
    name: 'Откуда обращается',
    description: 'Выяснил, откуда клиент обращается (город/район)',
    maxScore: 2,
  },
  {
    id: 'for_whom',
    name: 'Для кого подбирает',
    description: 'Выяснил, для кого подбирает автомобиль (себе, семье и т.д.)',
    maxScore: 2,
  },
  {
    id: 'familiarity',
    name: 'Знаком ли с а/м',
    description: 'Выяснил, знаком ли клиент с автомобилями данного бренда',
    maxScore: 5,
  },
  {
    id: 'timing',
    name: 'Сроки покупки',
    description: 'Выяснил сроки планируемой покупки',
    maxScore: 5,
  },
  {
    id: 'urgency',
    name: 'Срочность',
    description: 'Выяснил срочность покупки',
    maxScore: 8,
  },
  {
    id: 'finance',
    name: 'Программы кредитования',
    description: 'Предложил программы кредитования (две программы Chery Finance) и их выгоды',
    maxScore: 5,
  },
  {
    id: 'current_car',
    name: 'Каким а/м владеет',
    description: 'Выяснил, каким автомобилем владеет, и планирует ли сдавать в зачёт',
    maxScore: 5,
  },
  {
    id: 'trade_in',
    name: 'Предложить трейд-ин',
    description: 'Предложил трейд-ин и рассказал о выгодах',
    maxScore: 5,
  },
  {
    id: 'test_drive',
    name: 'Тест-драйв',
    description: 'Предложил тест-драйв, привёл не менее 3 аргументов в пользу бренда',
    maxScore: 10,
  },
  {
    id: 'objections',
    name: 'Отработка возражений',
    description: 'Отработал возражения по характеристикам, преимуществам и выгодам',
    maxScore: 2,
  },
  {
    id: 'address',
    name: 'Адрес салона',
    description: 'Сообщил адрес салона, режим работы, как добраться',
    maxScore: 4,
  },
  {
    id: 'contacts',
    name: 'Контактные данные',
    description: 'Собрал контактные данные клиента, выяснил удобный способ связи',
    maxScore: 5,
  },
  {
    id: 'sms_card',
    name: 'СМС-визитка',
    description: 'Предложил отправить СМС-визитку в течение 5 минут',
    maxScore: 4,
  },
  {
    id: 'summary',
    name: 'Резюме звонка',
    description: 'Подвёл итоги звонка — резюмировал договорённости',
    maxScore: 4,
  },
  {
    id: 'gratitude',
    name: 'Благодарность за звонок',
    description: 'Поблагодарил клиента за звонок',
    maxScore: 2,
  },
  {
    id: 'visit_arguments',
    name: 'Аргументы для поездки в ДЦ',
    description: 'Привёл не менее 3 аргументов для поездки в дилерский центр',
    maxScore: 10,
  },
  {
    id: 'invitation',
    name: 'Приглашение в салон',
    description: 'Пригласил в салон не менее 2 раз за разговор',
    maxScore: 8,
  },
  {
    id: 'appointment',
    name: 'Назначена встреча',
    description: 'Назначил встречу (дата/время) или следующий контакт (дата/время)',
    maxScore: 10,
  },
];

export const shopperMaxTotal = shopperCriteria.reduce((sum, c) => sum + c.maxScore, 0); // 100

export interface ShopperScore {
  criterionId: string;
  score: number;
  comment: string;
}

export interface ShopperFeedback {
  scores: ShopperScore[];
  totalScore: number;
  maxTotal: number;
  percentage: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

// Промпт для ИИ-оценки по системе шопер
export function buildShopperPrompt(
  dialogue: Array<{ role: string; content: string }>,
  scenario: { title: string; description: string; customerGoal: string }
): string {
  const dialogueText = dialogue
    .map(m => `${m.role === 'user' ? 'ПРОДАВЕЦ' : 'КЛИЕНТ'}: ${m.content.replace('[[DIALOGUE_END]]', '')}`)
    .join('\n\n');

  const criteriaList = shopperCriteria
    .map(c => `  "${c.id}": <0-${c.maxScore}> — ${c.name} (макс ${c.maxScore} баллов). ${c.description}`)
    .join('\n');

  return `Ты — опытный тайный покупатель (шопер) в автосалоне. Оцени продавца-консультанта по строгой системе оценки звонка.

## СЦЕНАРИЙ
${scenario.title} — ${scenario.description}
Цель клиента: ${scenario.customerGoal}

## ДИАЛОГ

${dialogueText}

## КРИТЕРИИ ОЦЕНКИ (20 критериев, всего 100 баллов)

Оцени каждый критерий от 0 до максимального балла:

${criteriaList}

## ПРАВИЛА ОЦЕНКИ
- 0 баллов = критерий полностью не выполнен
- Половина = выполнен частично
- Максимум = выполнен полностью
- Оценивай ТОЛЬКО на основе диалога выше
- Если продавец не спрашивал что-то — ставь 0 за этот критерий
- Если продавец спросил, но не углубил — половина баллов

## ФОРМАТ ОТВЕТА (СТРОГО JSON)

{
  "scores": {
${shopperCriteria.map(c => `    "${c.id}": <0-${c.maxScore}>`).join(',\n')}
  },
  "totalScore": <сумма всех баллов от 0 до 100>,
  "summary": "<2-3 предложения: общая оценка работы продавца>",
  "strengths": ["<сильная сторона 1>", "<сильная сторона 2>"],
  "weaknesses": ["<что не сделал 1>", "<что не сделал 2>"],
  "recommendations": ["<рекомендация 1>", "<рекомендация 2>"]
}

Верни ТОЛЬКО валидный JSON, без markdown, без обёрток.`;
}
