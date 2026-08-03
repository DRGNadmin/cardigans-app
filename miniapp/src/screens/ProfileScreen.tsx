import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appendSupportTicketFollowUp,
  createSupportTicket,
  getMe,
  getOrders,
  getPredictionsMe,
  getSupportTickets,
  patchMe,
  type SupportTicket,
} from "../api";
import { BrandBackdrop } from "../components/BrandBackdrop";
import { PREVIEW_USER_LIST, ShowMoreRow } from "../components/ShowMoreRow";
import { GemIcon } from "../components/GemIcon";
import { ProfileAvatarFrame } from "../components/ProfileAvatarFrame";
import { formatGems, formatMatchWhen } from "../lib/format";
import { profileFrameSpec } from "../lib/profileCosmetic";
import { normalizeSteamTradeUrl, STEAM_TRADE_URL_ERROR } from "../lib/steamTradeUrl";

function fmtTicketDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function supportStatusUi(s: SupportTicket["status"], hasAdminReply?: boolean): { label: string; className: string } {
  switch (s) {
    case "open":
      return {
        label: hasAdminReply ? "Ждём ответ снова" : "Ожидает ответа",
        className: "text-amber-400 bg-amber-400/10 border-amber-400/25",
      };
    case "answered":
      return { label: "Ответ получен", className: "text-green-400 bg-green-400/10 border-green-400/25" };
    case "closed":
      return { label: "Закрыто", className: "text-[--text-muted] bg-white/5 border-[--panel-border]" };
    default:
      return { label: s, className: "text-[--text-muted] bg-white/5 border-[--panel-border]" };
  }
}

function orderStatusUi(status: string): { label: string; className: string } {
  switch (status) {
    case "new":
      return {
        label: "Обрабатывается",
        className: "text-blue-400 bg-blue-400/10 border-blue-400/20",
      };
    case "contact_sent":
      return {
        label: "В доставке",
        className: "text-[--accent] bg-[--accent]/10 border-[--accent]/20",
      };
    case "completed":
      return { label: "Доставлен", className: "text-green-400 bg-green-400/10 border-green-400/20" };
    default:
      return { label: status, className: "text-[--text-muted] bg-white/5 border-[--panel-border]" };
  }
}

export function ProfileScreen() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: orders } = useQuery({ queryKey: ["orders"], queryFn: getOrders });
  const { data: preds } = useQuery({ queryKey: ["predictions-me"], queryFn: getPredictionsMe });
  const [tradeUrl, setTradeUrl] = useState("");
  const [tradeUrlError, setTradeUrlError] = useState<string | null>(null);
  const [tradeUrlSaved, setTradeUrlSaved] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportDetail, setSupportDetail] = useState<SupportTicket | null>(null);
  const [supportDraft, setSupportDraft] = useState("");
  const [supportFollowUpDraft, setSupportFollowUpDraft] = useState("");
  const [expandActivePreds, setExpandActivePreds] = useState(false);
  const [expandHistoryPreds, setExpandHistoryPreds] = useState(false);
  const [expandActiveOrders, setExpandActiveOrders] = useState(false);

  useEffect(() => setTradeUrl(me?.steamTradeUrl ?? ""), [me?.steamTradeUrl]);

  useEffect(() => {
    setSupportFollowUpDraft("");
  }, [supportDetail?.id]);

  const supportTickets = useQuery({
    queryKey: ["support-tickets"],
    queryFn: getSupportTickets,
    enabled: supportOpen,
  });

  const sendSupport = useMutation({
    mutationFn: (msg: string) => createSupportTicket(msg),
    onSuccess: () => {
      setSupportDraft("");
      void qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });

  const sendSupportFollowUp = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => appendSupportTicketFollowUp(id, text),
    onSuccess: (data) => {
      setSupportFollowUpDraft("");
      setSupportDetail(data);
      void qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = tradeUrl.trim();
      if (!trimmed) return patchMe(null);
      const normalized = normalizeSteamTradeUrl(trimmed);
      if (!normalized) {
        throw new Error(STEAM_TRADE_URL_ERROR);
      }
      return patchMe(normalized);
    },
    onSuccess: () => {
      setTradeUrlError(null);
      setTradeUrlSaved(true);
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => {
      setTradeUrlSaved(false);
      setTradeUrlError(e.message);
    },
  });

  const [tgPhotoFailed, setTgPhotoFailed] = useState(false);
  const [tgPhotoUrl, setTgPhotoUrl] = useState<string | undefined>(() =>
    typeof window !== "undefined"
      ? window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url
      : undefined
  );

  useEffect(() => {
    const read = () => window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
    setTgPhotoUrl((prev) => prev ?? read());
    const t = window.setTimeout(() => setTgPhotoUrl((prev) => prev ?? read()), 400);
    return () => window.clearTimeout(t);
  }, []);

  const initial =
    (me?.firstName?.[0] ?? me?.username?.[0] ?? "?").toUpperCase();
  const handle = me?.username ? `@${me.username}` : me?.firstName ?? "Профиль";

  const activePreds = preds?.filter((p) => p.match.status !== "finished") ?? [];
  const historyPreds = preds?.filter((p) => p.match.status === "finished") ?? [];
  const activeOrders =
    orders?.filter((o) => o.status !== "completed" && o.status !== "cancelled") ?? [];
  const visibleActivePreds =
    expandActivePreds || activePreds.length <= PREVIEW_USER_LIST
      ? activePreds
      : activePreds.slice(0, PREVIEW_USER_LIST);
  const visibleHistoryPreds =
    expandHistoryPreds || historyPreds.length <= PREVIEW_USER_LIST
      ? historyPreds
      : historyPreds.slice(0, PREVIEW_USER_LIST);
  const visibleActiveOrders =
    expandActiveOrders || activeOrders.length <= PREVIEW_USER_LIST
      ? activeOrders
      : activeOrders.slice(0, PREVIEW_USER_LIST);
  const frameSpec = profileFrameSpec(me?.level);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <BrandBackdrop />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 flex flex-col items-center gap-3 border-b border-[--panel-border] bg-black/50 px-4 pb-6 pt-10 backdrop-blur-xl">
        <div className="relative flex flex-col items-center gap-2">
          <ProfileAvatarFrame spec={frameSpec} sizePx={80}>
            <div className="h-full w-full bg-gradient-to-br from-[--accent] to-red-600">
              {tgPhotoUrl && !tgPhotoFailed ? (
                <img
                  src={tgPhotoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setTgPhotoFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-head text-3xl font-bold tracking-wider text-white">{initial}</span>
                </div>
              )}
            </div>
          </ProfileAvatarFrame>
          <span className="max-w-[240px] text-center text-[9px] font-medium uppercase leading-tight tracking-widest text-[--text-muted]">
            {frameSpec.frameLabel} · косметика за уровень
          </span>
        </div>
        <div className="flex flex-col items-center">
          <h1 className="head-text text-xl tracking-wider text-white">{handle}</h1>
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-widest text-[--text-muted]">
            Telegram ID: {me?.telegramId ?? "—"}
            {me?.isAdmin ? " · Админ" : ""}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 rounded-full border border-[--accent]/30 bg-black/40 px-4 py-1.5 shadow-[0_0_15px_rgba(233,141,43,0.1)]">
          <span className="text-base font-bold tracking-wide text-[--accent]">
            {me != null ? formatGems(me.gemsBalance) : "—"}
          </span>
          <GemIcon size={16} className="text-[--accent]" />
        </div>
        {me?.isAdmin ? (
          <Link
            to="/admin"
            className="btn-action mt-2 rounded-[--radius-sm] border border-[--accent]/40 bg-[--accent]/15 px-4 py-2 text-xs font-bold text-[--accent]"
          >
            Админ панель
          </Link>
        ) : null}
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-32 pt-6">
        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 256 256"
              className="text-[--accent]"
            >
              <path
                fill="currentColor"
                d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"
              />
            </svg>
            <h2 className="head-text text-base">Активные прогнозы</h2>
          </div>
          <div className="flex flex-col gap-3">
            {activePreds.length === 0 ? (
              <p className="text-sm text-[--text-muted]">Нет активных прогнозов</p>
            ) : null}
            {visibleActivePreds.map((p) => (
              <Link
                key={p.id}
                to={`/match-room/${p.match.id}`}
                className="profile-card flex items-center justify-between p-3 transition-colors hover:border-[--accent]/25"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[--text-muted]">Комната матча</span>
                  <span className="font-head text-[15px] tracking-wide text-white">
                    {p.match.teamA} <span className="mx-1 text-[12px] text-[--accent]">VS</span> {p.match.teamB}
                  </span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[11px] text-[--text-muted]">Прогноз:</span>
                    <span className="text-[11px] font-semibold text-[--accent]">{p.optionLabel}</span>
                  </div>
                </div>
                <div
                  className={
                    p.match.status === "live"
                      ? "match-live-badge whitespace-nowrap px-2 py-1 text-[9px]"
                      : "whitespace-nowrap rounded-[--radius-sm] border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-yellow-500"
                  }
                >
                  {p.match.status === "live" ? "LIVE" : "В ожидании"}
                </div>
              </Link>
            ))}
            {activePreds.length > PREVIEW_USER_LIST ? (
              <ShowMoreRow
                expanded={expandActivePreds}
                onToggle={() => setExpandActivePreds((v) => !v)}
                totalHidden={expandActivePreds ? 0 : activePreds.length - PREVIEW_USER_LIST}
              />
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 256 256"
              className="text-[--text-muted]"
            >
              <path
                fill="currentColor"
                d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"
              />
            </svg>
            <h2 className="head-text text-base">История прогнозов</h2>
          </div>
          <div className="flex flex-col gap-3">
            {historyPreds.length === 0 ? (
              <p className="text-sm text-[--text-muted]">История пуста</p>
            ) : null}
            {visibleHistoryPreds.map((p) => {
              const win =
                p.match.winningOptionId != null && p.optionId === p.match.winningOptionId;
              return (
                <div key={p.id} className="profile-card relative overflow-hidden p-3">
                  <div
                    className={`absolute bottom-0 left-0 top-0 w-1 ${win ? "bg-green-500/50" : "bg-red-500/50"}`}
                  />
                  <div className="flex justify-between pl-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-head text-[14px] tracking-wide text-white">
                        {p.match.teamA} <span className="mx-1 text-[12px] text-[--text-muted]">VS</span>{" "}
                        {p.match.teamB}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[--text-muted]">Прогноз:</span>
                        <span className="text-[11px] text-white">{p.optionLabel}</span>
                      </div>
                      <span className="mt-1 text-[10px] text-[--text-muted]">
                        {formatMatchWhen(p.match.startsAt)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {win ? (
                        <>
                          <div className="flex items-center gap-1 rounded-[--radius-sm] border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[10px] font-bold text-green-400">
                            Выигрыш
                          </div>
                          {p.rewardPaid ? (
                            <div className="mt-1 flex items-center gap-1 text-green-400">
                              <span className="text-xs font-bold">
                                +{p.rewardGemsPaid ?? p.match.rewardGems}
                              </span>
                              <GemIcon size={10} />
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="flex items-center gap-1 rounded-[--radius-sm] border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          Проигрыш
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {historyPreds.length > PREVIEW_USER_LIST ? (
              <ShowMoreRow
                expanded={expandHistoryPreds}
                onToggle={() => setExpandHistoryPreds((v) => !v)}
                totalHidden={expandHistoryPreds ? 0 : historyPreds.length - PREVIEW_USER_LIST}
              />
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 256 256"
              className="text-[--text-muted]"
            >
              <path
                fill="currentColor"
                d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"
              />
            </svg>
            <h2 className="head-text text-base">Активные заказы</h2>
          </div>
          <div className="flex flex-col gap-3">
            {activeOrders.length === 0 ? (
              <p className="text-sm text-[--text-muted]">Нет активных заказов</p>
            ) : null}
            {visibleActiveOrders.map((o) => {
                const st = orderStatusUi(o.status);
                const ph = o.item.title.slice(0, 5).toUpperCase() || "?";
                return (
                  <div key={o.id} className="profile-card flex items-center gap-3 p-3">
                    <div className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded border border-[--panel-border] bg-black/60 shadow-inner">
                      {o.item.imageUrl ? (
                        <img
                          src={o.item.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-head text-[10px] text-white">
                          {ph}
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-head text-[14px] text-white">{o.item.title}</span>
                      <span className="mt-1 w-fit rounded-sm border border-white/5 bg-black/50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[--text-muted]">
                        {o.item.game === "DOTA2" ? "DOTA 2" : "CS2"}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 pl-2">
                      <div
                        className={`rounded-[--radius-sm] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${st.className}`}
                      >
                        {st.label}
                      </div>
                      <div className="flex items-center gap-1 text-[--text-muted]">
                        <span className="text-[11px] font-bold">{formatGems(o.priceGems)}</span>
                        <GemIcon size={10} />
                      </div>
                    </div>
                  </div>
                );
              })}
            {activeOrders.length > PREVIEW_USER_LIST ? (
              <ShowMoreRow
                expanded={expandActiveOrders}
                onToggle={() => setExpandActiveOrders((v) => !v)}
                totalHidden={expandActiveOrders ? 0 : activeOrders.length - PREVIEW_USER_LIST}
              />
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="head-text text-base">Настройки</h2>
          </div>
          <div className="profile-card flex flex-col gap-3 p-4">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[--text-muted]">
              Ссылка для обмена Steam (Trade URL)
            </label>
            <input
              type="text"
              value={tradeUrl}
              onChange={(e) => {
                setTradeUrl(e.target.value);
                setTradeUrlError(null);
                setTradeUrlSaved(false);
              }}
              placeholder="https://steamcommunity.com/tradeoffer/new/..."
              className="input-glass w-full rounded-[--radius-sm] p-3 text-sm"
            />
            {tradeUrlError ? (
              <p className="text-[11px] leading-snug text-red-400">{tradeUrlError}</p>
            ) : null}
            {tradeUrlSaved && !tradeUrlError ? (
              <p className="text-[11px] font-semibold text-green-400">Сохранено</p>
            ) : null}
            <div className="mt-1 flex items-start justify-between gap-3">
              <span className="text-[10px] leading-relaxed text-[--text-muted]">
                Необходима для получения предметов из магазина
              </span>
              <button
                type="button"
                className="btn-action shrink-0 rounded-[--radius-sm] bg-[--accent] px-4 py-1.5 text-[10px] font-bold text-black shadow-[0_0_10px_rgba(233,141,43,0.3)]"
                onClick={() => save.mutate()}
                disabled={save.isPending}
              >
                {save.isPending ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn-action mt-3 flex w-full items-center justify-center gap-2 rounded-[--radius-sm] border border-[--accent]/30 bg-[--accent]/10 p-3.5 text-[13px] font-bold text-[--accent] shadow-[0_0_15px_rgba(233,141,43,0.1)] transition-all hover:bg-[--accent]/20"
            onClick={() => {
              setSupportOpen(true);
              void qc.invalidateQueries({ queryKey: ["support-tickets"] });
            }}
          >
            Поддержка
          </button>
        </section>
      </main>
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {supportOpen ? (
                <motion.div
                  className="fixed inset-0 z-[600] flex items-end justify-center sm:items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <motion.button
                    type="button"
                    className="absolute inset-0 bg-black/85 backdrop-blur-md"
                    aria-label="Закрыть"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      setSupportOpen(false);
                      setSupportDetail(null);
                    }}
                  />
                  <motion.div
                    className="relative z-[1] mx-auto flex max-h-[min(88dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] border border-[--panel-border] bg-[#111] shadow-2xl sm:mx-4 sm:max-h-[85vh] sm:max-w-[380px] sm:rounded-[16px]"
                    initial={{ y: "100%", opacity: 0.85 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0.85 }}
                    transition={{ type: "spring", damping: 32, stiffness: 380, mass: 0.7 }}
                    style={{
                      willChange: "transform",
                      marginBottom: "max(0px, env(safe-area-inset-bottom, 0px))",
                    }}
                  >
                    <div className="flex shrink-0 items-center justify-between border-b border-[--panel-border] bg-black/30 px-5 py-4">
                      <span className="font-head text-[15px] uppercase tracking-wide text-white">
                        Поддержка
                      </span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[--panel-border] bg-black/40 text-[--text-muted] transition-colors hover:text-white"
                        onClick={() => {
                          setSupportOpen(false);
                          setSupportDetail(null);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4 overscroll-y-contain">
                      <div>
                        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[--accent]">
                          Активные обращения
                        </h3>
                        {supportTickets.isLoading ? (
                          <p className="text-sm text-[--text-muted]">Загрузка…</p>
                        ) : (supportTickets.data?.filter((t) => t.status !== "closed") ?? []).length === 0 ? (
                          <p className="text-sm text-[--text-muted]">Нет активных</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {supportTickets.data
                              ?.filter((t) => t.status !== "closed")
                              .map((t) => {
                                const st = supportStatusUi(t.status, Boolean(t.adminReply));
                                const preview =
                                  t.message.length > 90 ? `${t.message.slice(0, 90)}…` : t.message;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    className="rounded border border-[--panel-border] bg-black/40 p-3 text-left transition-colors hover:border-[--accent]/35"
                                    onClick={() => setSupportDetail(t)}
                                  >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <span
                                        className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${st.className}`}
                                      >
                                        {st.label}
                                      </span>
                                      <span className="text-[10px] text-[--text-muted]">
                                        {fmtTicketDate(t.createdAt)}
                                      </span>
                                    </div>
                                    <p className="line-clamp-3 text-[12px] leading-snug text-[#ccc]">{preview}</p>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 border-t border-[--panel-border] pt-4">
                        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[--text-muted]">
                          Архив
                        </h3>
                        {(supportTickets.data?.filter((t) => t.status === "closed") ?? []).length === 0 ? (
                          <p className="text-sm text-[--text-muted]">Пусто</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {supportTickets.data
                              ?.filter((t) => t.status === "closed")
                              .map((t) => {
                                const st = supportStatusUi(t.status, Boolean(t.adminReply));
                                const preview =
                                  t.message.length > 90 ? `${t.message.slice(0, 90)}…` : t.message;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    className="rounded border border-[--panel-border] bg-black/25 p-3 text-left opacity-90 transition-colors hover:border-white/15"
                                    onClick={() => setSupportDetail(t)}
                                  >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <span
                                        className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${st.className}`}
                                      >
                                        {st.label}
                                      </span>
                                      <span className="text-[10px] text-[--text-muted]">
                                        {fmtTicketDate(t.createdAt)}
                                      </span>
                                    </div>
                                    <p className="line-clamp-2 text-[12px] leading-snug text-[--text-muted]">
                                      {preview}
                                    </p>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      <div className="mt-8 border-t border-[--panel-border] pt-5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-[--text-muted]">
                          Новое обращение
                        </label>
                        <p className="mt-1 text-[10px] leading-relaxed text-[--text-muted]">
                          Создаётся отдельный тикет. Уточнить к уже отвеченному обращению можно в карточке
                          обращения — кнопка под ответом поддержки.
                        </p>
                        <textarea
                          value={supportDraft}
                          onChange={(e) => setSupportDraft(e.target.value)}
                          placeholder="Опишите вопрос или проблему…"
                          rows={4}
                          className="input-glass mt-2 w-full resize-none rounded-[--radius-sm] p-3 text-sm"
                          maxLength={8000}
                        />
                        <button
                          type="button"
                          className="btn-action mt-2 w-full rounded-[--radius-sm] bg-[--accent] py-2.5 text-[12px] font-bold uppercase tracking-wider text-black disabled:opacity-40"
                          disabled={sendSupport.isPending || supportDraft.trim().length < 3}
                          onClick={() => sendSupport.mutate(supportDraft.trim())}
                        >
                          {sendSupport.isPending ? "Отправка…" : "Отправить"}
                        </button>
                        {sendSupport.isError ? (
                          <p className="mt-2 text-[11px] text-red-400">
                            {(sendSupport.error as Error).message}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
              {supportDetail ? (
                <motion.div
                  className="fixed inset-0 z-[650] flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                    aria-label="Закрыть"
                    onClick={() => setSupportDetail(null)}
                  />
                  <div className="relative z-[1] max-h-[min(80dvh,560px)] w-full max-w-md overflow-hidden rounded-lg border border-[--panel-border] bg-[#111] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[--panel-border] px-4 py-3">
                      <span className="font-head text-sm text-white">Обращение</span>
                      <button
                        type="button"
                        className="text-xl leading-none text-[--text-muted] hover:text-white"
                        onClick={() => setSupportDetail(null)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="max-h-[calc(min(80dvh,560px)-52px)] space-y-4 overflow-y-auto p-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[--text-muted]">
                          Ваше сообщение
                        </span>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#ddd]">
                          {supportDetail.message}
                        </p>
                        <p className="mt-1 text-[10px] text-[--text-muted]">
                          {fmtTicketDate(supportDetail.createdAt)}
                        </p>
                      </div>
                      {supportDetail.adminReply ? (
                        <div className="rounded border border-[--accent]/25 bg-[--accent]/5 p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[--accent]">
                            Ответ поддержки
                          </span>
                          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[--text-main]">
                            {supportDetail.adminReply}
                          </p>
                          {supportDetail.repliedAt ? (
                            <p className="mt-2 text-[10px] text-[--text-muted]">
                              {fmtTicketDate(supportDetail.repliedAt)}
                            </p>
                          ) : null}
                        </div>
                      ) : supportDetail.status === "open" ? (
                        <p className="text-[12px] text-[--text-muted]">Ожидаем ответ от поддержки.</p>
                      ) : null}

                      {supportDetail.status !== "closed" && supportDetail.adminReply ? (
                        <div className="border-t border-[--panel-border] pt-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[--accent]">
                            Дополнить обращение
                          </span>
                          <p className="mt-1 text-[10px] leading-relaxed text-[--text-muted]">
                            Текст добавится к переписке; тикет снова уйдёт в очередь поддержки. Пока тикет не
                            закрыт в архив, можно писать несколько раз.
                          </p>
                          <textarea
                            value={supportFollowUpDraft}
                            onChange={(e) => setSupportFollowUpDraft(e.target.value)}
                            placeholder="Уточнение или новый вопрос по этому же обращению…"
                            rows={3}
                            className="input-glass mt-2 w-full resize-none rounded-[--radius-sm] p-3 text-sm"
                            maxLength={8000}
                          />
                          <button
                            type="button"
                            className="btn-action mt-2 w-full rounded-[--radius-sm] border border-[--accent]/40 bg-[--accent]/15 py-2.5 text-[12px] font-bold uppercase tracking-wider text-[--accent] disabled:opacity-40"
                            disabled={
                              sendSupportFollowUp.isPending || supportFollowUpDraft.trim().length < 2
                            }
                            onClick={() =>
                              sendSupportFollowUp.mutate({
                                id: supportDetail.id,
                                text: supportFollowUpDraft.trim(),
                              })
                            }
                          >
                            {sendSupportFollowUp.isPending ? "Отправка…" : "Отправить дополнение"}
                          </button>
                          {sendSupportFollowUp.isError ? (
                            <p className="mt-2 text-[11px] text-red-400">
                              {(sendSupportFollowUp.error as Error).message}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}
