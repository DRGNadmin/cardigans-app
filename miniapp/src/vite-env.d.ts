/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  /** light | dark — если нет `themeParams.bg_color`, под него подстраиваем фон */
  colorScheme?: string;
  /** tdesktop, web, android, ios, … */
  platform?: string;
  viewportStableHeight?: number;
  viewportHeight?: number;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      /** URL фото профиля (если клиент Telegram его передал). */
      photo_url?: string;
    };
  };
  themeParams: Record<string, string | undefined>;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  /** Предпочтительно вместо `window.confirm` внутри Mini App */
  showConfirm?: (message: string, callback?: (ok: boolean) => void) => void;
  showAlert?: (message: string, callback?: () => void) => void;
  /** Открыть внешнюю ссылку (предпочтительно вместо `window.open` в Mini App). */
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
}
