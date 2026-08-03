const API = import.meta.env.VITE_API_URL ?? "";

export function getAdminToken() {
  return localStorage.getItem("cg_admin_token");
}

export function setAdminToken(t: string) {
  localStorage.setItem("cg_admin_token", t);
}

export function clearAdminToken() {
  localStorage.removeItem("cg_admin_token");
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (
    opts.body != null &&
    typeof opts.body === "string" &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  const t = getAdminToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  return req<{ accessToken: string }>("/api/v1/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getOrders() {
  return req<
    {
      id: string;
      status: string;
      priceGems: number;
      createdAt: string;
      item: { id: string; title: string; game: string };
      user: {
        id: string;
        telegramId: string;
        username: string | null;
        steamTradeUrl: string | null;
      };
    }[]
  >("/api/v1/admin/orders");
}

export async function patchOrder(id: string, status: string) {
  return req(`/api/v1/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export type AdminMatchRow = {
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
  options: { id: string; label: string; sort: number }[];
};

export async function getMatches() {
  return req<AdminMatchRow[]>("/api/v1/admin/matches");
}

export async function createMatch(body: {
  game: "CS2" | "DOTA2";
  teamA: string;
  teamB: string;
  teamALogoUrl?: string;
  teamBLogoUrl?: string;
  streamUrl?: string;
  startsAt: string;
  predictionEndsAt: string;
  rewardGems: number;
  options: { label: string; sort?: number }[];
}) {
  return req<{ id: string }>("/api/v1/admin/matches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchMatch(
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
  }>
) {
  return req<{ ok: boolean }>(`/api/v1/admin/matches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type ShopItemRarity =
  | "restricted"
  | "classified"
  | "covert"
  | "contraband"
  | "immortal"
  | "arcana";

export async function getShop() {
  return req<
    {
      id: string;
      game: string;
      title: string;
      rarity: ShopItemRarity;
      imageUrl: string | null;
      priceGems: number;
      stock: number;
      isActive: boolean;
    }[]
  >("/api/v1/admin/shop/items");
}

export async function createShopItem(payload: {
  game: "CS2" | "DOTA2";
  title: string;
  rarity?: ShopItemRarity;
  imageUrl?: string | null;
  priceGems: number;
  stock: number;
}) {
  return req<{ id: string }>("/api/v1/admin/shop/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchShopItem(
  id: string,
  body: Partial<{
    title: string;
    rarity: ShopItemRarity;
    imageUrl: string | null;
    priceGems: number;
    stock: number;
    isActive: boolean;
  }>
) {
  return req<{ ok: boolean }>(`/api/v1/admin/shop/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteShopItem(id: string) {
  return req<{ ok: boolean }>(`/api/v1/admin/shop/items/${id}`, {
    method: "DELETE",
  });
}
