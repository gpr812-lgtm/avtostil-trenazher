// Транслитерация английских брендов и моделей авто в русские эквиваленты
// Применяется ПЕРЕД TTS, чтобы русские голоса читали бренды правильно.
// ВАЖНО: НЕ ставим ударения (U+0301) — Microsoft Edge TTS с DmitryNeural
// сам отлично знает русские ударения. Combining accent ломает чтение.

const brandMap: Record<string, string> = {
  'Great Wall': 'Грейт Волл', Haval: 'Хавал', Chery: 'Чери', Geely: 'Джили',
  Changan: 'Чанган', Tank: 'Танк', Exeed: 'Эксид', Jetour: 'Джетур',
  Omoda: 'Омода', Jaecoo: 'Джейку', BYD: 'БИИДИ', BAIC: 'БАИК',
  Dongfeng: 'Дунфэн', FAW: 'ФАВ', GAC: 'ГАК', Lifan: 'Лифан',
  JAC: 'ДЖАК', MG: 'ЭМДЖИ', Voyah: 'Воя', Hongqi: 'Хунци', Zeekr: 'Зикр',
  Toyota: 'Тойота', Hyundai: 'Хёндай', Kia: 'Киа', Nissan: 'Ниссан',
  Mazda: 'Мазда', Honda: 'Хонда', Mitsubishi: 'Мицубиси', Subaru: 'Субару',
  Suzuki: 'Сузуки', Lexus: 'Лексус', Infiniti: 'Инфинити', BMW: 'БэМэВэ',
  Audi: 'Ауди', Mercedes: 'Мерседес', Volkswagen: 'Фольксваген',
  Skoda: 'Шкода', Porsche: 'Порше', Volvo: 'Вольво', Jeep: 'Джип',
  Renault: 'Рено', Peugeot: 'Пежо', Citroen: 'Ситроен', Fiat: 'Фиат',
  Ford: 'Форд', Chevrolet: 'Шевроле', Tesla: 'Тесла', Genesis: 'Генезис',
};

const modelMap: Record<string, string> = {
  Jolion: 'Джолион', Dargo: 'Дарго', 'F7x': 'ЭфСемьИкс', 'F7': 'ЭфСемь',
  'H6': 'АшШесть', 'H9': 'АшДевять', 'M6': 'ЭмШесть',
  Tiggo: 'Тигго', Arrizo: 'Арризо', Monjaro: 'Монджаро',
  Coolray: 'Кулрей', Atlas: 'Атлас', Tugella: 'Тугелла', Emgrand: 'Эмгранд',
  Creta: 'Крета', Sportage: 'Спортейдж', Seltos: 'Селтос', Sorento: 'Соренто',
  Camry: 'Камри', 'RAV4': 'РавЧетыре', Corolla: 'Королла', Cruiser: 'Крузер', Prado: 'Прадо',
  Tiguan: 'Тигуан', Touareg: 'Туарег', Polo: 'Поло', Octavia: 'Октавия',
  Cayenne: 'Кайен', Macan: 'Макан',
};

const termMap: Record<string, string> = {
  Pro: 'Про', Max: 'Макс', Plus: 'Плюс', Elite: 'Элит', Premium: 'Премиум',
  Comfort: 'Комфорт', Standard: 'Стандарт', Base: 'База', Flagship: 'Флагман',
  Sport: 'Спорт', Urban: 'Урбан', Style: 'Стайл', Life: 'Лайф',
  LED: 'ЛЭД', GPS: 'ДжиПиЭс', CVT: 'СВТ', 'test-drive': 'тест-драйв',
  'trade-in': 'трейд-ин', business: 'бизнес', comfort: 'комфорт',
};

const allMaps: Record<string, string> = { ...brandMap, ...modelMap, ...termMap };
const sortedKeys = Object.keys(allMaps).sort((a, b) => b.length - a.length);

const compiledRegexes: Array<{ key: string; regex: RegExp }> = sortedKeys.map((key) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let regex: RegExp;
  try { regex = new RegExp(`(?<![A-Za-zА-Яа-яЁё])${escapedKey}(?![A-Za-zА-Яа-яЁё])`, 'g'); }
  catch { regex = new RegExp(`\\b${escapedKey}\\b`, 'g'); }
  return { key, regex };
});

export function transliterateForTTS(text: string): string {
  if (!text || typeof text !== 'string') return text;
  if (!/[A-Za-z]/.test(text)) return text;
  let result = text;
  for (const { key, regex } of compiledRegexes) {
    if (!result.includes(key)) continue;
    regex.lastIndex = 0;
    result = result.replace(regex, allMaps[key]);
  }
  return result;
}
