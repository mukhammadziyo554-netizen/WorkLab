interface TelegramWebAppUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
  };
}

interface TelegramGlobal {
  WebApp?: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram?: TelegramGlobal;
  }
}

export {};
