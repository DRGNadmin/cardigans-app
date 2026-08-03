import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminShopItem,
  createMatch,
  deleteAdminMatch,
  deleteAdminShopItem,
  getAdminMatches,
  getAdminOrders,
  getAdminShopItems,
  getAdminStats,
  getAdminSupportTickets,
  getAdminToken,
  getMe,
  getToken,
  patchAdminMatch,
  patchAdminOrder,
  patchAdminShopItem,
  patchAdminSupportTicket,
  type AdminOrderStatus,
  type SupportTicketStatus,
} from "../api";
import { SHOP_RARITY_OPTIONS, type ShopItemRarity } from "../lib/shopRarity";
import { BrandBackdrop } from "../components/BrandBackdrop";
import { PREVIEW_ADMIN_LIST, ShowMoreRow } from "../components/ShowMoreRow";
import { BottomNav } from "../components/BottomNav";
import { GemIcon } from "../components/GemIcon";
import { formatGems, formatMatchWhen, isoToDatetimeLocal } from "../lib/format";
import { telegramAlert, telegramConfirm } from "../lib/telegramDialog";

const ORDER_OPTIONS: { value: AdminOrderStatus; label: string }[] = [
  { value: "new", label: "Обрабатывается" },
  { value: "contact_sent", label: "В доставке" },
  { value: "completed", label: "Доставлен" },
  { value: "cancelled", label: "Отменён" },
];

function orderSelectClass(status: string): string {
  if (status === "new") return "!text-blue-400 !border-blue-400/30 !bg-blue-400/5";
  if (status === "contact_sent") return "!text-[--accent] !border-[--accent]/30 !bg-[--accent]/5";
  if (status === "completed") return "!text-green-400 !border-green-400/30 !bg-green-400/5";
  return "!text-red-400 !border-red-400/30 !bg-red-400/5";
}

export function AdminScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const adminMainRef = useRef<HTMLElement | null>(null);
  const adminScrollStashRef = useRef(0);

  const stashAdminMainScroll = () => {
    const el = adminMainRef.current;
    if (el) adminScrollStashRef.current = el.scrollTop;
  };

  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  /** Достаточно JWT из Telegram; `cg_admin_token` не обязателен (в api приоритет у `cg_token`). */
  const authed = Boolean(me.data?.isAdmin && (getToken() || getAdminToken()));

  const [game, setGame] = useState<"CS2" | "DOTA2">("CS2");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [rewardGems, setRewardGems] = useState(50);
  const [teamALogoUrl, setTeamALogoUrl] = useState("");
  const [teamBLogoUrl, setTeamBLogoUrl] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [finishId, setFinishId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editGame, setEditGame] = useState<"CS2" | "DOTA2">("CS2");
  const [editTeamA, setEditTeamA] = useState("");
  const [editTeamB, setEditTeamB] = useState("");
  const [editTeamALogoUrl, setEditTeamALogoUrl] = useState("");
  const [editTeamBLogoUrl, setEditTeamBLogoUrl] = useState("");
  const [editStreamUrl, setEditStreamUrl] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editPredEndsAt, setEditPredEndsAt] = useState("");
  const [editRewardGems, setEditRewardGems] = useState(50);
  const [editOptLabel0, setEditOptLabel0] = useState("");
  const [editOptLabel1, setEditOptLabel1] = useState("");

  const adminStats = useQuery({ queryKey: ["admin-stats"], queryFn: getAdminStats, enabled: authed });
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: getAdminOrders, enabled: authed });
  const supportTickets = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: getAdminSupportTickets,
    enabled: authed,
    retry: 2,
  });
  const matches = useQuery({ queryKey: ["admin-matches"], queryFn: getAdminMatches, enabled: authed });
  const shopItems = useQuery({ queryKey: ["admin-shop-items"], queryFn: getAdminShopItems, enabled: authed });

  const [shopGame, setShopGame] = useState<"CS2" | "DOTA2">("CS2");
  const [shopTitle, setShopTitle] = useState("");
  const [shopRarity, setShopRarity] = useState<ShopItemRarity>("restricted");
  const [shopImageUrl, setShopImageUrl] = useState("");
  const [shopPrice, setShopPrice] = useState(100);
  const [shopStock, setShopStock] = useState(1);

  const [supportModalId, setSupportModalId] = useState<string | null>(null);
  const [supportReply, setSupportReply] = useState("");
  const [supportStatus, setSupportStatus] = useState<SupportTicketStatus>("open");
  const [expandAdminShop, setExpandAdminShop] = useState(false);
  const [expandAdminOrders, setExpandAdminOrders] = useState(false);
  const [expandAdminSupport, setExpandAdminSupport] = useState(false);
  const [expandAdminMatchActive, setExpandAdminMatchActive] = useState(false);
  const [expandAdminMatchArchive, setExpandAdminMatchArchive] = useState(false);
  const [expandAdminMatchDeleted, setExpandAdminMatchDeleted] = useState(false);

  const createM = useMutation({
    mutationFn: () => {
      const s = new Date(startsAt);
      const now = Date.now();
      let predMs = s.getTime() - 5 * 60 * 1000;
      if (predMs <= now) predMs = now + 2 * 60 * 1000;
      if (predMs >= s.getTime()) predMs = s.getTime() - 60 * 1000;
      if (predMs <= now) {
        throw new Error("Укажите начало матча хотя бы на несколько минут позже текущего времени");
      }
      const predEnd = new Date(predMs);
      const aTrim = teamALogoUrl.trim();
      const bTrim = teamBLogoUrl.trim();
      const streamTrim = streamUrl.trim();
      return createMatch({
        game,
        teamA: teamA.trim(),
        teamB: teamB.trim(),
        ...(aTrim ? { teamALogoUrl: aTrim } : {}),
        ...(bTrim ? { teamBLogoUrl: bTrim } : {}),
        ...(streamTrim ? { streamUrl: streamTrim } : {}),
        startsAt: s.toISOString(),
        predictionEndsAt: predEnd.toISOString(),
        rewardGems,
        options: [{ label: teamA.trim() || "Команда 1" }, { label: teamB.trim() || "Команда 2" }],
      });
    },
    onSuccess: () => {
      setTeamA("");
      setTeamB("");
      setTeamALogoUrl("");
      setTeamBLogoUrl("");
      setStreamUrl("");
      void qc.invalidateQueries({ queryKey: ["admin-matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches-archive"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const patchOrder = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminOrderStatus }) => patchAdminOrder(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const patchSupport = useMutation({
    mutationFn: (payload: { id: string; adminReply?: string; status?: SupportTicketStatus }) =>
      patchAdminSupportTicket(payload.id, { adminReply: payload.adminReply, status: payload.status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setSupportModalId(null);
    },
  });

  const createShop = useMutation({
    mutationFn: () =>
      createAdminShopItem({
        game: shopGame,
        title: shopTitle.trim(),
        rarity: shopRarity,
        imageUrl: shopImageUrl.trim() ? shopImageUrl.trim() : null,
        priceGems: shopPrice,
        stock: shopStock,
      }),
    onSuccess: () => {
      setShopTitle("");
      setShopImageUrl("");
      void qc.invalidateQueries({ queryKey: ["admin-shop-items"] });
      void qc.invalidateQueries({ queryKey: ["shop"] });
    },
  });

  const patchShopItem = useMutation({
    mutationFn: (p: {
      id: string;
      body: Partial<{
        game: "CS2" | "DOTA2";
        title: string;
        rarity: ShopItemRarity;
        imageUrl: string | null;
        priceGems: number;
        stock: number;
        isActive: boolean;
      }>;
    }) => patchAdminShopItem(p.id, p.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-shop-items"] });
      void qc.invalidateQueries({ queryKey: ["shop"] });
    },
  });

  const deleteShopItem = useMutation({
    mutationFn: deleteAdminShopItem,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-shop-items"] });
      void qc.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (e: Error) => {
      void telegramAlert(e.message || "Не удалось удалить лот");
    },
  });

  const cancelMatch = useMutation({
    mutationFn: (id: string) => patchAdminMatch(id, { status: "cancelled" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches-archive"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const deleteMatch = useMutation({
    mutationFn: deleteAdminMatch,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches-archive"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => {
      void telegramAlert(e.message || "Не удалось удалить матч");
    },
  });

  const saveEditMatch = useMutation({
    mutationFn: async () => {
      const m = matches.data?.find((x) => x.id === editId);
      if (!m || !editId) throw new Error("Нет матча");
      const s = new Date(editStartsAt);
      const p = new Date(editPredEndsAt);
      if (Number.isNaN(s.getTime()) || Number.isNaN(p.getTime())) {
        throw new Error("Некорректные даты");
      }
      if (p.getTime() >= s.getTime()) {
        throw new Error("Окончание приёма прогнозов должно быть раньше старта матча");
      }
      const aTrim = editTeamALogoUrl.trim();
      const bTrim = editTeamBLogoUrl.trim();
      const streamTrim = editStreamUrl.trim();
      return patchAdminMatch(editId, {
        game: editGame,
        teamA: editTeamA.trim(),
        teamB: editTeamB.trim(),
        ...(aTrim ? { teamALogoUrl: aTrim } : { teamALogoUrl: null }),
        ...(bTrim ? { teamBLogoUrl: bTrim } : { teamBLogoUrl: null }),
        ...(streamTrim ? { streamUrl: streamTrim } : { streamUrl: null }),
        startsAt: s.toISOString(),
        predictionEndsAt: p.toISOString(),
        rewardGems: editRewardGems,
        options:
          m.options.length >= 2
            ? [
                { id: m.options[0].id, label: editOptLabel0.trim() || m.options[0].label },
                { id: m.options[1].id, label: editOptLabel1.trim() || m.options[1].label },
              ]
            : undefined,
      });
    },
    onSuccess: () => {
      setEditId(null);
      void qc.invalidateQueries({ queryKey: ["admin-matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches-archive"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const finishMatch = useMutation({
    mutationFn: ({ id, winningOptionId }: { id: string; winningOptionId: string }) =>
      patchAdminMatch(id, { status: "finished", winningOptionId }),
    onSuccess: () => {
      setFinishId(null);
      void qc.invalidateQueries({ queryKey: ["admin-matches"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["matches-archive"], refetchType: "all" });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  useEffect(() => {
    if (!editId || !matches.data) return;
    const m = matches.data.find((x) => x.id === editId);
    if (!m || m.deletedAt) return;
    setEditGame(m.game as "CS2" | "DOTA2");
    setEditTeamA(m.teamA);
    setEditTeamB(m.teamB);
    setEditTeamALogoUrl(m.teamALogoUrl ?? "");
    setEditTeamBLogoUrl(m.teamBLogoUrl ?? "");
    setEditStreamUrl(m.streamUrl ?? "");
    setEditStartsAt(isoToDatetimeLocal(m.startsAt));
    setEditPredEndsAt(isoToDatetimeLocal(m.predictionEndsAt));
    setEditRewardGems(m.rewardGems);
    setEditOptLabel0(m.options[0]?.label ?? "");
    setEditOptLabel1(m.options[1]?.label ?? "");
  }, [editId, matches.data]);

  const adminModalOpen = Boolean(supportModalId || editId || finishId);
  useLayoutEffect(() => {
    const el = adminMainRef.current;
    if (!el || !adminModalOpen) return;
    el.scrollTop = adminScrollStashRef.current;
  }, [adminModalOpen, supportModalId, editId, finishId]);

  if (!me.data?.isAdmin) {
    return (
      <div className="relative flex min-h-[var(--app-h,100dvh)] flex-1 flex-col p-6">
        <BrandBackdrop />
        <p className="relative z-[1] text-[--text-muted]">Недостаточно прав</p>
      </div>
    );
  }

  if (me.data?.isAdmin && !authed) {
    return (
      <div className="relative flex min-h-[var(--app-h,100dvh)] flex-1 flex-col items-center justify-center gap-4 p-6">
        <BrandBackdrop />
        <p className="relative z-[1] text-center text-sm text-[--text-muted]">Нет сессии. Вернитесь на главную и откройте приложение заново.</p>
      </div>
    );
  }

  const finishMatchRow = matches.data?.find((m) => m.id === finishId);
  const st = adminStats.data;

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <BrandBackdrop />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 flex items-center justify-between border-b border-[--panel-border] bg-black/50 px-4 pb-4 pt-10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/50 bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256">
              <path
                fill="currentColor"
                d="M208,192H48a8,8,0,0,1-6.88-12C47.71,168.6,56,139.81,56,104a72,72,0,0,1,144,0c0,35.82,8.3,64.6,14.9,76A8,8,0,0,1,208,192Zm-143.43-16H191.43C185.34,165.74,176,138.83,176,104a48,48,0,0,0-96,0C80,138.83,70.66,165.74,64.57,176ZM128,224a32.05,32.05,0,0,1-32-32h64A32.05,32.05,0,0,1,128,224Zm96-120a8,8,0,0,1-8-8a88.1,88.1,0,0,0-88-88,8,8,0,0,1,0-16A104.11,104.11,0,0,1,232,96A8,8,0,0,1,224,104Z"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="head-text text-xl tracking-wider text-white">Админ панель</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Полный доступ</span>
          </div>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[--text-muted] hover:text-white"
          aria-label="Закрыть"
          onClick={() => navigate("/profile")}
        >
          ×
        </button>
      </header>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          ref={adminMainRef}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-36 pt-6 [-webkit-overflow-scrolling:touch]"
        >
          <div className="flex flex-col gap-8">
        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="head-text text-base">Статистика</h2>
          </div>
          {adminStats.isError ? (
            <p className="px-1 text-xs text-red-400">Не удалось загрузить сводку</p>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <div className="admin-card relative flex flex-col items-center justify-center gap-1.5 overflow-hidden p-3 text-center">
              <span className="text-[9px] font-medium uppercase tracking-wider text-[--text-muted]">Пользователей</span>
              <span className="font-head text-lg tracking-wide text-white">
                {adminStats.isLoading ? "…" : (st?.usersCount ?? "—")}
              </span>
            </div>
            <div className="admin-card relative flex flex-col items-center justify-center gap-1.5 overflow-hidden p-3 text-center">
              <span className="text-[9px] font-medium uppercase tracking-wider text-[--text-muted]">Заказов всего</span>
              <span className="font-head text-lg tracking-wide text-white">
                {adminStats.isLoading ? "…" : (st?.ordersTotal ?? "—")}
              </span>
            </div>
            <div className="admin-card relative flex flex-col items-center justify-center gap-1.5 overflow-hidden p-3 text-center">
              <span className="text-[9px] font-medium uppercase tracking-wider text-[--text-muted]">Гемы на балансах</span>
              <span className="flex items-center gap-1 font-head text-lg tracking-wide text-[--accent]">
                {adminStats.isLoading ? (
                  "…"
                ) : st != null ? (
                  <>
                    {formatGems(st.gemsBalanceSum)}
                    <GemIcon size={14} />
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
          {st ? (
            <div className="admin-card mt-2 flex flex-col gap-3 p-3 text-[10px] leading-relaxed text-[--text-muted]">
              <div>
                <span className="mb-1 block font-bold uppercase tracking-wider text-white/90">Заказы по статусам</span>
                <span>
                  Новых: <span className="text-blue-400">{st.ordersByStatus.new}</span>
                  {" · "}
                  В доставке: <span className="text-[--accent]">{st.ordersByStatus.contact_sent}</span>
                  {" · "}
                  Доставлено: <span className="text-green-400">{st.ordersByStatus.completed}</span>
                  {" · "}
                  Отмена: <span className="text-red-400/90">{st.ordersByStatus.cancelled}</span>
                </span>
              </div>
              <div className="h-px bg-[--panel-border]" />
              <div>
                <span className="mb-1 block font-bold uppercase tracking-wider text-white/90">Матчи (не удалены у пользователей)</span>
                <span>
                  Запланировано: <span className="text-white">{st.matchesByStatus.scheduled}</span>
                  {" · "}
                  Live: <span className="text-amber-400">{st.matchesByStatus.live}</span>
                  {" · "}
                  Завершено: <span className="text-green-400/90">{st.matchesByStatus.finished}</span>
                  {" · "}
                  Отменено: <span className="text-red-400/80">{st.matchesByStatus.cancelled}</span>
                </span>
                <span className="mt-1 block text-[9px] text-[--text-muted]">
                  Удалено у пользователей (soft):{" "}
                  <span className="font-semibold text-white/80">{st.matchesDeletedFromUsers}</span>
                </span>
              </div>
              <div className="h-px bg-[--panel-border]" />
              <div>
                <span className="mb-1 block font-bold uppercase tracking-wider text-white/90">Поддержка</span>
                <span>
                  Открыто: <span className="text-amber-400">{st.ticketsByStatus.open}</span>
                  {" · "}
                  С ответом: <span className="text-green-400/90">{st.ticketsByStatus.answered}</span>
                  {" · "}
                  Закрыто: <span className="text-[--text-muted]">{st.ticketsByStatus.closed}</span>
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="head-text text-base text-green-400">Магазин</h2>
          </div>
          <form
            className="admin-card relative mb-4 flex flex-col gap-3 overflow-hidden p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!shopTitle.trim() || shopPrice < 1 || shopStock < 0) return;
              createShop.mutate();
            }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
              Новый лот
            </span>
            <input
              className="input-glass-admin"
              placeholder="Название"
              value={shopTitle}
              onChange={(e) => setShopTitle(e.target.value)}
              maxLength={200}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="pl-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                  Игра
                </label>
                <div className="select-wrapper">
                  <select
                    className="input-glass-admin font-head uppercase tracking-wide"
                    value={shopGame}
                    onChange={(e) => setShopGame(e.target.value as "CS2" | "DOTA2")}
                  >
                    <option value="CS2">CS2</option>
                    <option value="DOTA2">Dota 2</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="pl-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                  Редкость
                </label>
                <div className="select-wrapper">
                  <select
                    className="input-glass-admin text-[11px] font-semibold uppercase tracking-wide"
                    value={shopRarity}
                    onChange={(e) => setShopRarity(e.target.value as ShopItemRarity)}
                  >
                    {SHOP_RARITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <input
              className="input-glass-admin text-[11px]"
              placeholder="URL картинки (https://…)"
              value={shopImageUrl}
              onChange={(e) => setShopImageUrl(e.target.value)}
              inputMode="url"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="pl-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                  Цена, гемы
                </label>
                <input
                  type="number"
                  className="input-glass-admin"
                  min={1}
                  value={shopPrice}
                  onChange={(e) => setShopPrice(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="pl-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                  Остаток
                </label>
                <input
                  type="number"
                  className="input-glass-admin"
                  min={0}
                  value={shopStock}
                  onChange={(e) => setShopStock(Number(e.target.value))}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-action flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-green-500/90 p-3 text-[13px] font-bold text-black"
              disabled={createShop.isPending || !shopTitle.trim()}
            >
              {createShop.isPending ? "Создание…" : "Добавить лот"}
            </button>
            {createShop.isError ? (
              <p className="text-xs text-red-400">{(createShop.error as Error).message}</p>
            ) : null}
          </form>
          <div className="flex flex-col gap-2">
            <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
              Лоты в каталоге
            </span>
            {shopItems.isLoading ? (
              <p className="text-sm text-[--text-muted]">Загрузка…</p>
            ) : (shopItems.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-[--text-muted]">Пока нет</p>
            ) : (
              (() => {
                const shopAll = shopItems.data ?? [];
                const shopShown =
                  expandAdminShop || shopAll.length <= PREVIEW_ADMIN_LIST
                    ? shopAll
                    : shopAll.slice(0, PREVIEW_ADMIN_LIST);
                return (
                  <>
                    {shopShown.map((i) => (
                <div key={i.id} className="admin-card relative flex flex-col gap-2 p-3 pr-10">
                  {!i.isActive ? (
                    <button
                      type="button"
                      className="absolute right-2 top-2 z-[1] flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-lg leading-none text-[--text-muted] transition-colors hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-400"
                      title="Удалить лот из базы"
                      disabled={deleteShopItem.isPending}
                      aria-label="Удалить лот"
                      onClick={() => {
                        void telegramConfirm(
                          `Удалить скрытый лот «${i.title}»? Если есть заказы — удаление будет отклонено.`
                        ).then((ok) => {
                          if (ok) deleteShopItem.mutate(i.id);
                        });
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                  <div className="flex gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-[--panel-border] bg-black/50">
                      {i.imageUrl ? (
                        <img src={i.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="font-head text-[10px] text-[--text-muted]">нет</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-head text-[14px] text-white">{i.title}</div>
                      <div className="mt-1 text-[10px] text-[--text-muted]">
                        {i.game} · {SHOP_RARITY_OPTIONS.find((r) => r.value === i.rarity)?.label ?? i.rarity}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="flex items-center gap-1 text-[--accent]">
                          <span className="font-bold">{formatGems(i.priceGems)}</span>
                          <GemIcon size={10} />
                        </span>
                        <span className="text-[--text-muted]">остаток {i.stock}</span>
                        <span className={i.isActive ? "text-green-400" : "text-red-400"}>
                          {i.isActive ? "в продаже" : "скрыт"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-white/10 bg-white/5 py-1.5 text-[11px] font-bold text-[--text-muted]"
                    disabled={patchShopItem.isPending}
                    onClick={() => patchShopItem.mutate({ id: i.id, body: { isActive: !i.isActive } })}
                  >
                    {i.isActive ? "Скрыть из магазина" : "Вернуть в магазин"}
                  </button>
                </div>
                    ))}
                    {shopAll.length > PREVIEW_ADMIN_LIST ? (
                      <ShowMoreRow
                        expanded={expandAdminShop}
                        onToggle={() => setExpandAdminShop((v) => !v)}
                        totalHidden={
                          expandAdminShop ? 0 : shopAll.length - PREVIEW_ADMIN_LIST
                        }
                      />
                    ) : null}
                  </>
                );
              })()
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="head-text text-base text-[--accent]">Создание матча</h2>
          </div>
          <form
            className="admin-card relative flex flex-col gap-4 overflow-hidden p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (teamA.trim() && teamB.trim() && startsAt) createM.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="pl-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                  Игра
                </label>
                <div className="select-wrapper">
                  <select
                    className="input-glass-admin font-head uppercase tracking-wide"
                    value={game}
                    onChange={(e) => setGame(e.target.value as "CS2" | "DOTA2")}
                  >
                    <option value="CS2">CS2</option>
                    <option value="DOTA2">Dota 2</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="pl-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                  Награда
                </label>
                <input
                  type="number"
                  className="input-glass-admin"
                  value={rewardGems}
                  onChange={(e) => setRewardGems(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="pl-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                Дата и время начала
              </label>
              <input
                type="datetime-local"
                className="input-glass-admin"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <span className="text-[9px] text-[--text-muted]">
                Приём прогнозов: за 5 минут до старта; если это уже в прошлом — до +2 мин от сейчас (чтобы матч
                попал в ленту на главной).
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="pl-1 text-center text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                  Команда 1
                </label>
                <input
                  className="input-glass-admin text-center font-head text-base tracking-wider"
                  placeholder="Название"
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                />
                <input
                  className="input-glass-admin text-[11px]"
                  placeholder="URL логотипа (https://…)"
                  value={teamALogoUrl}
                  onChange={(e) => setTeamALogoUrl(e.target.value)}
                  inputMode="url"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="pl-1 text-center text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                  Команда 2
                </label>
                <input
                  className="input-glass-admin text-center font-head text-base tracking-wider"
                  placeholder="Название"
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                />
                <input
                  className="input-glass-admin text-[11px]"
                  placeholder="URL логотипа (https://…)"
                  value={teamBLogoUrl}
                  onChange={(e) => setTeamBLogoUrl(e.target.value)}
                  inputMode="url"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="pl-1 text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                Ссылка на стрим (необязательно)
              </label>
              <input
                className="input-glass-admin text-[11px]"
                placeholder="https://twitch.tv/… или YouTube"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                inputMode="url"
              />
            </div>
            <button
              type="submit"
              className="btn-action mt-2 flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-[--accent] p-3.5 text-[14px] font-bold text-black shadow-[0_0_15px_rgba(233,141,43,0.3)]"
              disabled={createM.isPending}
            >
              Создать матч
            </button>
            {createM.isError ? <p className="text-xs text-red-400">{(createM.error as Error).message}</p> : null}
          </form>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="head-text text-base">Активные заказы</h2>
          </div>
          <div className="flex flex-col gap-3">
            {(() => {
              const orderAll = orders.data ?? [];
              const orderShown =
                expandAdminOrders || orderAll.length <= PREVIEW_ADMIN_LIST
                  ? orderAll
                  : orderAll.slice(0, PREVIEW_ADMIN_LIST);
              return (
                <>
                  {orderShown.map((o) => (
              <div key={o.id} className="admin-card flex flex-col gap-3 p-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-head text-[14px] text-white">{o.item.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-sm border border-white/5 bg-black/50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[--text-muted]">
                        {o.item.game}
                      </span>
                      <span className="text-[11px] text-[--text-muted]">
                        @{o.user.username ?? o.user.telegramId}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded border border-[--accent]/20 bg-black/40 px-2 py-1 text-[--accent]">
                    <span className="text-[12px] font-bold">{formatGems(o.priceGems)}</span>
                    <GemIcon size={12} />
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-[--panel-border] pt-2">
                  <div className="select-wrapper flex-1">
                    <select
                      className={`input-glass-admin !py-2 !text-[11px] font-bold uppercase tracking-wider ${orderSelectClass(o.status)}`}
                      value={o.status}
                      onChange={(e) =>
                        patchOrder.mutate({ id: o.id, status: e.target.value as AdminOrderStatus })
                      }
                    >
                      {ORDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    title="Скопировать Trade URL"
                    className="flex h-9 w-10 shrink-0 items-center justify-center rounded-[--radius-sm] border border-white/10 bg-white/5 text-white"
                    onClick={() => {
                      const u = o.user.steamTradeUrl ?? "";
                      if (u) void navigator.clipboard.writeText(u);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256">
                      <path
                        fill="currentColor"
                        d="M136,104a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v80a8,8,0,0,0,8,8h80a8,8,0,0,0,8-8Zm-16,72H56V112h64Zm96-72a8,8,0,0,0-8-8H160a8,8,0,0,0-8,8v80a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8Zm-16,72H168V112h32ZM104,72H56a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Zm104,0H160a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
                  ))}
                  {orderAll.length > PREVIEW_ADMIN_LIST ? (
                    <ShowMoreRow
                      expanded={expandAdminOrders}
                      onToggle={() => setExpandAdminOrders((v) => !v)}
                      totalHidden={
                        expandAdminOrders ? 0 : orderAll.length - PREVIEW_ADMIN_LIST
                      }
                    />
                  ) : null}
                </>
              );
            })()}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="head-text text-base text-blue-400">Поддержка</h2>
          </div>
          <div className="flex flex-col gap-2">
            {supportTickets.isLoading ? (
              <p className="text-sm text-[--text-muted]">Загрузка…</p>
            ) : supportTickets.isError ? (
              <div className="rounded border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
                <p>Не удалось загрузить обращения: {(supportTickets.error as Error).message}</p>
                <button
                  type="button"
                  className="btn-action mt-2 text-xs font-bold text-[--accent]"
                  onClick={() => void supportTickets.refetch()}
                >
                  Повторить
                </button>
              </div>
            ) : (supportTickets.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-[--text-muted]">Обращений пока нет</p>
            ) : (
              (() => {
                const supAll = supportTickets.data ?? [];
                const supShown =
                  expandAdminSupport || supAll.length <= PREVIEW_ADMIN_LIST
                    ? supAll
                    : supAll.slice(0, PREVIEW_ADMIN_LIST);
                return (
                  <>
                    {supShown.map((t) => {
                      const st =
                        t.status === "open"
                          ? "Ожидает"
                          : t.status === "answered"
                            ? "Отвечено"
                            : "Закрыто";
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className="admin-card flex w-full flex-col gap-2 overflow-hidden p-3 text-left"
                          onClick={() => {
                            stashAdminMainScroll();
                            setSupportModalId(t.id);
                            setSupportReply(t.adminReply ?? "");
                            setSupportStatus(t.status);
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-[--text-muted]">
                              @{t.user.username ?? t.user.telegramId}{" "}
                              <span className="text-white/80">
                                {t.user.firstName ? ` · ${t.user.firstName}` : ""}
                              </span>
                            </span>
                            <span className="rounded border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-300">
                              {st}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-[12px] text-[#ccc]">{t.message}</p>
                          <span className="text-[10px] text-[--text-muted]">
                            {new Date(t.createdAt).toLocaleString("ru-RU")}
                          </span>
                        </button>
                      );
                    })}
                    {supAll.length > PREVIEW_ADMIN_LIST ? (
                      <ShowMoreRow
                        expanded={expandAdminSupport}
                        onToggle={() => setExpandAdminSupport((v) => !v)}
                        totalHidden={
                          expandAdminSupport ? 0 : supAll.length - PREVIEW_ADMIN_LIST
                        }
                      />
                    ) : null}
                  </>
                );
              })()
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="head-text text-base">Управление матчами</h2>
          </div>
          {(() => {
            const list = matches.data ?? [];
            const notDeleted = list.filter((m) => !m.deletedAt);
            const deletedList = list.filter((m) => m.deletedAt);
            const activeList = notDeleted.filter((m) => m.status === "scheduled" || m.status === "live");
            const archiveList = notDeleted.filter((m) => m.status === "finished" || m.status === "cancelled");
            const activeShown =
              expandAdminMatchActive || activeList.length <= PREVIEW_ADMIN_LIST
                ? activeList
                : activeList.slice(0, PREVIEW_ADMIN_LIST);
            const archiveShown =
              expandAdminMatchArchive || archiveList.length <= PREVIEW_ADMIN_LIST
                ? archiveList
                : archiveList.slice(0, PREVIEW_ADMIN_LIST);
            const deletedShown =
              expandAdminMatchDeleted || deletedList.length <= PREVIEW_ADMIN_LIST
                ? deletedList
                : deletedList.slice(0, PREVIEW_ADMIN_LIST);
            const renderCard = (m: (typeof list)[number]) => {
              const removed = Boolean(m.deletedAt);
              const active = m.status !== "finished" && m.status !== "cancelled";
              const canEdit = !removed && m.status !== "finished";
              const canFinish = !removed && active;
              const canCancel = !removed && active;
              const canDelete = !removed;
              const inFeed =
                !removed &&
                active &&
                new Date(m.predictionEndsAt).getTime() > Date.now();
              const gLabel = m.game === "DOTA2" ? "DOTA 2" : "CS2";
              const gCls =
                m.game === "DOTA2"
                  ? "font-bold text-[#FF4500] bg-[#FF4500]/10"
                  : "font-bold text-[--accent] bg-[--accent]/10";
              return (
                <div
                  key={m.id}
                  className={`admin-card overflow-hidden ${!active || removed ? "opacity-80" : ""}`}
                >
                  <div className="flex items-center justify-between border-b border-[--panel-border] bg-black/40 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${gCls}`}>
                        {gLabel}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[--text-muted]">Матч</span>
                      {removed ? (
                        <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[--text-muted]">
                          Удалён
                        </span>
                      ) : inFeed ? (
                        <span className="rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-400">
                          В ленте
                        </span>
                      ) : active ? (
                        <span className="rounded border border-yellow-500/25 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-500/90">
                          Не в ленте
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
                      {m.status}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="mb-2 flex justify-between gap-2">
                      <span className="font-head text-[15px] tracking-wide text-white">
                        {m.teamA} <span className="mx-1 text-[12px] text-[--text-muted]">VS</span> {m.teamB}
                      </span>
                      <span className="shrink-0 text-[11px] text-[--text-muted]">{formatMatchWhen(m.startsAt)}</span>
                    </div>
                    <p className="mb-3 text-[9px] text-[--text-muted]">
                      Прогнозы до: {new Date(m.predictionEndsAt).toLocaleString()}
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 rounded border border-[--accent]/30 bg-[--accent]/10 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[--accent]"
                          onClick={() => navigate(`/match-room/${m.id}`)}
                          disabled={removed}
                        >
                          Комната
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit || saveEditMatch.isPending}
                          className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white disabled:opacity-40"
                          onClick={() => {
                            stashAdminMainScroll();
                            setEditId(m.id);
                          }}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          disabled={!canFinish || finishMatch.isPending}
                          className="min-w-0 flex-1 rounded border border-blue-500/20 bg-blue-500/10 py-1.5 text-[11px] font-medium uppercase tracking-wider text-blue-400 disabled:opacity-40"
                          onClick={() => {
                            stashAdminMainScroll();
                            setFinishId(m.id);
                          }}
                        >
                          Завершить
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!canCancel || cancelMatch.isPending}
                          className="min-w-0 flex-1 rounded border border-orange-500/25 bg-orange-500/10 py-1.5 text-[11px] font-medium uppercase tracking-wider text-orange-300 disabled:opacity-40"
                          onClick={() => {
                            void telegramConfirm("Отменить матч (статус «отменён»)?").then((ok) => {
                              if (ok) cancelMatch.mutate(m.id);
                            });
                          }}
                        >
                          Отменить
                        </button>
                        <button
                          type="button"
                          disabled={!canDelete || deleteMatch.isPending}
                          className="flex min-w-[44px] items-center justify-center rounded border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-red-500 disabled:opacity-40"
                          title="Удалить у пользователей"
                          onClick={() => {
                            void telegramConfirm(
                              "Удалить матч для пользователей? Он пропадёт из ленты, архива и профиля. Действие необратимо."
                            ).then((ok) => {
                              if (ok) deleteMatch.mutate(m.id);
                            });
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            };
            return (
              <div className="flex flex-col gap-3">
                <h3 className="px-1 text-[11px] font-bold uppercase tracking-widest text-[--accent]">
                  Активные ({activeList.length})
                </h3>
                {activeList.length === 0 ? (
                  <p className="px-1 text-xs text-[--text-muted]">Нет матчей со статусом scheduled / live</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {activeShown.map(renderCard)}
                    {activeList.length > PREVIEW_ADMIN_LIST ? (
                      <ShowMoreRow
                        expanded={expandAdminMatchActive}
                        onToggle={() => setExpandAdminMatchActive((v) => !v)}
                        totalHidden={
                          expandAdminMatchActive ? 0 : activeList.length - PREVIEW_ADMIN_LIST
                        }
                      />
                    ) : null}
                  </div>
                )}
                <h3 className="mt-4 px-1 text-[11px] font-bold uppercase tracking-widest text-[--text-muted]">
                  Архив ({archiveList.length})
                </h3>
                {archiveList.length === 0 ? (
                  <p className="px-1 text-xs text-[--text-muted]">Завершённых и отменённых пока нет</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {archiveShown.map(renderCard)}
                    {archiveList.length > PREVIEW_ADMIN_LIST ? (
                      <ShowMoreRow
                        expanded={expandAdminMatchArchive}
                        onToggle={() => setExpandAdminMatchArchive((v) => !v)}
                        totalHidden={
                          expandAdminMatchArchive ? 0 : archiveList.length - PREVIEW_ADMIN_LIST
                        }
                      />
                    ) : null}
                  </div>
                )}
                <h3 className="mt-4 px-1 text-[11px] font-bold uppercase tracking-widest text-[--text-muted]">
                  Удалённые у пользователей ({deletedList.length})
                </h3>
                {deletedList.length === 0 ? (
                  <p className="px-1 text-xs text-[--text-muted]">Нет</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {deletedShown.map(renderCard)}
                    {deletedList.length > PREVIEW_ADMIN_LIST ? (
                      <ShowMoreRow
                        expanded={expandAdminMatchDeleted}
                        onToggle={() => setExpandAdminMatchDeleted((v) => !v)}
                        totalHidden={
                          expandAdminMatchDeleted ? 0 : deletedList.length - PREVIEW_ADMIN_LIST
                        }
                      />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })()}
        </section>
          </div>
        </div>
      </main>
      </div>

      {editId ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[--panel-border] bg-[#111] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-head text-lg text-white">Редактировать матч</h3>
              <button
                type="button"
                className="text-xl text-[--text-muted] hover:text-white"
                onClick={() => setEditId(null)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[--text-muted]">Игра</label>
                  <select
                    className="input-glass-admin font-head text-sm uppercase"
                    value={editGame}
                    onChange={(e) => setEditGame(e.target.value as "CS2" | "DOTA2")}
                  >
                    <option value="CS2">CS2</option>
                    <option value="DOTA2">Dota 2</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[--text-muted]">Награда</label>
                  <input
                    type="number"
                    className="input-glass-admin"
                    min={0}
                    value={editRewardGems}
                    onChange={(e) => setEditRewardGems(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[--text-muted]">Команда 1</label>
                  <input
                    className="input-glass-admin"
                    value={editTeamA}
                    onChange={(e) => setEditTeamA(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[--text-muted]">Команда 2</label>
                  <input
                    className="input-glass-admin"
                    value={editTeamB}
                    onChange={(e) => setEditTeamB(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[--text-muted]">Лого 1 (URL)</label>
                  <input
                    className="input-glass-admin text-[11px]"
                    value={editTeamALogoUrl}
                    onChange={(e) => setEditTeamALogoUrl(e.target.value)}
                    inputMode="url"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[--text-muted]">Лого 2 (URL)</label>
                  <input
                    className="input-glass-admin text-[11px]"
                    value={editTeamBLogoUrl}
                    onChange={(e) => setEditTeamBLogoUrl(e.target.value)}
                    inputMode="url"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-[--text-muted]">Стрим (URL)</label>
                <input
                  className="input-glass-admin text-[11px]"
                  placeholder="https://… (пусто — убрать кнопку в комнате)"
                  value={editStreamUrl}
                  onChange={(e) => setEditStreamUrl(e.target.value)}
                  inputMode="url"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-[--text-muted]">Старт матча</label>
                <input
                  type="datetime-local"
                  className="input-glass-admin"
                  value={editStartsAt}
                  onChange={(e) => setEditStartsAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-[--text-muted]">Конец приёма прогнозов</label>
                <input
                  type="datetime-local"
                  className="input-glass-admin"
                  value={editPredEndsAt}
                  onChange={(e) => setEditPredEndsAt(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[--text-muted]">Исход 1 (подпись)</label>
                  <input
                    className="input-glass-admin"
                    value={editOptLabel0}
                    onChange={(e) => setEditOptLabel0(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[--text-muted]">Исход 2 (подпись)</label>
                  <input
                    className="input-glass-admin"
                    value={editOptLabel1}
                    onChange={(e) => setEditOptLabel1(e.target.value)}
                  />
                </div>
              </div>
              {saveEditMatch.isError ? (
                <p className="text-xs text-red-400">{(saveEditMatch.error as Error).message}</p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="flex-1 rounded border border-white/10 bg-white/5 py-2.5 text-sm text-[--text-muted]"
                  onClick={() => setEditId(null)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="flex-1 rounded bg-[--accent] py-2.5 text-sm font-bold text-black disabled:opacity-40"
                  disabled={saveEditMatch.isPending}
                  onClick={() => saveEditMatch.mutate()}
                >
                  {saveEditMatch.isPending ? "…" : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {supportModalId ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          {(() => {
            const t = supportTickets.data?.find((x) => x.id === supportModalId);
            if (!t) {
              return (
                <div className="w-full max-w-lg rounded-lg border border-[--panel-border] bg-[#111] p-6 shadow-2xl">
                  <p className="text-sm text-[--text-muted]">
                    {supportTickets.isLoading || supportTickets.isFetching
                      ? "Загрузка обращения…"
                      : "Обращение не найдено. Закройте окно и откройте список снова."}
                  </p>
                  <button
                    type="button"
                    className="btn-action mt-4 w-full rounded bg-[--accent] py-2 text-sm font-bold text-black"
                    onClick={() => setSupportModalId(null)}
                  >
                    Закрыть
                  </button>
                </div>
              );
            }
            return (
              <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[--panel-border] bg-[#111] p-4 shadow-2xl">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase text-[--text-muted]">Пользователь</p>
                    <p className="font-head text-sm text-white">
                      @{t.user.username ?? "—"} · TG {t.user.telegramId}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xl text-[--text-muted] hover:text-white"
                    onClick={() => setSupportModalId(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="mb-4 rounded border border-[--panel-border] bg-black/40 p-3">
                  <p className="text-[10px] uppercase text-[--text-muted]">Сообщение</p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] text-[#ddd]">{t.message}</p>
                </div>
                <label className="text-[10px] uppercase text-[--accent]">Ответ</label>
                <textarea
                  value={supportReply}
                  onChange={(e) => setSupportReply(e.target.value)}
                  rows={5}
                  className="input-glass-admin mt-1 w-full resize-none rounded p-2 text-sm"
                  placeholder="Текст ответа…"
                  maxLength={8000}
                />
                <div className="mt-3 flex flex-col gap-2">
                  <span className="text-[10px] uppercase text-[--text-muted]">Статус</span>
                  <select
                    className="input-glass-admin font-head text-sm"
                    value={supportStatus}
                    onChange={(e) => setSupportStatus(e.target.value as SupportTicketStatus)}
                  >
                    <option value="open">Открыто (ожидает ответа)</option>
                    <option value="answered">Отвечено</option>
                    <option value="closed">Закрыто (архив)</option>
                  </select>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded border border-white/10 bg-white/5 py-2 text-sm text-[--text-muted]"
                    onClick={() => setSupportModalId(null)}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded bg-[--accent] py-2 text-sm font-bold text-black disabled:opacity-40"
                    disabled={patchSupport.isPending}
                    onClick={() => {
                      const body: { adminReply?: string; status?: SupportTicketStatus } = {};
                      const replyTrim = supportReply.trim();
                      if (replyTrim.length > 0) body.adminReply = replyTrim;
                      if (supportStatus !== t.status) body.status = supportStatus;
                      if (replyTrim.length === 0 && supportStatus === t.status) {
                        return;
                      }
                      patchSupport.mutate({ id: t.id, ...body });
                    }}
                  >
                    {patchSupport.isPending ? "…" : "Сохранить"}
                  </button>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-[--text-muted]">
                  Ответ с текстом ставит статус «Отвечено» (если не выбран другой). Если пользователь
                  допишет в том же тикете — у вас снова будет «Открыто», пока не закроете тикет в архив.
                  Статус без текста: выберите и нажмите «Сохранить».
                </p>
              </div>
            );
          })()}
        </div>
      ) : null}

      {finishId && finishMatchRow ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[--panel-border] bg-[#1a1a1a] p-4">
            <h3 className="mb-3 font-head text-white">Победитель</h3>
            <div className="flex flex-col gap-2">
              {finishMatchRow.options.slice(0, 2).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="rounded border border-[--panel-border] bg-white/5 py-2 text-sm text-white"
                  onClick={() => finishMatch.mutate({ id: finishId, winningOptionId: o.id })}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button type="button" className="mt-3 w-full text-sm text-[--text-muted]" onClick={() => setFinishId(null)}>
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed bottom-0 left-0 z-50 w-full">
        <div className="h-10 w-full bg-gradient-to-t from-[--bg-darker] to-transparent" />
        <div className="pointer-events-auto">
          <BottomNav isAdmin />
        </div>
      </div>
    </div>
  );
}
