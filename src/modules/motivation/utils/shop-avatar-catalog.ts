export type AvatarLocale = "en" | "ru" | "uk";

export type PurchasableAvatar = {
  id: string;
  image: string;
  label: Record<AvatarLocale, string>;
  description: Record<AvatarLocale, string>;
};

/** Stable ids are used for purchases and equipment; the artwork may evolve. */
const avatar = (id: string, en: string, ru: string, uk: string, meaningEn: string, meaningRu: string, meaningUk: string): PurchasableAvatar => ({
  id: `avatar-${id}`,
  image: `/shop-avatars/${id}.webp`,
  label: { en, ru, uk },
  description: { en: meaningEn, ru: meaningRu, uk: meaningUk },
});

export const PURCHASABLE_AVATARS: readonly PurchasableAvatar[] = [
  avatar("academic-owl", "Academic owl", "Сова-академик", "Сова-академік", "Wisdom and deep knowledge.", "Мудрость и глубокие знания.", "Мудрість і глибокі знання."),
  avatar("butterfly", "Emerging butterfly", "Бабочка", "Метелик", "Transformation and a new level.", "Преображение и новый уровень.", "Перетворення й новий рівень."),
  avatar("free-bird", "Free bird", "Птица в полёте", "Птах у польоті", "Freedom of thought and broad horizons.", "Свобода мысли и широкий кругозор.", "Свобода думки й широкий світогляд."),
  avatar("dolphin", "Wise dolphin", "Мудрый дельфин", "Мудрий дельфін", "Intelligence and joyful learning.", "Интеллект и лёгкость обучения.", "Інтелект і легкість навчання."),
  avatar("hummingbird", "Hummingbird", "Колибри", "Колібрі", "Energy and diligence.", "Энергия и трудолюбие.", "Енергія й працьовитість."),
  avatar("swan", "White swan", "Белый лебедь", "Білий лебідь", "Grace and pure intentions.", "Грация и чистота помыслов.", "Грація й чистота помислів."),
  avatar("bee", "Diligent bee", "Трудолюбивая пчела", "Працьовита бджола", "Effort, teamwork and collected knowledge.", "Усердие, команда и собранные знания.", "Старанність, команда й здобуті знання."),
  avatar("reading-cat", "Reading cat", "Кот с книгой", "Кіт із книгою", "Cozy curiosity and self-education.", "Любознательность и уютное самообразование.", "Допитливість і затишна самоосвіта."),
  avatar("eagle", "Summit eagle", "Орёл на скале", "Орел на скелі", "Vision and conquering new heights.", "Дальновидность и покорение высот.", "Далекоглядність і підкорення вершин."),
  avatar("firefly", "Firefly", "Светлячок", "Світлячок", "A little light shared with others.", "Свет знаний, которым делятся с другими.", "Світло знань, яким діляться з іншими."),
  avatar("dove", "White dove", "Белый голубь", "Білий голуб", "Peace and kind intentions.", "Мир и добрые помыслы.", "Мир і добрі помисли."),
  avatar("puppy-book", "Puppy with a book", "Щенок с книгой", "Цуценя з книгою", "Friendly, joyful learning.", "Радость и искренний интерес к знаниям.", "Радість і щирий інтерес до знань."),
  avatar("sprout-bulb", "Idea sprout", "Лампочка с ростком", "Лампочка з паростком", "A creative and growing idea.", "Рождение созидательной идеи.", "Народження творчої ідеї."),
  avatar("sunrise", "Sunrise", "Восходящее солнце", "Сонце, що сходить", "New day, clear mind and opportunity.", "Новый день, ясный ум и возможности.", "Новий день, ясний розум і можливості."),
  avatar("north-star", "North star", "Полярная звезда", "Полярна зірка", "A clear learning goal and direction.", "Ориентир и верный путь к знаниям.", "Орієнтир і правильний шлях до знань."),
  avatar("lighthouse", "Lighthouse", "Маяк", "Маяк", "Light guiding the way to knowledge.", "Свет, указывающий путь к знаниям.", "Світло, що вказує шлях до знань."),
  avatar("candle-book", "Candle and book", "Свеча и книга", "Свічка й книга", "Learning dispels darkness.", "Познание рассеивает темноту.", "Пізнання розсіює темряву."),
  avatar("spiral-galaxy", "Spiral galaxy", "Спиральная галактика", "Спіральна галактика", "Infinite growth and possibility.", "Бесконечное развитие и возможности.", "Безмежний розвиток і можливості."),
  avatar("meteor", "Bright meteor", "Яркий метеор", "Яскравий метеор", "A flash of inspiration and momentum.", "Вспышка вдохновения и движение вперёд.", "Спалах натхнення й рух уперед."),
  avatar("prism", "Light prism", "Призма", "Призма", "A new way to see the details.", "Умение анализировать и видеть детали.", "Уміння аналізувати й бачити деталі."),
  avatar("torch", "Knowledge torch", "Факел знаний", "Смолоскип знань", "Leadership and passing knowledge on.", "Лидерство и передача знаний.", "Лідерство й передавання знань."),
  avatar("sundial", "Sundial", "Солнечные часы", "Сонячний годинник", "Time well spent on growth.", "Время, вложенное в саморазвитие.", "Час, вкладений у саморозвиток."),
  avatar("campfire-sparks", "Rising sparks", "Искры костра", "Іскри багаття", "Warmth and high aspirations.", "Тепло общения и стремление к высотам.", "Тепло спілкування й прагнення до висот."),
  avatar("book-stack", "Book stack", "Стопка книг", "Стос книжок", "The joy of reading and discovery.", "Радость чтения и открытий.", "Радість читання й відкриттів."),
  avatar("star-book", "Book of stars", "Книга со звёздами", "Книга із зірками", "Knowledge opens new worlds.", "Знания открывают новые миры.", "Знання відкривають нові світи."),
  avatar("quill-scroll", "Quill and scroll", "Перо и свиток", "Перо й сувій", "Creativity and a story of your own.", "Творчество и собственная история.", "Творчість і власна історія."),
  avatar("telescope", "Telescope", "Телескоп", "Телескоп", "Curiosity and a look ahead.", "Любознательность и взгляд в будущее.", "Допитливість і погляд у майбутнє."),
  avatar("globe", "World globe", "Глобус", "Глобус", "Openness to the world and discovery.", "Открытость миру и жажда открытий.", "Відкритість світу й жага відкриттів."),
  avatar("rising-chart", "Rising chart", "График роста", "Графік зростання", "Steady personal progress.", "Постоянное движение вперёд.", "Постійний рух уперед."),
  avatar("artist-palette", "Artist palette", "Палитра художника", "Палітра художника", "Creative potential in full color.", "Раскрытие творческого потенциала.", "Розкриття творчого потенціалу."),
  avatar("microscope", "Microscope", "Микроскоп", "Мікроскоп", "Attention to detail and deeper study.", "Внимание к деталям и глубокое изучение.", "Увага до деталей і глибоке вивчення."),
  avatar("light-maze", "Maze of light", "Лабиринт света", "Лабіринт світла", "Finding the way through a challenge.", "Решение сложных задач.", "Розв’язання складних завдань."),
  avatar("upward-arrow", "Upward arrow", "Стрела вверх", "Стріла вгору", "A clear step forward.", "Чистый символ движения вперёд.", "Чистий символ руху вперед."),
  avatar("level-up", "Level up", "Новый уровень", "Новий рівень", "Celebrate another level of growth.", "Новый уровень личного роста.", "Новий рівень особистого зростання."),
  avatar("bubble-planets", "Planet bubbles", "Пузыри-планеты", "Бульбашки-планети", "Childlike curiosity and big dreams.", "Детское любопытство и большие мечты.", "Дитяча допитливість і великі мрії."),
  avatar("writing-peace", "Peace in the sand", "Мир на песке", "Мир на піску", "Kindness remains through changing times.", "Добро остаётся важным всегда.", "Добро залишається важливим завжди."),
  avatar("bridge-builder", "Bridge builder", "Строитель моста", "Будівничий мосту", "Connection, help and overcoming obstacles.", "Единство, помощь и преодоление преград.", "Єдність, допомога й подолання перешкод."),
  avatar("stargazer", "Window to stars", "Взгляд на звёзды", "Погляд на зорі", "Dreams, plans and ambition.", "Мечты, планы и стремление к цели.", "Мрії, плани й прагнення до мети."),
  avatar("summit-person", "On the summit", "На вершине горы", "На вершині гори", "Courage and a hard-won triumph.", "Смелость и заслуженная победа.", "Сміливість і заслужена перемога."),
  avatar("child-bookshelf", "Reaching for books", "Книжная полка", "Книжкова полиця", "A lifelong wish to learn.", "Искреннее стремление к знаниям.", "Щире прагнення до знань."),
];
