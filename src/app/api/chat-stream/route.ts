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

const MAX_HISTORY = 8; // увеличил с 6 до 8 — нужно помнить больше контекста

// ───────────────────────────────────────────────────────────────────────────
// 1. ДЕТЕКТОР РЕЧИ ПРОДАВЦА — если бот вдруг начал продавать
// ───────────────────────────────────────────────────────────────────────────
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
    'приглашаю на тест-драйв', 'приезжайте к нам',
  ];
  for (const phrase of sellerPhrases) {
    if (lower.includes(phrase)) return true;
  }
  return false;
}

// ───────────────────────────────────────────────────────────────────────────
// 2. ДЕТЕКТОР ВОПРОСОВ ПРОДАВЦА — что спросил продавец в последней реплике
// ───────────────────────────────────────────────────────────────────────────
type SellerQuestionType =
  | 'name'           // "как к вам обращаться", "как вас зовут"
  | 'car_interest'   // "какой автомобиль вас интересует", "что ищете"
  | 'for_whom'       // "для себя или семьи"
  | 'budget'         // "какой бюджет", "на какую сумму"
  | 'trade_in'       // "есть ли трейд-ин", "старая машина"
  | 'when_buy'       // "когда планируете покупку"
  | 'how_pay'        // "как планируете платить", "кредит или наличные"
  | 'phone'          // "оставьте телефон", "как с вами связаться"
  | 'city'           // "из какого вы города"
  | 'experience'     // "была ли машина раньше", "какой опыт"
  | 'test_drive'     // "когда удобно на тест-драйв"
  | 'color'          // "какой цвет хотите"
  | 'configuration'  // "какая комплектация"
  | 'other';

interface SellerQuestion {
  type: SellerQuestionType;
  raw: string;
}

function detectSellerQuestions(sellerText: string): SellerQuestion[] {
  const lower = sellerText.toLowerCase();
  const questions: SellerQuestion[] = [];

  // Разбиваем на предложения/фразы
  const phrases = sellerText.split(/[.?!]\s+|\n+/).map(s => s.trim()).filter(s => s.length > 2);

  const rules: Array<{ type: SellerQuestionType; patterns: RegExp[] }> = [
    { type: 'name', patterns: [
      /как (к вам|вас) обращаться/,
      /как вас зовут/,
      /как ваше имя/,
      /представьтесь/,
      /могу я узнать ваше имя/,
      /как мне к вам обращаться/,
    ]},
    { type: 'car_interest', patterns: [
      /какой (автомобиль|машин[ау]) вас интересует/,
      /какую (машину|модель|марку) вы (ищете|рассматриваете|хотите)/,
      /что вас интересует/,
      /что (ищете|хотите найти)/,
      /какой (авто|кар)\s/,
      /что за машина/,
    ]},
    { type: 'for_whom', patterns: [
      /для (себя|семьи)/,
      /себе или (семье|семье)/,
      /кому машина/,
      /для кого/,
    ]},
    { type: 'budget', patterns: [
      /какой бюджет/,
      /на какую сумму/,
      /сколько (вы )?готов[ыи] потратить/,
      /в каком (диапазоне|ценовом)/,
      /сумма покупки/,
    ]},
    { type: 'trade_in', patterns: [
      /трейд[- ]?ин/,
      /старая машина/,
      /будете ли сдавать/,
      /есть ли что сдавать/,
      /в зачёт/,
    ]},
    { type: 'when_buy', patterns: [
      /когда планируете покупку/,
      /когда хотите купить/,
      /когда (собираетесь|планируете)/,
      /сроки? покупк/,
      /в какие сроки/,
    ]},
    { type: 'how_pay', patterns: [
      /как планируете платит/,
      /кредит или наличн/,
      /наличные или кредит/,
      /форма оплаты/,
      /рассрочк[ау]/,
    ]},
    { type: 'phone', patterns: [
      /оставьте (телефон|контакт)/,
      /как с вами связаться/,
      /ваш (телефон|номер)/,
      /контактный телефон/,
      /номер для связи/,
    ]},
    { type: 'city', patterns: [
      /из какого вы города/,
      /в каком городе/,
      /где находитесь/,
      /ваш город/,
    ]},
    { type: 'experience', patterns: [
      /была ли машина раньше/,
      /какой опыт вожд/,
      /раньше что ездили/,
      /на чём раньше ездили/,
    ]},
    { type: 'test_drive', patterns: [
      /когда удобно на тест-драйв/,
      /тест-драйв когда/,
      /записать на тест-драйв/,
    ]},
    { type: 'color', patterns: [
      /какой цвет/,
      /цвет (хотите|предпочитаете)/,
    ]},
    { type: 'configuration', patterns: [
      /какая комплектация/,
      /комплектацию какую/,
      /передний или полный/,
      /механика или автомат/,
    ]},
  ];

  for (const phrase of phrases) {
    const pl = phrase.toLowerCase();
    for (const rule of rules) {
      if (rule.patterns.some(p => p.test(pl))) {
        questions.push({ type: rule.type, raw: phrase });
        break;
      }
    }
  }

  // Если ни одного вопроса не нашли — но в тексте есть "?" — это "other"
  if (questions.length === 0 && /\?/.test(sellerText)) {
    questions.push({ type: 'other', raw: sellerText.trim() });
  }

  return questions;
}

// ───────────────────────────────────────────────────────────────────────────
// 3. ПРОВЕРКА — ответил ли бот на вопрос продавца
// ───────────────────────────────────────────────────────────────────────────
function botAnswersQuestion(botText: string, sellerQuestions: SellerQuestion[], scenario: any, selectedCar: any): boolean {
  if (sellerQuestions.length === 0) return true; // продавец не спрашивал — нечего отвечать
  const lower = botText.toLowerCase();
  const customerName = (scenario?.customerName || '').toLowerCase();
  const carName = selectedCar ? `${selectedCar.brand} ${selectedCar.model}`.toLowerCase() : '';

  for (const q of sellerQuestions) {
    switch (q.type) {
      case 'name':
        // бот должен назвать своё имя
        if (!lower.includes('меня зовут') &&
            !lower.includes(`я ${customerName}`) &&
            !lower.includes(customerName)) {
          return false;
        }
        break;
      case 'car_interest':
        // бот должен назвать марку/модель
        if (carName && !lower.includes(selectedCar.brand.toLowerCase()) &&
            !lower.includes(selectedCar.model.toLowerCase())) {
          return false;
        }
        break;
      case 'for_whom':
        if (!lower.includes('семь') && !lower.includes('себе') && !lower.includes('жен') && !lower.includes('дет')) {
          return false;
        }
        break;
      case 'budget':
        if (!lower.match(/\d|миллион|тысяч|млн|рубл/)) return false;
        break;
      case 'trade_in':
        if (!lower.includes('трейд') && !lower.includes('зачёт') && !lower.includes('сдать') &&
            !lower.includes('нет') && !lower.includes('не')) return false;
        break;
      case 'when_buy':
        if (!lower.match(/скоро|на днях|через|месяц|недел|завтра|сегодня|пока не|не решил/)) return false;
        break;
      case 'how_pay':
        if (!lower.match(/наличн|кредит|рассрочк|карт|наличные/)) return false;
        break;
      case 'phone':
        if (!lower.match(/\d|телефон|набер|перезвон/)) return false;
        break;
      case 'city':
        if (!lower.match(/москва|питер|спб|мск|город|[а-я]{4,}/)) return false;
        break;
      case 'experience':
        // Опциональный вопрос — не блокируем
        break;
      case 'color':
        if (!lower.match(/белый|чёрный|серый|синий|красный|цвет|без разниц|любой/)) return false;
        break;
      case 'configuration':
        if (!lower.match(/передний|полный|механик|автомат|передне|задн|привод/)) return false;
        break;
      case 'test_drive':
        if (!lower.match(/тест-драйв|тест|приехать|заехать|когда можно/)) return false;
        break;
      case 'other':
        // Не блокируем — слишком общий вопрос
        break;
    }
  }
  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// 4. ДЕТЕКТОР ПОВТОРОВ — расширенный: детектит и УЖЕ ЗАДАННЫЕ вопросы,
//    и ТЕМЫ, которые бот/продавец уже назвал
// ───────────────────────────────────────────────────────────────────────────
interface RepetitionCheck {
  isRepeating: boolean;
  reason: string;
}

function checkRepetition(newText: string, history: ChatMessage[]): RepetitionCheck {
  const lower = newText.toLowerCase();

  // Что бот уже говорил
  const botMessages = history.filter(m => m.role === 'assistant').map(m => m.content.toLowerCase());
  // Что продавец говорил (может уже назвал цену/гарантию)
  const sellerMessages = history.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  const allText = [...botMessages, ...sellerMessages].join(' ');

  // Карта тем → паттерны
  const topicPatterns: Array<{ topic: string; inNew: RegExp[]; inHistory: RegExp[] }> = [
    {
      topic: 'цена',
      inNew: [/сколько стоит/, /какая цена/, /какая стоимость/, /цена выходит/, /почему так дорого/, /за сколько/],
      inHistory: [/\d\s*миллион/, /\d\s*млн/, /\d{6}/, /от \d/, /цена/, /стоимость/, /за неё/, /за него/, /дорого/],
    },
    {
      topic: 'гарантия',
      inNew: [/какая гарантия/, /что с гарантией/, /гарантия какая/, /гаранти/],
      inHistory: [/гаранти/],
    },
    {
      topic: 'скидки',
      inNew: [/какие скидки/, /скидки есть/, /скидк[ау]/, /бонус/],
      inHistory: [/скидк/, /бонус/, /подарок/],
    },
    {
      topic: 'тест-драйв',
      inNew: [/тест-драйв можно/, /тест-драйв/],
      inHistory: [/тест-драйв/, /тест драйв/],
    },
    {
      topic: 'кредит',
      inNew: [/кредит/, /рассрочк/],
      inHistory: [/кредит/, /рассрочк/, /в кредит/, /ежемесячн/],
    },
    {
      topic: 'трейд-ин',
      inNew: [/в зачёт/, /трейд[- ]?ин/, /старую сдать/],
      inHistory: [/трейд/, /в зачёт/, /старую машину/, /сдать стар/],
    },
    {
      topic: 'сроки',
      inNew: [/когда можно приехать/, /когда можно/, /сроки/, /когда забирать/],
      inHistory: [/когда можно/, /срок[иу]/, /через.*дн/, /через.*недел/, /приехать/],
    },
    {
      topic: 'комплектация',
      inNew: [/какая комплектация/, /комплектация/],
      inHistory: [/комплектаци/],
    },
    {
      topic: 'доставка',
      inNew: [/когда достав/, /доставка/],
      inHistory: [/доставк/, /привез/],
    },
  ];

  for (const t of topicPatterns) {
    const newMatch = t.inNew.some(p => p.test(lower));
    if (!newMatch) continue;

    const historyMatch = t.inHistory.some(p => p.test(allText));
    if (historyMatch) {
      // Дополнительная проверка: если бот в новой реплике только спрашивает "цена?" — это повтор.
      // Но если бот ссылается на названное ("вы же говорили два миллиона") — это НЕ повтор.
      const isReferencing =
        /же говорил|вы (говорили|назвали|сказали)|как вы (и|уже) сказали|вы упомянул|раньше сказали|вы назвал/.test(lower) ||
        (lower.match(/дорог|дёшев|нормально|понятно|угу|ага|ясно|хорошо/) && lower.length < 80);

      if (!isReferencing) {
        return {
          isRepeating: true,
          reason: `Повтор темы "${t.topic}" — уже упоминалась в диалоге`,
        };
      }
    }
  }

  return { isRepeating: false, reason: '' };
}

// ───────────────────────────────────────────────────────────────────────────
// 5. ДЕТЕКТОР ПРЯМЫХ ПОВТОРОВ — бот дословно повторяет свою прошлую реплику
// ───────────────────────────────────────────────────────────────────────────
function isExactRepetition(newText: string, history: ChatMessage[]): boolean {
  const lower = newText.toLowerCase().replace(/[^а-яё0-9 ?!.,]/gi, '').trim();
  if (lower.length < 5) return false;
  for (const m of history.filter(m => m.role === 'assistant')) {
    const prev = m.content.toLowerCase().replace(/[^а-яё0-9 ?!.,]/gi, '').trim();
    if (prev.length < 5) continue;
    // Полное совпадение
    if (prev === lower) return true;
    // 80% совпадение по словам
    const words1 = lower.split(/\s+/);
    const words2 = prev.split(/\s+/);
    if (words1.length >= 3 && words2.length >= 3) {
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      let common = 0;
      for (const w of set1) if (set2.has(w)) common++;
      const similarity = common / Math.min(set1.size, set2.size);
      if (similarity > 0.75) return true;
    }
  }
  return false;
}

// ───────────────────────────────────────────────────────────────────────────
// 6. ГЕНЕРАЦИЯ НАПОМИНАНИЯ ДЛЯ БОТА — динамическое, на основе вопросов продавца
// ───────────────────────────────────────────────────────────────────────────
function buildDynamicReminder(
  sellerQuestions: SellerQuestion[],
  history: ChatMessage[],
  scenario: any,
  selectedCar: any,
): string {
  const parts: string[] = [];

  // 6.1 — если продавец задал вопрос, бот ДОЛЖЕН ответить
  if (sellerQuestions.length > 0) {
    const examples: Record<string, string> = {
      name: `Меня зовут ${scenario?.customerName || 'Дмитрий'}.`,
      car_interest: selectedCar
        ? `${selectedCar.brand} ${selectedCar.model}.`
        : 'Haval Jolion.',
      for_whom: 'Для семьи.',
      budget: 'Два миллиона примерно.',
      trade_in: 'Старую сдать хочу, да.',
      when_buy: 'На этой неделе планирую.',
      how_pay: 'Наличными скорее всего.',
      phone: 'Телефон продиктую.',
      city: 'Из Москвы.',
      experience: 'Раньше на Ладе ездил.',
      test_drive: 'На тест-драйв готов.',
      color: 'Цвет любой, не принципиально.',
      configuration: 'Полный привод хочу.',
      other: '',
    };
    const answerHints = sellerQuestions
      .map(q => examples[q.type])
      .filter(Boolean);
    if (answerHints.length > 0) {
      parts.push(`ПРОДАВЕЦ ЗАДАЛ ВОПРОС(ы). ОТВЕТЬ на него СНАЧАЛА. Например: "${answerHints[0]}". Потом задай свой вопрос или выскажи мысль.`);
    }
  }

  // 6.2 — список уже затронутых тем
  const botMessages = history.filter(m => m.role === 'assistant');
  const sellerMessages = history.filter(m => m.role === 'user');
  const allText = [...botMessages, ...sellerMessages].map(m => m.content.toLowerCase()).join(' ');

  const mentioned: string[] = [];
  if (/\d\s*миллион|\d\s*млн|\d{6}|от \d/.test(allText)) mentioned.push('цену');
  if (/гаранти/.test(allText)) mentioned.push('гарантию');
  if (/скидк|бонус/.test(allText)) mentioned.push('скидки');
  if (/тест-драйв/.test(allText)) mentioned.push('тест-драйв');
  if (/кредит|рассрочк/.test(allText)) mentioned.push('кредит');
  if (/трейд|в зачёт/.test(allText)) mentioned.push('трейд-ин');
  if (/срок[иу]|когда можно|приехать/.test(allText)) mentioned.push('сроки');

  if (mentioned.length > 0) {
    parts.push(`Уже обсуждали: ${mentioned.join(', ')}. НЕ переспрашивай это. Если хочешь вернуться — сошлись на сказанное: "вы же говорили...".`);
  }

  // 6.3 — финальное напоминание роли
  parts.push('Ты КЛИЕНТ. Говори как живой человек: 1-2 коротких предложения. Сначала реакция/ответ, потом вопрос. Без эмодзи, markdown, скобок.');

  return `[НАПОМИНАНИЕ: ${parts.join(' ')}]`;
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────────
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

    // few-shot примеры — с акцентом на "ответить потом спросить"
    const fewShot = `
ПРИМЕРЫ правильных реплик КЛИЕНТА (живой человек):

Продавец: "Здравствуйте! Меня зовут Игорь. Как к вам обращаться?"
Клиент: "Дмитрий. Я по поводу Haval Jolion. Сколько стоит?"

Продавец: "Дмитрий, какой автомобиль вас интересует?"
Клиент: "Я же говорю — Jolion. Сколько выйдет с полным приводом?"

Продавец: "От двух миллионов сто пятьдесят. Для себя или семьи?"
Клиент: "Для семьи. Дорого, однако. А скидки есть?"

Продавец: "Две сто пятьдесят — это с гарантией три года."
Клиент: "Понятно. А тест-драйв можно на выходных?"

❌ ЗАПРЕЩЕНО (речь продавца): "у нас есть", "давайте уточним", "какую модель вы рассматриваете", "оформим", "запишу вас".
❌ ЗАПРЕЩЕНО переспрашивать: если ты уже спрашивал цену — не спрашивай снова. Если продавец назвал цену — не переспрашивай.`;

    const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt + fewShot },
    ];

    // Начало диалога
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
      // Анализируем ПОСЛЕДНЕЕ сообщение продавца — какие вопросы он задал
      const lastSellerMessage = [...messages].reverse().find(m => m.role === 'user');
      const sellerQuestions = lastSellerMessage
        ? detectSellerQuestions(lastSellerMessage.content)
        : [];

      // Берём последние N сообщений
      const recentMessages = messages.slice(-MAX_HISTORY);
      for (const msg of recentMessages) {
        llmMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      // Динамическое напоминание
      const reminder = buildDynamicReminder(sellerQuestions, messages, scenario, selectedCar);
      llmMessages.push({ role: 'user', content: reminder });

      console.log('[chat-stream] Вопросы продавца:', sellerQuestions.map(q => q.type).join(', ') || 'нет');
    }

    console.log('[chat-stream] Сообщений:', llmMessages.length, '| Сценарий:', scenario.id);

    // ─── SSE-стрим ────────────────────────────────────────────────────────
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

          // Анализ для self-correction
          const lastSellerMessage = [...messages].reverse().find(m => m.role === 'user');
          const sellerQuestions = lastSellerMessage
            ? detectSellerQuestions(lastSellerMessage.content)
            : [];

          let needRegenerate = false;
          let regenerateReason = '';

          // ─── ПРОВЕРКА 1: речь продавца ──────────────────────────────────
          if (isSellerSpeech(cleanText)) {
            console.warn('[chat-stream] ⚠️ Речь продавца! Перегенерация...');
            needRegenerate = true;
            regenerateReason = 'seller_speech';
          }

          // ─── ПРОВЕРКА 2: дословный повтор прошлой реплики ───────────────
          if (!needRegenerate && isExactRepetition(cleanText, messages)) {
            console.warn('[chat-stream] ⚠️ Дословный повтор! Перегенерация...');
            needRegenerate = true;
            regenerateReason = 'exact_repetition';
          }

          // ─── ПРОВЕРКА 3: повтор темы (уже обсуждали) ────────────────────
          if (!needRegenerate) {
            const rep = checkRepetition(cleanText, messages);
            if (rep.isRepeating) {
              console.warn('[chat-stream] ⚠️ Повтор темы:', rep.reason);
              needRegenerate = true;
              regenerateReason = 'topic_repetition';
            }
          }

          // ─── ПРОВЕРКА 4: бот НЕ ответил на вопрос продавца ──────────────
          if (!needRegenerate && sellerQuestions.length > 0) {
            const answered = botAnswersQuestion(cleanText, sellerQuestions, scenario, selectedCar);
            if (!answered) {
              console.warn('[chat-stream] ⚠️ Бот не ответил на вопрос продавца:', sellerQuestions.map(q => q.type).join(', '));
              needRegenerate = true;
              regenerateReason = 'unanswered_question';
            }
          }

          // ─── ПЕРЕГЕНЕРАЦИЯ ──────────────────────────────────────────────
          if (needRegenerate) {
            // Передаём вниз инфу, что начинаем пересоздавать
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: '\n' })}\n\n`));

            // Готовим специфичное напоминание
            let retryInstruction = '';
            if (regenerateReason === 'seller_speech') {
              retryInstruction = `[СТОП! Ты сказал фразу продавца: "${cleanText.slice(0, 80)}". Ты НЕ продавец, ты КЛИЕНТ. Перепиши как клиент: спроси, сомневайся, реагируй. Одна короткая фраза.]`;
            } else if (regenerateReason === 'exact_repetition') {
              retryInstruction = `[СТОП! Ты повторил свою прошлую реплику дословно. Скажи НОВОЕ — либо реакцию на слова продавца, либо новый вопрос про другую тему. Одна короткая фраза.]`;
            } else if (regenerateReason === 'topic_repetition') {
              retryInstruction = `[СТОП! Ты переспрашиваешь то, что уже обсуждали. НЕ переспрашивай. Реагируй на ответ продавца или задай НОВЫЙ вопрос про другую тему. Если хочешь вернуться к старой теме — сошлись на сказанное: "вы же говорили...". Одна короткая фраза.]`;
            } else if (regenerateReason === 'unanswered_question') {
              const qList = sellerQuestions.map(q => `"${q.raw}"`).join(', ');
              retryInstruction = `[СТОП! Продавец задал вопрос(ы): ${qList}. Ты НЕ ответил на него. СНАЧАЛА ответь на вопрос продавца, ПОТОМ задай свой. Одна короткая фраза.]`;
            }

            const retryMessages = [...llmMessages, {
              role: 'assistant' as const,
              content: cleanText,
            }, {
              role: 'user' as const,
              content: retryInstruction,
            }];

            try {
              const retryText = await createChatCompletion(retryMessages);

              // Проверки результата перегенерации
              let retryOk = retryText && retryText.length > 5;
              if (retryOk && isSellerSpeech(retryText)) {
                console.warn('[chat-stream] Перегенерация: снова речь продавца');
                retryOk = false;
              }
              if (retryOk && isExactRepetition(retryText, messages)) {
                console.warn('[chat-stream] Перегенерация: снова повтор');
                retryOk = false;
              }
              if (retryOk && regenerateReason === 'topic_repetition') {
                const rep = checkRepetition(retryText, messages);
                if (rep.isRepeating) {
                  console.warn('[chat-stream] Перегенерация: снова повтор темы');
                  retryOk = false;
                }
              }
              if (retryOk && regenerateReason === 'unanswered_question') {
                const ans = botAnswersQuestion(retryText, sellerQuestions, scenario, selectedCar);
                if (!ans) {
                  console.warn('[chat-stream] Перегенерация: снова не ответил на вопрос');
                  retryOk = false;
                }
              }

              if (retryOk) {
                console.log('[chat-stream] ✓ Перегенерация успешна (' + regenerateReason + ')');
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: retryText })}\n\n`));
                cleanText = retryText.replace('[[DIALOGUE_END]]', '').trim();
                if (retryText.includes('[[DIALOGUE_END]]')) dialogueEnd = true;
              } else {
                console.warn('[chat-stream] Перегенерация не прошла проверки, оставляем оригинал');
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
