import { transliterateForTTS } from '../src/lib/translit.ts';
import { applyAccents } from '../src/lib/accents.ts';

const tests = [
  'Здравствуйте',
  'Меня зовут Дмитрий',
  'Я по поводу автомобиля',
  'Два с половиной миллиона',
  'Можно записаться на тест-драйв',
  'Когда можно приехать',
  'А какие у вас комплектации',
  'Полный привод хотел бы',
  'Тест-драйв можно в субботу',
  'Какие документы нужны для оформления',
  'А трейд-ин возьмёте',
  'Скидки какие-то есть',
  'Сколько будет стоить',
  'Что по цене',
  'За сколько выйдет',
  'Гарантия какая будет',
];

for (const t of tests) {
  const translit = transliterateForTTS(t);
  const accented = applyAccents(translit);
  console.log(`ИСХОДНО:  ${t}`);
  console.log(`УДАРЕНИЯ: ${accented}`);
  console.log('---');
}
