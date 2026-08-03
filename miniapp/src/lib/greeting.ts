/** Приветствие по локальному времени устройства. */
export function timeGreetingPrefix(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Доброе утро,";
  if (h >= 12 && h < 18) return "Добрый день,";
  return "Добрый вечер,";
}
