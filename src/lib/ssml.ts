// SSML-обработка текста для Amazon Polly
// Добавляет паузы, замедление для важных фраз, акценты на ключевых словах

// Слова, на которые нужно логическое ударение (emphasis)
const EMPHASIS_WORDS = [
  // Вопросительные слова
  'скидка', 'скидку', 'скидки', 'скидок',
  'цена', 'цену', 'цены', 'цен',
  'комплектация', 'комплектации', 'комплектацию',
  'гарантия', 'гарантии', 'гарантию',
  'тест-драйв', 'тест-драйва', 'тест-драйв',
  'договор', 'договора',
  'кредит', 'кредита', 'кредиты',
  'рассрочка', 'рассрочки', 'рассрочку',
  'трейд-ин',
  // Модели авто — выделяем
  'Haval', 'Chery', 'Geely', 'Changan', 'Tank', 'Exeed',
  'Omoda', 'Jaecoo', 'Jetour', 'Dongfeng', 'BAIC', 'FAW', 'GAC',
  'Jolion', 'Dargo', 'Tiggo', 'Arrizo', 'Coolray', 'Atlas',
  'Monjaro', 'Tugella', 'Emgrand',
  // Числительные с деньгами
  'миллион', 'миллиона', 'миллионов',
  'тысяча', 'тысячи', 'тысяч', 'тысячу',
];

// Применяет SSML-разметку к тексту
export function applySSML(text: string): string {
  let result = text;

  // 1. Паузы после знаков препинания
  // Длинные паузы после точки, вопросительного, восклицательного
  result = result.replace(/([.!?])\s+/g, '$1<break time="400ms"/> ');
  // Средние паузы после двоеточия и точки с запятой
  result = result.replace(/([:;])\s+/g, '$1<break time="300ms"/> ');
  // Короткие паузы после запятой
  result = result.replace(/([,])\s+/g, '$1<break time="200ms"/> ');
  // Паузы после тире
  result = result.replace(/([—-])\s+/g, '$1<break time="250ms"/> ');

  // 2. Замедление для фраз с ценами (числа + "рублей/миллиона/тысяч")
  // «Цена 2 миллиона рублей» → «Цена <prosody rate="92%">2 миллиона рублей</prosody>»
  result = result.replace(
    /(\d+(\s|\u00A0)?(миллион\w*|тысяч\w*|рубл\w*|миллиарда?\w*|тысячи?|миллиона?)(\s+\w+){0,3})/gi,
    '<prosody rate="92%">$1</prosody>'
  );

  // 3. Замедление для фразы «запишите на / оформим / договор»
  result = result.replace(
    /(договор\w*\s+\w+\s+\w+|оформ\w+\s+\w+|запиш\w+\s+\w+)/gi,
    '<prosody rate="95%">$1</prosody>'
  );

  // 4. Акцент (emphasis) на ключевых словах — только если слово целое
  for (const word of EMPHASIS_WORDS) {
    // Экранируем спецсимволы
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // lookaround для границ слов (включая combining accents)
    const regex = new RegExp(
      `(?<![а-яёА-ЯЁa-zA-Z\\u0300-\\u036F])${escaped}(?![а-яёА-ЯЁa-zA-Z\\u0300-\\u036F])`,
      'gi'
    );
    result = result.replace(regex, (match) => {
      // Не оборачиваем, если уже внутри тега
      return `<emphasis level="moderate">${match}</emphasis>`;
    });
  }

  return result;
}

// Проверяет, нужно ли использовать SSML (не для слишком коротких текстов)
export function shouldUseSSML(text: string): boolean {
  return text.length > 30;
}
