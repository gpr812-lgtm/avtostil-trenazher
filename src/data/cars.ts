// База данных китайских автомобилей на российском рынке
// Цены указаны в рублях, ориентировочные на 2024-2026 гг.

export interface CarModel {
  id: string;
  brand: string;
  model: string;
  bodyType: 'Кроссовер' | 'Внедорожник' | 'Седан' | 'Хэтчбек' | 'Универсал' | 'Купе';
  priceFrom: number; // в рублях
  priceTo: number;
  engine: string;
  power: number; // л.с.
  transmission: string;
  drive: string;
  fuelType: 'Бензин' | 'Гибрид' | 'Электро' | 'Дизель';
  seats: number;
  features: string[];
  description: string;
}

export const cars: CarModel[] = [
  // Haval
  {
    id: 'haval-jolion',
    brand: 'Haval',
    model: 'Jolion',
    bodyType: 'Кроссовер',
    priceFrom: 2_050_000,
    priceTo: 2_650_000,
    engine: '1.5 л турбо',
    power: 143,
    transmission: 'Робот 7-ст.',
    drive: 'Передний / Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Панорамная крыша', 'Подогрев всех сидений', 'Беспроводная зарядка', 'Камера 360°', 'Адаптивный круиз'],
    description: 'Бестселлер российского рынка, компактный городской кроссовер с отличным соотношением цена/оснащение.'
  },
  {
    id: 'haval-dargo',
    brand: 'Haval',
    model: 'Dargo',
    bodyType: 'Внедорожник',
    priceFrom: 2_900_000,
    priceTo: 3_500_000,
    engine: '1.5 л турбо',
    power: 150,
    transmission: 'Робот 7-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Брутальный дизайн', 'Система выбора режимов движения', 'Панорама', 'Вентиляция сидений', 'Электропривод двери багажника'],
    description: 'Стильный внедорожник с полным приводом и внедорожной электроникой для активного отдыха.'
  },
  {
    id: 'haval-f7',
    brand: 'Haval',
    model: 'F7',
    bodyType: 'Кроссовер',
    priceFrom: 2_650_000,
    priceTo: 3_400_000,
    engine: '1.5 / 2.0 л турбо',
    power: 150,
    transmission: 'Робот 7-ст.',
    drive: 'Передний / Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Спортивный дизайн', 'Премиальная отделка', 'Адаптивный круиз-контроль', 'Панорамная крыша', 'Apple CarPlay / Android Auto'],
    description: 'Современный кроссовер с ярким дизайном и богатой комплектацией, аналог Hyundai Tucson.'
  },
  {
    id: 'haval-f7x',
    brand: 'Haval',
    model: 'F7x',
    bodyType: 'Купе',
    priceFrom: 2_800_000,
    priceTo: 3_550_000,
    engine: '2.0 л турбо',
    power: 190,
    transmission: 'Робот 7-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Купе-образный кузов', 'Спортивные сиденья', 'Запуск двигателя кнопкой', 'Электропривод двери багажника', 'Системы активной безопасности'],
    description: 'Купе-кроссовер с динамичным силуэтом для тех, кто ценит стиль и спортивность.'
  },
  {
    id: 'haval-m6',
    brand: 'Haval',
    model: 'M6',
    bodyType: 'Кроссовер',
    priceFrom: 1_850_000,
    priceTo: 2_250_000,
    engine: '1.5 л турбо',
    power: 143,
    transmission: 'МКПП 6-ст. / Робот 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Доступная цена', 'Большой багажник', 'Подогрев передних сидений', 'Мультимедиа с навигацией', 'Датчики парковки'],
    description: 'Самый доступный кроссовер Haval, оптимальный выбор для первой машины.'
  },

  // Chery
  {
    id: 'chery-tiggo-4-pro',
    brand: 'Chery',
    model: 'Tiggo 4 Pro',
    bodyType: 'Кроссовер',
    priceFrom: 2_000_000,
    priceTo: 2_550_000,
    engine: '1.5 л',
    power: 113,
    transmission: 'Вариатор / МКПП',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Компактный размер', 'Экономичный двигатель', 'Подогрев руля и сидений', 'Сенсорный экран 10.25"', 'Камера заднего вида'],
    description: 'Компактный городской кроссовер, идеален для города и поездок по магазинам.'
  },
  {
    id: 'chery-tiggo-7-pro-max',
    brand: 'Chery',
    model: 'Tiggo 7 Pro Max',
    bodyType: 'Кроссовер',
    priceFrom: 2_650_000,
    priceTo: 3_200_000,
    engine: '1.6 л турбо',
    power: 150,
    transmission: 'Робот 7-ст.',
    drive: 'Передний / Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Двойной экран', 'Панорамная крыша', 'Вентиляция передних сидений', 'Беспроводная зарядка', 'Адаптивный круиз'],
    description: 'Один из самых технологичных кроссоверов в классе с богатым оснащением даже в базе.'
  },
  {
    id: 'chery-tiggo-8-pro-max',
    brand: 'Chery',
    model: 'Tiggo 8 Pro Max',
    bodyType: 'Внедорожник',
    priceFrom: 3_450_000,
    priceTo: 4_200_000,
    engine: '2.0 л турбо',
    power: 197,
    transmission: 'Робот 7-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 7,
    features: ['7 мест', 'Три ряда сидений', 'Премиум аудио Sony', 'Камеры 360°', 'Массаж сидений', 'Панорама'],
    description: 'Семиместный полноразмерный внедорожник для большой семьи с премиальным оснащением.'
  },
  {
    id: 'chery-arrizo-8',
    brand: 'Chery',
    model: 'Arrizo 8',
    bodyType: 'Седан',
    priceFrom: 2_350_000,
    priceTo: 2_950_000,
    engine: '1.6 л турбо',
    power: 150,
    transmission: 'Робот 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Просторный салон', 'Премиальная отделка кожей', 'Подогрев и вентиляция сидений', 'Аудиосистема Sony', 'Адаптивный круиз'],
    description: 'Седан бизнес-класса с просторным салоном и богатым оснащением, конкурент Camry.'
  },

  // Geely
  {
    id: 'geely-coolray',
    brand: 'Geely',
    model: 'Coolray',
    bodyType: 'Кроссовер',
    priceFrom: 2_450_000,
    priceTo: 2_950_000,
    engine: '1.5 л турбо',
    power: 150,
    transmission: 'Робот 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['3 цилиндра, но тяговитый', 'Спортивный режим', 'Большой экран мультимедиа', 'Камера 360°', 'Подогрев руля'],
    description: 'Динамичный компактный кроссовер с ярким дизайном для молодой аудитории.'
  },
  {
    id: 'geely-atlas',
    brand: 'Geely',
    model: 'Atlas',
    bodyType: 'Кроссовер',
    priceFrom: 2_800_000,
    priceTo: 3_500_000,
    engine: '2.0 л турбо',
    power: 190,
    transmission: 'Робот 7-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Просторный салон', 'Премиальная отделка', 'Подогрев всех сидений', 'Электропривод багажника', 'Адаптивный круиз'],
    description: 'Среднеразмерный кроссовер с полным приводом и отличной комплектацией.'
  },
  {
    id: 'geely-monjaro',
    brand: 'Geely',
    model: 'Monjaro',
    bodyType: 'Внедорожник',
    priceFrom: 3_500_000,
    priceTo: 4_500_000,
    engine: '2.0 л турбо',
    power: 238,
    transmission: 'Автомат 8-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Платформа Volvo CMA', 'Боксерский дизайн', 'Премиум аудио Infinity', 'Адаптивная подвеска', 'Вентиляция сидений', 'Массаж'],
    description: 'Флагманский внедорожник Geely, построен на платформе Volvo. Прямой конкурент Toyota Highlander.'
  },
  {
    id: 'geely-tugella',
    brand: 'Geely',
    model: 'Tugella',
    bodyType: 'Купе',
    priceFrom: 3_400_000,
    priceTo: 4_200_000,
    engine: '2.0 л турбо',
    power: 238,
    transmission: 'Автомат 8-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Купе-кроссовер', 'Платформа Volvo', 'Спортивные сиденья', 'Премиум аудио Bose', 'Запаска полного размера'],
    description: 'Купе-кроссовер на платформе Volvo, спортивный характер и премиальное качество.'
  },
  {
    id: 'geely-emgrand',
    brand: 'Geely',
    model: 'Emgrand',
    bodyType: 'Седан',
    priceFrom: 1_900_000,
    priceTo: 2_350_000,
    engine: '1.5 л',
    power: 102,
    transmission: 'Вариатор / МКПП',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Доступный седан', 'Большой багажник 500 л', 'Подогрев передних сидений', 'Мультимедиа с навигацией', 'Климат-контроль'],
    description: 'Бюджетный седан с большим багажником, замена Solaris и Polo.'
  },

  // Changan
  {
    id: 'changan-cs35-plus',
    brand: 'Changan',
    model: 'CS35 Plus',
    bodyType: 'Кроссовер',
    priceFrom: 2_100_000,
    priceTo: 2_500_000,
    engine: '1.4 л турбо',
    power: 128,
    transmission: 'Робот 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Компактный', 'Турбомотор', 'Подогрев руля', 'Большой экран', 'Камера заднего вида'],
    description: 'Компактный городской кроссовер с турбомотором, отличная альтернатива Hyundai Creta.'
  },
  {
    id: 'changan-cs55',
    brand: 'Changan',
    model: 'CS55 Plus',
    bodyType: 'Кроссовер',
    priceFrom: 2_550_000,
    priceTo: 3_000_000,
    engine: '1.5 л турбо',
    power: 188,
    transmission: 'Робот 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Мощный мотор 188 л.с.', 'Современный дизайн', 'Панорама', 'Адаптивный круиз', 'Камера 360°'],
    description: 'Среднеразмерный кроссовер с мощным мотором и богатой комплектацией.'
  },
  {
    id: 'changan-cs75',
    brand: 'Changan',
    model: 'CS75 FL',
    bodyType: 'Внедорожник',
    priceFrom: 2_900_000,
    priceTo: 3_500_000,
    engine: '1.8 л турбо',
    power: 150,
    transmission: 'Автомат 6-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Просторный салон', 'Большой багажник', 'Подогрев всех сидений', 'Электропривод багажника', 'Панорама'],
    description: 'Просторный семейный внедорожник с полным приводом и автоматической коробкой.'
  },
  {
    id: 'changan-uni-k',
    brand: 'Changan',
    model: 'UNI-K',
    bodyType: 'Внедорожник',
    priceFrom: 3_700_000,
    priceTo: 4_400_000,
    engine: '2.0 л турбо',
    power: 226,
    transmission: 'Автомат 8-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Футуристичный дизайн', 'Безрамочные двери', '3 экрана впереди', 'Премиум аудио Sony', 'Адаптивная подвеска'],
    description: 'Премиальный внедорожник с футуристичным дизайном и топовой комплектацией.'
  },
  {
    id: 'changan-uni-v',
    brand: 'Changan',
    model: 'UNI-V',
    bodyType: 'Седан',
    priceFrom: 2_700_000,
    priceTo: 3_300_000,
    engine: '1.5 л турбо',
    power: 166,
    transmission: 'Робот 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Спортивный седан', 'Выдвижной спойлер', 'Спортивные сиденья', 'Режимы движения', 'Аудиосистема премиум'],
    description: 'Спортивный седан с выдвижным спойлером для динамичной аудитории.'
  },

  // Omoda
  {
    id: 'omoda-c5',
    brand: 'Omoda',
    model: 'C5',
    bodyType: 'Кроссовер',
    priceFrom: 2_400_000,
    priceTo: 3_050_000,
    engine: '1.6 л турбо',
    power: 150,
    transmission: 'Вариатор',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Футуристичный дизайн', 'Панорамная крыша', 'Двойной экран', 'Камера 360°', 'Адаптивный круиз'],
    description: 'Молодёжный кроссовер с ярким дизайном, суббренд Chery.'
  },
  {
    id: 'omoda-s5',
    brand: 'Omoda',
    model: 'S5',
    bodyType: 'Седан',
    priceFrom: 1_950_000,
    priceTo: 2_400_000,
    engine: '1.5 л турбо',
    power: 147,
    transmission: 'Вариатор',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Спортивный седан', 'Доступная цена', 'Подогрев сидений', 'Большой экран мультимедиа', 'Камера заднего вида'],
    description: 'Доступный седан с турбомотором для молодой аудитории.'
  },

  // Tank
  {
    id: 'tank-300',
    brand: 'Tank',
    model: '300',
    bodyType: 'Внедорожник',
    priceFrom: 3_950_000,
    priceTo: 4_500_000,
    engine: '2.0 л турбо',
    power: 220,
    transmission: 'Автомат 8-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Рамный внедорожник', 'Блокировки дифференциалов', 'Понижающая передача', 'Внедорожная электроника', 'Премиум салон'],
    description: 'Настоящий рамный внедорожник премиум-класса для серьёзного бездорожья.'
  },
  {
    id: 'tank-500',
    brand: 'Tank',
    model: '500',
    bodyType: 'Внедорожник',
    priceFrom: 5_000_000,
    priceTo: 6_100_000,
    engine: '3.0 л V6 турбо',
    power: 299,
    transmission: 'Автомат 9-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['V6 3.0 л', 'Рамная конструкция', 'Премиальная кожа Nappa', 'Массаж сидений', 'Панорама', 'Аудио Infinity'],
    description: 'Флагманский рамный внедорожник с V6, прямой конкурент Toyota Land Cruiser Prado.'
  },

  // Exeed
  {
    id: 'exeed-txl',
    brand: 'Exeed',
    model: 'TXL',
    bodyType: 'Кроссовер',
    priceFrom: 3_300_000,
    priceTo: 3_900_000,
    engine: '2.0 л турбо',
    power: 197,
    transmission: 'Робот 7-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Премиум-бренд Chery', 'Кожаный салон', 'Панорама', 'Адаптивный круиз', 'Камеры 360°'],
    description: 'Премиальный кроссовер суббренда Exeed с богатым оснащением.'
  },
  {
    id: 'exeed-vx',
    brand: 'Exeed',
    model: 'VX',
    bodyType: 'Внедорожник',
    priceFrom: 4_500_000,
    priceTo: 5_500_000,
    engine: '2.0 л турбо',
    power: 249,
    transmission: 'Робот 7-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 7,
    features: ['7 мест', 'Премиальная отделка', 'Аудио Sony 12 динамиков', 'Вентиляция и массаж', 'Адаптивная подвеска'],
    description: 'Флагманский семиместный внедорожник премиум-класса, конкурент BMW X7.'
  },

  // Jaecoo
  {
    id: 'jaecoo-j7',
    brand: 'Jaecoo',
    model: 'J7',
    bodyType: 'Внедорожник',
    priceFrom: 2_650_000,
    priceTo: 3_300_000,
    engine: '1.6 л турбо',
    power: 150,
    transmission: 'Робот 7-ст.',
    drive: 'Полный',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Квадратный дизайн', 'Полный привод', 'Панорама', 'Подогрев всех сидений', 'Адаптивный круиз'],
    description: 'Стильный квадратный внедорожник от суббренда Chery, модный дизайн в стиле Defender.'
  },

  // Jetour
  {
    id: 'jetour-dashing',
    brand: 'Jetour',
    model: 'Dashing',
    bodyType: 'Кроссовер',
    priceFrom: 2_500_000,
    priceTo: 3_000_000,
    engine: '1.5 л турбо',
    power: 147,
    transmission: 'Робот 6-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Молодёжный дизайн', 'Большой экран 15.6"', 'Цифровая панель', 'Камера 360°', 'Беспроводная зарядка'],
    description: 'Молодёжный кроссовер с ярким дизайном от суббренда Chery.'
  },
  {
    id: 'jetour-x90-plus',
    brand: 'Jetour',
    model: 'X90 Plus',
    bodyType: 'Внедорожник',
    priceFrom: 3_000_000,
    priceTo: 3_600_000,
    engine: '2.0 л турбо',
    power: 190,
    transmission: 'Робот 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 7,
    features: ['7 мест', 'Большой салон', 'Панорама', 'Подогрев всех сидений', 'Электропривод багажника'],
    description: 'Семиместный семейный внедорожник по доступной цене.'
  },

  // GAC
  {
    id: 'gac-gs3',
    brand: 'GAC',
    model: 'GS3',
    bodyType: 'Кроссовер',
    priceFrom: 2_300_000,
    priceTo: 2_750_000,
    engine: '1.5 л турбо',
    power: 163,
    transmission: 'Робот 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Компактный', 'Мощный мотор', 'Современный дизайн', 'Подогрев сидений', 'Большой экран'],
    description: 'Компактный городской кроссовер с мощным турбомотором.'
  },

  // BAIC
  {
    id: 'baic-x35',
    brand: 'BAIC',
    model: 'X35 Plus',
    bodyType: 'Кроссовер',
    priceFrom: 2_100_000,
    priceTo: 2_500_000,
    engine: '1.5 л',
    power: 113,
    transmission: 'Вариатор',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Доступная цена', 'Просторный салон', 'Подогрев сидений', 'Камера заднего вида', 'Мультимедиа'],
    description: 'Доступный компактный кроссовер с хорошим оснащением.'
  },

  // FAW Bestune
  {
    id: 'faw-bestune-t77',
    brand: 'FAW',
    model: 'Bestune T77',
    bodyType: 'Кроссовер',
    priceFrom: 2_400_000,
    priceTo: 2_900_000,
    engine: '1.5 л турбо',
    power: 169,
    transmission: 'Автомат 7-ст.',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Просторный салон', 'Большой экран', 'Панорама', 'Камера 360°', 'Подогрев сидений'],
    description: 'Просторный семейный кроссовер от китайского государственного концерна FAW.'
  },

  // Dongfeng
  {
    id: 'dongfeng-580',
    brand: 'Dongfeng',
    model: 'SX5',
    bodyType: 'Кроссовер',
    priceFrom: 2_200_000,
    priceTo: 2_700_000,
    engine: '1.6 л',
    power: 124,
    transmission: 'Вариатор',
    drive: 'Передний',
    fuelType: 'Бензин',
    seats: 5,
    features: ['Надёжный бренд', 'Просторный салон', 'Большой багажник', 'Подогрев сидений', 'Камера заднего вида'],
    description: 'Надёжный городской кроссовер от одного из крупнейших китайских автоконцернов.'
  },
];

export const brands = Array.from(new Set(cars.map(c => c.brand))).sort();

export function getCarById(id: string): CarModel | undefined {
  return cars.find(c => c.id === id);
}

export function getCarsByBrand(brand: string): CarModel[] {
  return cars.filter(c => c.brand === brand);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

export function formatPriceRange(from: number, to: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(from)} – ${new Intl.NumberFormat('ru-RU').format(to)} ₽`;
}
