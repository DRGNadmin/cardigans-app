import type { ShopItemRarity } from "./lib/shopRarity";

const API = import.meta.env.VITE_API_URL ?? "";

export function getToken(): string | null {
  return localStorage.getItem("cg_token");
}

export function setToken(t: string) {
  localStorage.setItem("cg_token", t);
}

export function clearToken() {
  localStorage.removeItem("cg_token");
}

export function getAdminToken(): string | null {
  return localStorage.getItem("cg_admin_token");
}

export function setAdminToken(t: string) {
  localStorage.setItem("cg_admin_token", t);
}

/**
 * Админские запросы из мини-приложения.
 * Раньше приоритет был у `cg_admin_token`: на ПК в браузере/Telegram Desktop он часто остаётся
 * старым/битым, перебивает живой `cg_token` → 401 на всех admin-эндпоинтах. В телефоне ключа нет — всё ок.
 * Сначала сессия Telegram, отдельный admin JWT — только если пользовательского нет (отдельная админка).
 */
function preferAdminToken(): { token: string } | Record<string, never> {
  const user = getToken();
  if (user) return { token: user };
  const a = getAdminToken();
  return a ? { token: a } : {};
}

async function request<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token: tokenOverride, ...fetchOpts } = opts;
  /** `token: null` — без заголовка; ключ отсутствует — обычный пользовательский JWT */
  const token = tokenOverride !== undefined ? tokenOverride : getToken();
  const headers: HeadersInit = {
    ...(fetchOpts.headers ?? {}),
  };
  const h = headers as Record<string, string>;
  if (
    fetchOpts.body != null &&
    typeof fetchOpts.body === "string" &&
    !h["Content-Type"] &&
    !h["content-type"]
  ) {
    h["Content-Type"] = "application/json";
  }
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, { ...fetchOpts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function authTelegram(initData: string) {
  return request<{ accessToken: string }>("/api/v1/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData }),
    token: null,
  });
}

export async function getMe() {
  return request<{
    id: string;
    telegramId: string;
    gemsBalance: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    steamTradeUrl: string | null;
    isAdmin: boolean;
    xpTotal: number;
    level: number;
    xpInLevel: number;
    xpToNextLevel: number;
    levelProgressPct: number;
  }>("/api/v1/me");
}

export async function getMatches(game?: "CS2" | "DOTA2") {
  const qs = game ? `?game=${encodeURIComponent(game)}` : "";
  return request<
    {
      id: string;
      game: string;
      teamA: string;
      teamB: string;
      teamALogoUrl: string | null;
      teamBLogoUrl: string | null;
      streamUrl: string | null;
      startsAt: string;
      predictionEndsAt: string;
      status: string;
      rewardGems: number;
      winningOptionId: string | null;
      options: { id: string; label: string; sort: number }[];
    }[]
  >(`/api/v1/matches${qs}`);
}

/** Завершённые матчи (архив). */
export async function getMatchesArchive(game?: "CS2" | "DOTA2") {
  const qs = game ? `?game=${encodeURIComponent(game)}` : "";
  return request<
    {
      id: string;
      game: string;
      teamA: string;
      teamB: string;
      teamALogoUrl: string | null;
      teamBLogoUrl: string | null;
      streamUrl: string | null;
      startsAt: string;
      predictionEndsAt: string;
      status: string;
      rewardGems: number;
      winningOptionId: string | null;
      options: { id: string; label: string; sort: number }[];
    }[]
  >(`/api/v1/matches/archive${qs}`);
}

export async function getMatch(id: string) {
  return request<{
    id: string;
    game: string;
    teamA: string;
    teamB: string;
    teamALogoUrl: string | null;
    teamBLogoUrl: string | null;
    streamUrl: string | null;
    startsAt: string;
    predictionEndsAt: string;
    status: string;
    rewardGems: number;
    winningOptionId: string | null;
    options: { id: string; label: string; sort: number }[];
  }>(`/api/v1/matches/${id}`);
}

export async function postPrediction(matchId: string, optionId: string) {
  return request("/api/v1/predictions", {
    method: "POST",
    body: JSON.stringify({ matchId, optionId }),
  });
}

export async function getTasks() {
  return request<
    {
      id: string;
      key: string | null;
      title: string;
      description: string | null;
      rewardGems: number;
      progress: number;
      completed: boolean;
      claimed: boolean;
      type: string;
      game: string | null;
      targetCount: number | null;
      cooldownUntil?: string | null;
    }[]
  >("/api/v1/tasks");
}

export async function claimTask(id: string) {
  return request<{ ok: boolean; gems: number }>(`/api/v1/tasks/${id}/claim`, {
    method: "POST",
    body: "{}",
  });
}

export type { ShopItemRarity };

export type ShopListItem = {
  id: string;
  game: string;
  title: string;
  rarity: ShopItemRarity;
  priceGems: number;
  stock: number;
  imageUrl: string | null;
};

export async function getShop() {
  return request<ShopListItem[]>("/api/v1/shop/items");
}

export async function purchase(itemId: string) {
  return request<{ orderId: string }>("/api/v1/shop/purchase", {
    method: "POST",
    body: JSON.stringify({ shopItemId: itemId }),
  });
}

export async function patchMe(steamTradeUrl: string | null) {
  return request("/api/v1/me", {
    method: "PATCH",
    body: JSON.stringify({ steamTradeUrl }),
  });
}

export async function getOrders() {
  return request<
    {
      id: string;
      status: string;
      priceGems: number;
      createdAt: string;
      item: { id: string; title: string; game: string; imageUrl: string | null };
    }[]
  >("/api/v1/orders");
}

export async function authTelegramAdmin(initData: string) {
  return request<{ accessToken: string }>("/api/v1/admin/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData }),
    token: null,
  });
}

export async function getAdminShopItems() {
  return request<
    {
      id: string;
      game: string;
      title: string;
      rarity: ShopItemRarity;
      imageUrl: string | null;
      priceGems: number;
      stock: number;
      isActive: boolean;
      createdAt: string;
    }[]
  >("/api/v1/admin/shop/items", {
    ...preferAdminToken(),
  });
}

export async function createAdminShopItem(payload: {
  game: "CS2" | "DOTA2";
  title: string;
  rarity?: ShopItemRarity;
  imageUrl?: string | null;
  priceGems: number;
  stock: number;
  isActive?: boolean;
}) {
  return request<{ id: string }>("/api/v1/admin/shop/items", {
    method: "POST",
    body: JSON.stringify(payload),
    ...preferAdminToken(),
  });
}

export async function patchAdminShopItem(
  id: string,
  body: Partial<{
    game: "CS2" | "DOTA2";
    title: string;
    rarity: ShopItemRarity;
    imageUrl: string | null;
    priceGems: number;
    stock: number;
    isActive: boolean;
  }>
) {
  return request<{ ok: boolean }>(`/api/v1/admin/shop/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    ...preferAdminToken(),
  });
}

export async function deleteAdminShopItem(id: string) {
  return request<{ ok: boolean }>(`/api/v1/admin/shop/items/${id}`, {
    method: "DELETE",
    ...preferAdminToken(),
  });
}

export async function createMatch(payload: {
  game: "CS2" | "DOTA2";
  teamA: string;
  teamB: string;
  teamALogoUrl?: string;
  teamBLogoUrl?: string;
  streamUrl?: string;
  startsAt: string;
  predictionEndsAt: string;
  rewardGems: number;
  options: { label: string }[];
}) {
  return request<{ id: string }>("/api/v1/admin/matches", {
    method: "POST",
    body: JSON.stringify(payload),
    ...preferAdminToken(),
  });
}

export type AdminStats = {
  usersCount: number;
  gemsBalanceSum: number;
  ordersTotal: number;
  ordersByStatus: {
    new: number;
    contact_sent: number;
    completed: number;
    cancelled: number;
  };
  matchesByStatus: {
    scheduled: number;
    live: number;
    finished: number;
    cancelled: number;
  };
  matchesDeletedFromUsers: number;
  ticketsByStatus: {
    open: number;
    answered: number;
    closed: number;
  };
};

export async function getAdminStats() {
  return request<AdminStats>("/api/v1/admin/stats", {
    ...preferAdminToken(),
  });
}

export async function getAdminUsers() {
  return request<
    {
      id: string;
      telegramId: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      gemsBalance: number;
      steamTradeUrl: string | null;
      ordersCount: number;
    }[]
  >("/api/v1/admin/users", {
    ...preferAdminToken(),
  });
}

export async function getAdminOrders() {
  return request<
    {
      id: string;
      status: string;
      priceGems: number;
      createdAt: string;
      item: { id: string; title: string; game: string };
      user: { id: string; telegramId: string; username: string | null; steamTradeUrl: string | null };
    }[]
  >("/api/v1/admin/orders", {
    ...preferAdminToken(),
  });
}

export async function getAdminTasks() {
  return request<
    {
      id: string;
      title: string;
      rewardGems: number;
      type: string;
      targetCount: number | null;
      isActive: boolean;
    }[]
  >("/api/v1/admin/tasks", {
    ...preferAdminToken(),
  });
}

export async function createAdminTask(payload: {
  title: string;
  description?: string | null;
  rewardGems: number;
  type: "manual" | "predictions_count" | "channel_subscribe";
  targetCount?: number | null;
  channelId?: string | null;
}) {
  return request<{ id: string }>("/api/v1/admin/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
    ...preferAdminToken(),
  });
}

export async function getPredictionsMe() {
  return request<
    {
      id: string;
      match: {
        id: string;
        teamA: string;
        teamB: string;
        teamALogoUrl: string | null;
        teamBLogoUrl: string | null;
        status: string;
        startsAt: string;
        winningOptionId: string | null;
        rewardGems: number;
      };
      optionId: string;
      optionLabel: string;
      rewardPaid: boolean;
      rewardGemsPaid: number | null;
      createdAt: string;
    }[]
  >("/api/v1/predictions/me");
}

export type AdminOrderStatus = "new" | "contact_sent" | "completed" | "cancelled";

export async function getAdminMatches() {
  return request<
    {
      id: string;
      game: string;
      teamA: string;
      teamB: string;
      teamALogoUrl: string | null;
      teamBLogoUrl: string | null;
      streamUrl: string | null;
      startsAt: string;
      predictionEndsAt: string;
      status: string;
      winningOptionId: string | null;
      rewardGems: number;
      deletedAt: string | null;
      options: { id: string; label: string; sort: number }[];
    }[]
  >("/api/v1/admin/matches", {
    ...preferAdminToken(),
  });
}

export async function patchAdminMatch(
  id: string,
  body: Partial<{
    game: "CS2" | "DOTA2";
    teamA: string;
    teamB: string;
    teamALogoUrl?: string | null;
    teamBLogoUrl?: string | null;
    streamUrl?: string | null;
    startsAt: string;
    predictionEndsAt: string;
    rewardGems: number;
    status: "scheduled" | "live" | "finished" | "cancelled";
    winningOptionId: string | null;
    options: { id: string; label: string }[];
  }>
) {
  return request<{ ok: boolean }>(`/api/v1/admin/matches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    ...preferAdminToken(),
  });
}

export async function deleteAdminMatch(id: string) {
  return request<{ ok: boolean }>(`/api/v1/admin/matches/${id}`, {
    method: "DELETE",
    ...preferAdminToken(),
  });
}

export async function patchAdminOrder(id: string, status: AdminOrderStatus) {
  return request<{ ok: boolean }>(`/api/v1/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    ...preferAdminToken(),
  });
}

export type SupportTicketStatus = "open" | "answered" | "closed";

export type SupportTicket = {
  id: string;
  message: string;
  adminReply: string | null;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  repliedAt: string | null;
};

export async function getSupportTickets() {
  return request<SupportTicket[]>("/api/v1/support/tickets");
}

export async function createSupportTicket(message: string) {
  return request<SupportTicket>("/api/v1/support/tickets", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

/** Дополнение к тикету после ответа поддержки — статус снова open для админки. */
export async function appendSupportTicketFollowUp(id: string, message: string) {
  return request<SupportTicket>(`/api/v1/support/tickets/${encodeURIComponent(id)}/follow-up`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export type AdminSupportTicket = SupportTicket & {
  user: { id: string; telegramId: string; username: string | null; firstName: string | null };
};

export async function getAdminSupportTickets() {
  return request<AdminSupportTicket[]>("/api/v1/admin/support/tickets", {
    ...preferAdminToken(),
  });
}

export async function patchAdminSupportTicket(
  id: string,
  body: { adminReply?: string; status?: SupportTicketStatus }
) {
  return request<{ ok: boolean }>(`/api/v1/admin/support/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    ...preferAdminToken(),
  });
}
