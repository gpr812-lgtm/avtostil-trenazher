// Нормализация чисел для русского TTS
// Polly плохо произносит числа — нужно преобразовать в слова

// Единицы
const ONES = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const ONES_M = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']; // мужской род

// 10-19
const TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
               'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];

// Десятки
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят',
              'семьдесят', 'восемьдесят', 'девяносто'];

// Сотни
const HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот',
                  'семьсот', 'восемьсот', 'девятьсот'];

// Форма слова в зависимости от числа (1, 2-4, 5-0)
function getForm(n: number, forms: [string, string, string]): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  const last = n % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

// Число в текст (до 999)
function numberToTextBelow1000(n: number, masculine = false): string {
  if (n === 0) return '';
  const result: string[] = [];

  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;

  if (hundreds > 0) result.push(HUNDREDS[hundreds]);

  if (remainder >= 10 && remainder < 20) {
    result.push(TEENS[remainder - 10]);
  } else {
    if (tens > 0) result.push(TENS[tens]);
    if (ones > 0) {
      result.push(masculine ? ONES_M[ones] : ONES[ones]);
    }
  }

  return result.join(' ');
}

// Полное число в текст (любая величина)
function numberToText(n: number): string {
  if (n === 0) return 'ноль';

  const result: string[] = [];
  let isNegative = false;
  if (n < 0) {
    isNegative = true;
    n = Math.abs(n);
  }

  // Миллиарды
  if (n >= 1_000_000_000) {
    const billions = Math.floor(n / 1_000_000_000);
    n = n % 1_000_000_000;
    result.push(numberToTextBelow1000(billions, true) + ' ' + getForm(billions, ['миллиард', 'миллиарда', 'миллиардов']));
  }

  // Миллионы
  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000);
    n = n % 1_000_000;
    result.push(numberToTextBelow1000(millions, true) + ' ' + getForm(millions, ['миллион', 'миллиона', 'миллионов']));
  }

  // Тысячи
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    n = n % 1000;
    result.push(numberToTextBelow1000(thousands, false) + ' ' + getForm(thousands, ['тысяча', 'тысячи', 'тысяч']));
  }

  // Остаток
  if (n > 0) {
    result.push(numberToTextBelow1000(n, true));
  }

  let text = result.join(' ').trim();
  if (isNegative) text = 'минус ' + text;
  return text;
}

// Дробное число в разговорный текст
// 2.8 → "два и восемь" (как говорят в жизни, а не "две целых восемь десятых")
// 2.5 → "два и пять"
// 2.85 → "два и восемьдесят пять"
// 1.5 → "полтора" (особый случай)
function decimalToText(n: number): string {
  const parts = n.toString().split('.');
  const intPart = parseInt(parts[0], 10);
  const decPart = parts[1] || '';

  const intText = numberToText(intPart);

  if (decPart.length === 0) return intText;

  const decNum = parseInt(decPart, 10);

  // Разговорный стиль: "два и восемь" вместо "две целых восемь десятых"
  const decText = numberToTextBelow1000(decNum, true);
  return `${intText} и ${decText}`;
}

// Применяет нормализацию чисел к тексту
export function normalizeNumbers(text: string): string {
  let result = text;

  // 1. Дробные числа с единицами измерения двигателя: "2.0 л", "1.5 турбо", "2.0 литра"
  // → "два литра", "полтора литра"
  // Для объёма двигателя упрощаем: 2.0 → "два литра", 1.5 → "полтора литра"
  // Важно: используем [а-яё]* вместо \w*, т.к. \w не работает с кириллицей
  result = result.replace(/(\d+\.\d+)\s+(литр[а-яё]*|л(?![а-яёА-ЯЁ]))/gi, (match, num) => {
    const n = parseFloat(num);
    if (Math.abs(n - 1.5) < 0.001) return 'полтора́ ли́тра';
    if (Math.abs(n - 2.0) < 0.001) return 'два ли́тра';
    if (Math.abs(n - 3.0) < 0.001) return 'три ли́тра';
    if (Math.abs(n - 4.0) < 0.001) return 'четы́ре ли́тра';
    if (Math.abs(n - 5.0) < 0.001) return 'пять ли́тров';
    const decText = decimalToText(n);
    return `${decText} ли́тра`;
  });

  // 2. Дробные числа с миллионами/тысячами/рублями: "2.8 миллиона" → "два и восемь миллиона"
  result = result.replace(/(\d+\.\d+)\s+(миллион[а-яё]*|тысяч[а-яё]*|рубл[а-яё]*|миллиард[а-яё]*)/gi, (match, num, unit) => {
    const n = parseFloat(num);
    if (Math.abs(n - 1.5) < 0.001) return `полтора́ ${unit}`;
    if (Math.abs(n - 2.5) < 0.001) return `два с половино́й ${unit}`;
    if (Math.abs(n - 3.5) < 0.001) return `три с половино́й ${unit}`;
    if (Math.abs(n - 0.5) < 0.001) return `пол ${unit}`;
    const decText = decimalToText(n);
    return `${decText} ${unit}`;
  });

  // 3. Простые дробные числа (без контекста): "2.8" → "две целых восемь десятых"
  // Не трогаем если рядом: л, литр, миллион, тысяч, рубл, км, километр, л.с, сила, сил
  result = result.replace(/(\d+)\.(\d+)(?!\s*(?:л|литр|м|миллион|тысяч|рубл|км|километр|л\.с|сила|сил))/g, (match) => {
    const n = parseFloat(match);
    return decimalToText(n);
  });

  // 4. Цены с пробелом-разделителем: "2 400 000" → "два миллиона четыреста тысяч"
  // "244 800" → "двести сорок четыре тысячи восемьсот"
  result = result.replace(/(\d{1,3}(?:\s\d{3})+)(\s*)(рубл[а-яё]*|₽)?/gi, (match, _numStr, _space, currency) => {
    const numStr = match.replace(/[^\d\s]/g, '').replace(/\s+/g, '').replace(/(рубл[а-яё]*|₽)/gi, '');
    const n = parseInt(numStr, 10);
    if (isNaN(n)) return match;
    const text = numberToText(n);
    return currency ? `${text} ${currency.trim()}` : text;
  });

  // 5. Цены без разделителя с указанием валюты: "2400000 рублей" → "два миллиона четыреста тысяч рублей"
  result = result.replace(/(\d{4,})\s*(рубл[а-яё]*|₽)/gi, (match, num, currency) => {
    const n = parseInt(num, 10);
    if (isNaN(n)) return match;
    return `${numberToText(n)} ${currency.trim()}`;
  });

  // 6. Большие числа без валюты, но с "миллион/тысяч": "2 миллиона" → "два миллиона"
  result = result.replace(/\b(\d+)\s+(миллион[а-яё]*|миллиард[а-яё]*|тысяч[а-яё]*)/gi, (match, num, unit) => {
    const n = parseInt(num, 10);
    if (isNaN(n)) return match;
    return `${numberToText(n)} ${unit}`;
  });

  // 7. Пробег: "60000 километров" → "шестьдесят тысяч километров"
  result = result.replace(/\b(\d{4,})\s*(километр[а-яё]*|км)/gi, (match, num, unit) => {
    const n = parseInt(num, 10);
    if (isNaN(n)) return match;
    return `${numberToText(n)} ${unit.trim()}`;
  });

  // 8. Мощность: "150 лошадиных сил" → "сто пятьдесят лошадиных сил"
  // Только переводим число в текст, не добавляем «лошадиных сил»
  result = result.replace(/\b(\d{1,4})\s+(лошадин[а-яё]*|л\.?\s*с\.?)/gi, (match, num, unit) => {
    const n = parseInt(num, 10);
    if (isNaN(n)) return match;
    return `${numberToText(n)} ${unit}`;
  });

  return result;
}
