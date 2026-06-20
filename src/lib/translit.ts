// Транслитерация английских брендов и моделей авто в русские эквиваленты
// Применяется ПЕРЕД applyAccents, чтобы русские ударения работали корректно

const brandMap: Record<string, string> = {
  'Great Wall': 'Гре́йт Во́лл', Haval: 'Ха́вал', Chery: 'Чери́', Geely: 'Джи́ли',
  Changan: 'Чанга́н', Tank: 'Танк', Exeed: 'Э́ксид', Jetour: 'Дже́тур',
  Omoda: 'О́мода', Jaecoo: 'Дже́йку', BYD: 'БИ́ИДИ', BAIC: 'БА́ИК',
  Dongfeng: 'Дунфэ́н', FAW: 'ФАВ', GAC: 'ГАК', Lifan: 'Лифа́н',
  JAC: 'ДЖАК', MG: 'Э́МДЖИ', Voyah: 'Во́я', Hongqi: 'Ху́нци', Zeekr: 'Зи́кр',
  Toyota: 'Тойо́та', Hyundai: 'Хё́ндай', Kia: 'Ки́а', Nissan: 'Ниса́н',
  Mazda: 'Ма́зда', Honda: 'Хо́нда', Mitsubishi: 'Мицуби́си', Subaru: 'Суба́ру',
  Suzuki: 'Сузу́ки', Lexus: 'Ле́ксус', Infiniti: 'Инфини́ти', BMW: 'БэМэВэ́',
  Audi: 'А́уди', Mercedes: 'Мерсе́дес', Volkswagen: 'Фольксва́ген',
  Skoda: 'Шко́да', Porsche: 'По́рше', Volvo: 'Во́льво', Jeep: 'Джип',
  Renault: 'Рено́', Peugeot: 'Пежо́', Citroen: 'Ситрое́н', Fiat: 'Фиа́т',
  Ford: 'Форд', Chevrolet: 'Шевроле́', Tesla: 'Те́сла', Genesis: 'Гене́зис',
};

const modelMap: Record<string, string> = {
  Jolion: 'Джо́лион', Dargo: 'Да́рго', 'F7x': 'ЭфСе́мьИкс', 'F7': 'ЭфСе́мь',
  'H6': 'АшШе́сть', 'H9': 'АшДе́вять', 'M6': 'ЭмШе́сть',
  Tiggo: 'Ти́гго', Arrizo: 'Арри́зо', Monjaro: 'Монджа́ро',
  Coolray: 'Ку́лрей', Atlas: 'А́тлас', Tugella: 'Туге́лла', Emgrand: 'Эмгра́нд',
  Creta: 'Кре́та', Sportage: 'Спорте́йдж', Seltos: 'Се́лтос', Sorento: 'Соре́нто',
  Camry: 'Камри́', 'RAV4': 'РавЧеты́ре', Corolla: 'Коро́лла', Cruiser: 'Кру́зер', Prado: 'Пра́до',
  Tiguan: 'Тигуа́н', Touareg: 'Туа́рег', Polo: 'По́ло', Octavia: 'Окта́вия',
  Cayenne: 'Ка́йен', Macan: 'Мака́н',
};

const termMap: Record<string, string> = {
  Pro: 'Про', Max: 'Макс', Plus: 'Плюс', Elite: 'Эли́т', Premium: 'Премиу́м',
  Comfort: 'Ко́мфорт', Standard: 'Станда́рт', Base: 'Ба́за', Flagship: 'Флагма́н',
  Sport: 'Спорт', Urban: 'Урба́н', Style: 'Стайл', Life: 'Лайф',
  LED: 'ЛЭД', GPS: 'ДжиПиЭ́с', CVT: 'СВТ', 'test-drive': 'те́ст-дра́йв',
  'trade-in': 'тре́йд-ин', business: 'би́знес', comfort: 'ко́мфорт',
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
