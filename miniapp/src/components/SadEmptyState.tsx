/** Пустое состояние: грустный смайлик в стилистике приложения + текст. */
export function SadEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 text-center">
      <div
        className="mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-[--panel-border] bg-white/[0.04] shadow-[0_0_28px_rgba(233,141,43,0.12)]"
        aria-hidden
      >
        <svg
          viewBox="0 0 64 64"
          className="h-[3.25rem] w-[3.25rem] text-[--accent]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="32" cy="32" r="27" stroke="currentColor" strokeWidth="1.75" opacity="0.45" />
          <circle cx="24" cy="27" r="3.25" fill="currentColor" opacity="0.85" />
          <circle cx="40" cy="27" r="3.25" fill="currentColor" opacity="0.85" />
          <path
            d="M23 43c3.2-4.2 6.8-6.5 9-6.5s5.8 2.3 9 6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      </div>
      <p className="max-w-[300px] text-center text-sm font-medium leading-relaxed tracking-wide text-[--text-muted]">
        {message}
      </p>
    </div>
  );
}
