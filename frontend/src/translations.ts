export type Language = "en" | "ru" | "uz";

export type AppTranslations = {
  languageName: string;
  nav: {
    features: string;
    pricing: string;
    login: string;
    createAiEmployee: string;
    back: string;
    toggleMenu: string;
  };
  landing: {
    badge: string;
    heroTitle: string;
    heroDescription: string;
    watchDemo: string;
    demoTitle: string;
    demoDescription: string;
    chatTitle: string;
    aiOnline: string;
    customerMessage: string;
    aiMessage: string;
    featuresTitle: string;
    featuresDescription: string;
    featureCards: Array<{
      title: string;
      description: string;
    }>;
    pricingTitle: string;
    pricingDescription: string;
    pricingPlans: Array<{
      name: string;
      price: string;
      period: string;
      description: string;
      chooseLabel: string;
    }>;
  };
  login: {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submit: string;
  };
  signup: {
    title: string;
    subtitle: string;
    companyNameLabel: string;
    companyNamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submit: string;
  };
  sidebar: {
    subtitle: string;
    dashboard: string;
    aiEmployees: string;
    aiChat: string;
    telegramBot: string;
    conversations: string;
    billing: string;
    settings: string;
  };
  dashboard: {
    tag: string;
    title: string;
    subtitle: string;
    stats: Array<{
      title: string;
      value: string;
      subtitle: string;
    }>;
    cardTitle: string;
    cardDescription: string;
  };
  createEmployee: {
    tag: string;
    title: string;
    subtitle: string;
    telegramTokenLabel: string;
    telegramTokenPlaceholder: string;
    businessNameLabel: string;
    businessNamePlaceholder: string;
    businessDescriptionLabel: string;
    businessDescriptionPlaceholder: string;
    faqLabel: string;
    faqPlaceholder: string;
    submit: string;
  };
};

export const defaultLanguage: Language = "en";

export const translations: Record<Language, AppTranslations> = {
  en: {
    languageName: "English",
    nav: {
      features: "Features",
      pricing: "Pricing",
      login: "Login",
      createAiEmployee: "Create AI Employee",
      back: "Back",
      toggleMenu: "Toggle menu",
    },
    landing: {
      badge: "AI Workforce for Telegram Customer Support",
      heroTitle: "Automate Customer Support with AI Employees",
      heroDescription:
        "Launch AI employees that reply instantly, reduce repetitive workload, and keep customer conversations moving 24/7.",
      watchDemo: "Watch Demo",
      demoTitle: "See an AI Employee in Action",
      demoDescription: "A typical Telegram conversation handled automatically.",
      chatTitle: "Telegram Chat",
      aiOnline: "AI Employee Online",
      customerMessage: "Do you deliver to Samarkand?",
      aiMessage: "Yes, delivery takes 2-3 days and costs 30,000 UZS.",
      featuresTitle: "Features",
      featuresDescription: "Purpose-built capabilities for AI-powered support teams.",
      featureCards: [
        {
          title: "24/7 AI Customer Support",
          description: "Reply to customers instantly, day and night, without increasing team workload.",
        },
        {
          title: "Telegram-Native Automation",
          description: "Connect your Telegram bot in minutes and start handling real conversations automatically.",
        },
        {
          title: "Business-Aware Responses",
          description: "Train AI employees on your policies and FAQs for consistent, on-brand answers.",
        },
      ],
      pricingTitle: "Pricing",
      pricingDescription: "Flexible plans for startups, growing teams, and larger operations.",
      pricingPlans: [
        {
          name: "Starter",
          price: "$29",
          period: "/month",
          description: "Best for early-stage teams launching AI support.",
          chooseLabel: "Choose Starter",
        },
        {
          name: "Pro",
          price: "$99",
          period: "/month",
          description: "Scale with advanced workflows and smarter handling.",
          chooseLabel: "Choose Pro",
        },
        {
          name: "Business",
          price: "$299",
          period: "/month",
          description: "For larger operations with priority support and control.",
          chooseLabel: "Choose Business",
        },
      ],
    },
    login: {
      title: "Welcome back",
      subtitle: "Log in to manage your AI employees.",
      emailLabel: "Email",
      emailPlaceholder: "you@company.com",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter your password",
      submit: "Login",
    },
    signup: {
      title: "Create your account",
      subtitle: "Start hiring AI employees for your support operations.",
      companyNameLabel: "Company Name",
      companyNamePlaceholder: "Acme Inc.",
      emailLabel: "Email",
      emailPlaceholder: "you@company.com",
      passwordLabel: "Password",
      passwordPlaceholder: "Create a strong password",
      submit: "Create Account",
    },
    sidebar: {
      subtitle: "AI Operations Platform",
      dashboard: "Dashboard",
      aiEmployees: "AI Employees",
      aiChat: "AI Chat",
      telegramBot: "Telegram Bot Code",
      conversations: "Conversations",
      billing: "Billing",
      settings: "Settings",
    },
    dashboard: {
      tag: "Operations Overview",
      title: "Dashboard",
      subtitle: "Overview of your AI workforce performance.",
      stats: [
        {
          title: "Messages handled today",
          value: "1,248",
          subtitle: "+16% vs yesterday",
        },
        {
          title: "Active AI employees",
          value: "12",
          subtitle: "Across 4 Telegram bots",
        },
        {
          title: "Automation rate",
          value: "82%",
          subtitle: "Resolved without human takeover",
        },
      ],
      cardTitle: "Scale Support with Confidence",
      cardDescription:
        "Connect new Telegram workflows and let AI employees absorb repetitive request volume while your team handles escalations.",
    },
    createEmployee: {
      tag: "AI Employee Setup",
      title: "Create AI Employee",
      subtitle: "Configure your first AI employee for Telegram customer support.",
      telegramTokenLabel: "Telegram Bot Token",
      telegramTokenPlaceholder: "123456:ABCDEF...",
      businessNameLabel: "Business Name",
      businessNamePlaceholder: "Your company name",
      businessDescriptionLabel: "Business Description",
      businessDescriptionPlaceholder: "What do you do and what should the AI employee handle?",
      faqLabel: "FAQ / Knowledge Input",
      faqPlaceholder: "Paste FAQs, policies, product details, and answer guidelines",
      submit: "Activate AI Employee",
    },
  },
  ru: {
    languageName: "Русский",
    nav: {
      features: "Функции",
      pricing: "Тарифы",
      login: "Вход",
      createAiEmployee: "Создайте AI сотрудника",
      back: "Назад",
      toggleMenu: "Переключить меню",
    },
    landing: {
      badge: "AI команда для поддержки в Telegram",
      heroTitle: "Автоматизируйте поддержку клиентов с AI сотрудниками",
      heroDescription:
        "Запускайте AI сотрудников, которые отвечают мгновенно, снижают рутинную нагрузку и поддерживают диалог 24/7.",
        watchDemo: "Смотрите демо",
      demoTitle: "Посмотрите AI сотрудника в действии",
      demoDescription: "Типичный диалог в Telegram, обрабатываемый автоматически.",
      chatTitle: "Telegram чат",
      aiOnline: "AI сотрудник в сети",
      customerMessage: "Вы доставляете в Самарканд?",
      aiMessage: "Да, доставка займет 2-3 дня и стоит 30 000 UZS.",
      featuresTitle: "Функции",
      featuresDescription: "Возможности, созданные для AI команд поддержки.",
      featureCards: [
        {
          title: "Поддержка клиентов 24/7",
          description: "Отвечайте клиентам мгновенно в любое время без роста нагрузки на команду.",
        },
        {
          title: "Автоматизация в Telegram",
          description: "Подключите Telegram бота за минуты и начните обрабатывать реальные диалоги автоматически.",
        },
        {
          title: "Ответы с учетом бизнеса",
          description: "Обучите AI сотрудников на ваших политиках и FAQ для стабильных брендовых ответов.",
        },
      ],
      pricingTitle: "Тарифы",
      pricingDescription: "Гибкие планы для стартапов, растущих команд и крупных бизнесов.",
      pricingPlans: [
        {
          name: "Starter",
          price: "$29",
          period: "/мес",
          description: "Лучше всего для команд на старте AI поддержки.",
           chooseLabel: "Выберите Starter",
        },
        {
          name: "Pro",
          price: "$99",
          period: "/мес",
          description: "Масштабируйтесь с продвинутыми сценариями и умной обработкой.",
           chooseLabel: "Выберите Pro",
        },
        {
          name: "Business",
          price: "$299",
          period: "/мес",
          description: "Для крупных операций с приоритетной поддержкой и контролем.",
           chooseLabel: "Выберите Business",
        },
      ],
    },
    login: {
      title: "С возвращением",
      subtitle: "Войдите, чтобы управлять AI сотрудниками.",
      emailLabel: "Email",
      emailPlaceholder: "you@company.com",
      passwordLabel: "Пароль",
      passwordPlaceholder: "Введите пароль",
      submit: "Войти",
    },
    signup: {
      title: "Создание аккаунта",
      subtitle: "Начните нанимать AI сотрудников для поддержки.",
      companyNameLabel: "Название компании",
      companyNamePlaceholder: "Acme Inc.",
      emailLabel: "Email",
      emailPlaceholder: "you@company.com",
      passwordLabel: "Пароль",
      passwordPlaceholder: "Создайте надежный пароль",
      submit: "Создать аккаунт",
    },
    sidebar: {
      subtitle: "Платформа AI операций",
      dashboard: "Панель",
      aiEmployees: "AI сотрудники",
      aiChat: "AI чат",
      telegramBot: "Код Telegram бота",
      conversations: "Диалоги",
      billing: "Оплата",
      settings: "Настройки",
    },
    dashboard: {
      tag: "Обзор операций",
      title: "Панель",
      subtitle: "Обзор эффективности вашей AI команды.",
      stats: [
        {
          title: "Сообщений обработано сегодня",
          value: "1,248",
          subtitle: "+16% ко вчерашнему дню",
        },
        {
          title: "Активных AI сотрудников",
          value: "12",
          subtitle: "В 4 Telegram ботах",
        },
        {
          title: "Уровень автоматизации",
          value: "82%",
          subtitle: "Решено без подключения человека",
        },
      ],
      cardTitle: "Масштабируйте поддержку уверенно",
      cardDescription:
        "Подключайте новые Telegram сценарии, а AI сотрудники забирают рутинные запросы, пока команда ведет эскалации.",
    },
    createEmployee: {
      tag: "Настройка AI сотрудника",
      title: "Создайте AI сотрудника",
      subtitle: "Настройте первого AI сотрудника для поддержки в Telegram.",
      telegramTokenLabel: "Токен Telegram бота",
      telegramTokenPlaceholder: "123456:ABCDEF...",
      businessNameLabel: "Название бизнеса",
      businessNamePlaceholder: "Название вашей компании",
      businessDescriptionLabel: "Описание бизнеса",
      businessDescriptionPlaceholder: "Чем вы занимаетесь и что должен обрабатывать AI сотрудник?",
      faqLabel: "FAQ / База знаний",
      faqPlaceholder: "Вставьте FAQ, политики, детали продукта и правила ответов",
      submit: "Активировать AI сотрудника",
    },
  },
  uz: {
    languageName: "O'zbekcha",
    nav: {
      features: "Imkoniyatlar",
      pricing: "Narxlar",
      login: "Kirish",
      createAiEmployee: "AI xodim yarating",
      back: "Orqaga",
      toggleMenu: "Menyuni ochish",
    },
    landing: {
      badge: "Telegram mijozlar yordami uchun AI jamoasi",
      heroTitle: "Mijozlar yordamini AI xodimlar bilan avtomatlashtiring",
      heroDescription:
        "Mijozlarga darhol javob beradigan, takroriy ishni kamaytiradigan va suhbatlarni 24/7 davom ettiradigan AI xodimlarni ishga tushiring.",
        watchDemo: "Demoni ko'ring",
      demoTitle: "AI xodim qanday ishlashini ko'ring",
      demoDescription: "Telegramdagi odatiy suhbat avtomatik tarzda bajariladi.",
      chatTitle: "Telegram chat",
      aiOnline: "AI xodim onlayn",
      customerMessage: "Samarqandga yetkazib berasizlarmi?",
      aiMessage: "Ha, yetkazib berish 2-3 kun davom etadi va narxi 30 000 UZS.",
      featuresTitle: "Imkoniyatlar",
      featuresDescription: "AI yordam jamoalari uchun maxsus yaratilgan funksiyalar.",
      featureCards: [
        {
          title: "24/7 mijozlar yordami",
          description: "Jamoa yuklamasini oshirmasdan mijozlarga istalgan vaqtda tez javob bering.",
        },
        {
          title: "Telegram bilan avtomatlashtirish",
          description: "Telegram botni bir necha daqiqada ulang va real suhbatlarni avtomatik boshqaring.",
        },
        {
          title: "Biznesga mos javoblar",
          description: "Barqaror va brendga mos javoblar uchun AI xodimlarni siyosat va FAQ asosida o'rgating.",
        },
      ],
      pricingTitle: "Narxlar",
      pricingDescription: "Startaplar, o'sayotgan jamoalar va yirik bizneslar uchun mos rejalar.",
      pricingPlans: [
        {
          name: "Starter",
          price: "$29",
          period: "/oy",
          description: "AI yordamni boshlayotgan jamoalar uchun eng yaxshi tanlov.",
           chooseLabel: "Starterni tanlang",
        },
        {
          name: "Pro",
          price: "$99",
          period: "/oy",
          description: "Kengaytirilgan jarayonlar va aqlli boshqaruv bilan o'sing.",
           chooseLabel: "Proni tanlang",
        },
        {
          name: "Business",
          price: "$299",
          period: "/oy",
          description: "Yirik operatsiyalar uchun ustuvor yordam va keng nazorat.",
           chooseLabel: "Businessni tanlang",
        },
      ],
    },
    login: {
      title: "Yana xush kelibsiz",
      subtitle: "AI xodimlarni boshqarish uchun tizimga kiring.",
      emailLabel: "Email",
      emailPlaceholder: "you@company.com",
      passwordLabel: "Parol",
      passwordPlaceholder: "Parolingizni kiriting",
      submit: "Kirish",
    },
    signup: {
      title: "Akkaunt yaratish",
      subtitle: "Yordam jarayonlari uchun AI xodimlarni ishga oling.",
      companyNameLabel: "Kompaniya nomi",
      companyNamePlaceholder: "Acme Inc.",
      emailLabel: "Email",
      emailPlaceholder: "you@company.com",
      passwordLabel: "Parol",
      passwordPlaceholder: "Kuchli parol yarating",
      submit: "Akkaunt yaratish",
    },
    sidebar: {
      subtitle: "AI operatsiyalar platformasi",
      dashboard: "Boshqaruv paneli",
      aiEmployees: "AI xodimlar",
      aiChat: "AI chat",
      telegramBot: "Telegram bot kodi",
      conversations: "Suhbatlar",
      billing: "To'lov",
      settings: "Sozlamalar",
    },
    dashboard: {
      tag: "Operatsiyalar ko'rinishi",
      title: "Boshqaruv paneli",
      subtitle: "AI jamoangiz samaradorligi bo'yicha umumiy ko'rsatkichlar.",
      stats: [
        {
          title: "Bugun qayta ishlangan xabarlar",
          value: "1,248",
          subtitle: "Kechagiga nisbatan +16%",
        },
        {
          title: "Faol AI xodimlar",
          value: "12",
          subtitle: "4 ta Telegram botda",
        },
        {
          title: "Avtomatlashtirish darajasi",
          value: "82%",
          subtitle: "Insonsiz hal qilingan",
        },
      ],
      cardTitle: "Yordamni ishonch bilan kengaytiring",
      cardDescription:
        "Yangi Telegram jarayonlarini ulang va AI xodimlar takroriy so'rovlarni qabul qilganda jamoa murakkab holatlarga e'tibor qaratsin.",
    },
    createEmployee: {
      tag: "AI xodim sozlamasi",
        title: "AI xodim yarating",
      subtitle: "Telegram mijozlar yordami uchun birinchi AI xodimingizni sozlang.",
      telegramTokenLabel: "Telegram bot tokeni",
      telegramTokenPlaceholder: "123456:ABCDEF...",
      businessNameLabel: "Biznes nomi",
      businessNamePlaceholder: "Kompaniya nomingiz",
      businessDescriptionLabel: "Biznes tavsifi",
      businessDescriptionPlaceholder: "Nima ish qilasiz va AI xodim nimalarni bajarishi kerak?",
      faqLabel: "FAQ / Bilimlar bazasi",
      faqPlaceholder: "FAQ, siyosatlar, mahsulot tafsilotlari va javob qoidalarini kiriting",
      submit: "AI xodimni faollashtirish",
    },
  },
};
