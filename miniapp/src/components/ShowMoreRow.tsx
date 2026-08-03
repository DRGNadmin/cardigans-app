/** Кнопка «Посмотреть все» / «Свернуть» для сокращённых списков. */
export function ShowMoreRow({
  expanded,
  onToggle,
  totalHidden,
}: {
  expanded: boolean;
  onToggle: () => void;
  /** Сколько элементов скрыто (показываем в подписи, если > 0). */
  totalHidden?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-2 w-full rounded-md border border-[--accent]/30 bg-[--accent]/10 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[--accent] transition-colors hover:bg-[--accent]/18"
    >
      {expanded
        ? "Свернуть"
        : totalHidden != null && totalHidden > 0
          ? `Посмотреть все (+${totalHidden})`
          : "Посмотреть все"}
    </button>
  );
}

export const PREVIEW_USER_LIST = 2;
export const PREVIEW_ADMIN_LIST = 3;
