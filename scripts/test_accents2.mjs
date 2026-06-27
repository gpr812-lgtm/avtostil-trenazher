import { transliterateForTTS } from '../src/lib/translit.ts';
import { applyAccents } from '../src/lib/accents.ts';

const tests = [
  'Сколько стоит Haval Jolion?',
  'Дорого. А скидки есть?',
  'Два миллиона сто пятьдесят тысяч',
  'Наличными скорее всего',
  'На этой неделе планирую',
  'Стоит дорого',
  'Квартал квартал звонит договор',
  'скорее всего',
];

for (const t of tests) {
  const translit = transliterateForTTS(t);
  const accented = applyAccents(translit);
  console.log(`ИСХОДНО:   ${t}`);
  console.log(`TRANSLIT:  ${translit}`);
  console.log(`УДАРЕНИЯ:  ${accented}`);
  console.log('---');
}
