import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useLocation } from "react-router-dom";
import { getTasks } from "../api";

function NavTabShell({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={`relative flex h-[52px] w-[68px] flex-col items-center justify-center rounded-xl transition-all duration-200 ease-out motion-reduce:transition-none ${
        active
          ? "scale-[1.05] text-[--accent] motion-reduce:scale-100"
          : "text-[--text-muted] hover:scale-[1.03] hover:text-white motion-reduce:hover:scale-100"
      }`}
    >
      {active ? (
        <>
          <span
            className="pointer-events-none absolute -top-0.5 left-1/2 z-0 h-1 w-10 -translate-x-1/2 rounded-full bg-[--accent] shadow-[0_0_16px_rgba(233,141,43,0.85)]"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute inset-[3px] rounded-lg bg-gradient-to-b from-[--accent]/18 via-[--accent]/05 to-transparent opacity-95"
            aria-hidden
          />
        </>
      ) : null}
      <span className="relative z-[1] flex items-center justify-center [&>svg]:drop-shadow-sm">
        {children}
      </span>
    </span>
  );
}

function NavTarget({ active }: { active: boolean }) {
  return (
    <NavTabShell active={active}>
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256">
        <path
          fill="currentColor"
          d="M224,128a96,96,0,1,1-96-96A96.11,96.11,0,0,1,224,128Zm-32,0a64,64,0,1,0-64,64A64.07,64.07,0,0,0,192,128Zm-32,0a32,32,0,1,0-32,32A32,32,0,0,0,160,128Z"
        />
      </svg>
    </NavTabShell>
  );
}

function NavTasks({ active, showDot }: { active: boolean; showDot: boolean }) {
  return (
    <NavTabShell active={active}>
      <span className="relative inline-flex">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256">
          <path
            fill="currentColor"
            d="M200,32h-36.26A47.92,47.92,0,0,0,80,48H56A16,16,0,0,0,40,64V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32ZM112,48a32,32,0,0,1,32-32,32,32,0,0,1,32,32ZM200,216H56V48H80V64a16,16,0,0,0,16,16h64a16,16,0,0,0,16-16V48h24V216ZM108,124a8,8,0,0,1-11.32,11.32l-16-16a8,8,0,0,1,11.32-11.32L100,116l28.69-28.69a8,8,0,0,1,11.31,11.32Zm60,0a8,8,0,0,1-11.32,11.32l-16-16a8,8,0,0,1,11.32-11.32L160,116l28.69-28.69a8,8,0,0,1,11.31,11.32Z"
          />
        </svg>
        {showDot ? (
          <span
            className="absolute -bottom-0.5 -right-1 h-2 w-2 animate-pulse rounded-full bg-red-500 ring-2 ring-[#0a0a0a] motion-reduce:animate-none"
            aria-hidden
          />
        ) : null}
      </span>
    </NavTabShell>
  );
}

function NavShop({ active }: { active: boolean }) {
  return (
    <NavTabShell active={active}>
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256">
        <path
          fill="currentColor"
          d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"
        />
      </svg>
    </NavTabShell>
  );
}

function NavProfile({ active, adminBadge }: { active: boolean; adminBadge: boolean }) {
  return (
    <NavTabShell active={active}>
      <span className="relative inline-flex">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256">
          <path
            fill="currentColor"
            d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"
          />
        </svg>
        {adminBadge ? (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[--accent] bg-[--panel-bg]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 256 256"
              className="text-[--accent]"
            >
              <path
                fill="currentColor"
                d="M208,192H48a8,8,0,0,1-6.88-12C47.71,168.6,56,139.81,56,104a72,72,0,0,1,144,0c0,35.82,8.3,64.6,14.9,76A8,8,0,0,1,208,192ZM128,224a32.05,32.05,0,0,1-32-32h64A32.05,32.05,0,0,1,128,224Z"
              />
            </svg>
          </span>
        ) : null}
      </span>
    </NavTabShell>
  );
}

const navLinkClass =
  "flex flex-col items-center rounded-xl p-0.5 transition-transform duration-150 ease-out active:scale-[0.93] motion-reduce:active:scale-100 outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]";

export function BottomNav({
  isAdmin,
  layout = "fixed",
}: {
  isAdmin: boolean;
  /** `embedded` — без position:fixed, чтобы не перекрывать нижнюю панель (комната матча) */
  layout?: "fixed" | "embedded";
}) {
  const loc = useLocation();
  const path = loc.pathname;
  const homeActive = path === "/" || path.startsWith("/matches/") || path.startsWith("/match-room/");
  const tasksActive = path === "/tasks";
  const shopActive = path === "/shop";
  const profileActive = path === "/profile" || path === "/admin";

  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: getTasks });
  const tasksNavDot = useMemo(() => {
    if (tasksActive) return false;
    return tasks?.some((t) => t.completed && !t.claimed) ?? false;
  }, [tasks, tasksActive]);

  const navClass =
    layout === "embedded"
      ? "nav-glass relative z-[1] w-full shrink-0 pb-safe"
      : "nav-glass fixed bottom-0 left-0 z-50 w-full pb-safe";

  return (
    <nav className={navClass}>
      <div className="flex items-center justify-around px-2 py-4">
        <NavLink to="/" data-tour="nav-home" className={navLinkClass} aria-label="Матчи">
          <NavTarget active={homeActive} />
        </NavLink>
        <NavLink
          to="/tasks"
          data-tour="nav-tasks"
          className={navLinkClass}
          aria-label={tasksNavDot ? "Задания — есть награда к получению" : "Задания"}
        >
          <NavTasks active={tasksActive} showDot={tasksNavDot} />
        </NavLink>
        <NavLink to="/shop" data-tour="nav-shop" className={navLinkClass} aria-label="Магазин">
          <NavShop active={shopActive} />
        </NavLink>
        <NavLink to="/profile" data-tour="nav-profile" className={navLinkClass} aria-label="Профиль">
          <NavProfile active={profileActive} adminBadge={isAdmin} />
        </NavLink>
      </div>
    </nav>
  );
}
