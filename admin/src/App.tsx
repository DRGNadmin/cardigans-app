import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearAdminToken,
  createMatch,
  createShopItem,
  deleteShopItem as deleteShopItemApi,
  getAdminToken,
  getMatches,
  getOrders,
  getShop,
  login,
  patchOrder,
  patchShopItem,
  setAdminToken,
  type ShopItemRarity,
} from "./api";

const SHOP_RARITY_OPTIONS: { value: ShopItemRarity; label: string }[] = [
  { value: "restricted", label: "Запрещённое" },
  { value: "classified", label: "Засекреченное" },
  { value: "covert", label: "Тайное" },
  { value: "contraband", label: "Контрабанда" },
  { value: "immortal", label: "Immortal" },
  { value: "arcana", label: "Arcana" },
];

export default function App() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"orders" | "matches" | "shop">("orders");
  const [logged, setLogged] = useState(() => !!getAdminToken());
  const qc = useQueryClient();

  useEffect(() => {
    setLogged(!!getAdminToken());
  }, []);

  const auth = useMutation({
    mutationFn: () => login(user, pass),
    onSuccess: (d) => {
      setAdminToken(d.accessToken);
      setLogged(true);
      void qc.invalidateQueries();
    },
  });

  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: getOrders,
    enabled: logged,
  });

  const matches = useQuery({
    queryKey: ["admin-matches"],
    queryFn: getMatches,
    enabled: logged && tab === "matches",
  });

  const shop = useQuery({
    queryKey: ["admin-shop"],
    queryFn: getShop,
    enabled: logged && tab === "shop",
  });

  const [sTitle, setSTitle] = useState("");
  const [sGame, setSGame] = useState<"CS2" | "DOTA2">("CS2");
  const [sRarity, setSRarity] = useState<ShopItemRarity>("restricted");
  const [sImg, setSImg] = useState("");
  const [sPrice, setSPrice] = useState(100);
  const [sStock, setSStock] = useState(1);

  const createShop = useMutation({
    mutationFn: () =>
      createShopItem({
        game: sGame,
        title: sTitle.trim(),
        rarity: sRarity,
        imageUrl: sImg.trim() || null,
        priceGems: sPrice,
        stock: sStock,
      }),
    onSuccess: () => {
      setSTitle("");
      setSImg("");
      void qc.invalidateQueries({ queryKey: ["admin-shop"] });
    },
  });

  const toggleShopActive = useMutation({
    mutationFn: (p: { id: string; active: boolean }) => patchShopItem(p.id, { isActive: p.active }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-shop"] }),
  });

  const removeShopLot = useMutation({
    mutationFn: (id: string) => deleteShopItemApi(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-shop"] }),
  });

  const status = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => patchOrder(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const [mGame, setMGame] = useState<"CS2" | "DOTA2">("CS2");
  const [mTeamA, setMTeamA] = useState("");
  const [mTeamB, setMTeamB] = useState("");
  const [mStarts, setMStarts] = useState("");
  const [mPredEnd, setMPredEnd] = useState("");
  const [mReward, setMReward] = useState(50);
  const [mLogoA, setMLogoA] = useState("");
  const [mLogoB, setMLogoB] = useState("");
  const [mStreamUrl, setMStreamUrl] = useState("");
  const [mFormErr, setMFormErr] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const createM = useMutation({
    mutationFn: () => {
      const la = mLogoA.trim();
      const lb = mLogoB.trim();
      const streamTrim = mStreamUrl.trim();
      return createMatch({
        game: mGame,
        teamA: mTeamA.trim(),
        teamB: mTeamB.trim(),
        ...(la ? { teamALogoUrl: la } : {}),
        ...(lb ? { teamBLogoUrl: lb } : {}),
        ...(streamTrim ? { streamUrl: streamTrim } : {}),
        startsAt: new Date(mStarts).toISOString(),
        predictionEndsAt: new Date(mPredEnd).toISOString(),
        rewardGems: mReward,
        options: [
          { label: mTeamA.trim() || "Команда 1", sort: 0 },
          { label: mTeamB.trim() || "Команда 2", sort: 1 },
        ],
      });
    },
    onSuccess: (data) => {
      setMTeamA("");
      setMTeamB("");
      setMLogoA("");
      setMLogoB("");
      setMStreamUrl("");
      setMFormErr(null);
      setLastCreatedId(data.id);
      void qc.invalidateQueries({ queryKey: ["admin-matches"], refetchType: "all" });
    },
    onError: (e: Error) => setMFormErr(e.message),
  });

  if (!logged) {
    return (
      <div className="shell">
        <h1>Cardigans Admin</h1>
        <div className="card" style={{ maxWidth: 360 }}>
          <div className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Логин" />
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Пароль"
            />
            <button type="button" onClick={() => auth.mutate()} disabled={auth.isPending}>
              Войти
            </button>
            {auth.isError && <p className="muted">{(auth.error as Error).message}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Cardigans Admin</h1>
        <button
          type="button"
          onClick={() => {
            clearAdminToken();
            void qc.clear();
            window.location.reload();
          }}
        >
          Выйти
        </button>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => setTab("orders")}>
          Заказы
        </button>
        <button type="button" onClick={() => setTab("matches")}>
          Матчи
        </button>
        <button type="button" onClick={() => setTab("shop")}>
          Склад
        </button>
      </div>

      {tab === "orders" && (
        <div>
          {orders.isLoading && <p className="muted">Загрузка…</p>}
          {orders.data?.map((o) => (
            <div key={o.id} className="card">
              <div>
                <strong>{o.item.title}</strong> · {o.item.game} · {o.priceGems} Gems
              </div>
              <div className="muted">
                Пользователь: @{o.user.username ?? "—"} · tg id {o.user.telegramId}
              </div>
              <div className="muted">Steam: {o.user.steamTradeUrl ?? "—"}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <span>Статус: {o.status}</span>
                <select
                  value={o.status}
                  onChange={(e) => status.mutate({ id: o.id, status: e.target.value })}
                >
                  <option value="new">new</option>
                  <option value="contact_sent">contact_sent</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "matches" && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Новый матч</h2>
            <form
              className="row"
              style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}
              onSubmit={(e) => {
                e.preventDefault();
                setMFormErr(null);
                setLastCreatedId(null);
                if (!mTeamA.trim() || !mTeamB.trim() || !mStarts || !mPredEnd) {
                  setMFormErr("Заполните команды и оба времени");
                  return;
                }
                const s = new Date(mStarts).getTime();
                const p = new Date(mPredEnd).getTime();
                if (Number.isNaN(s) || Number.isNaN(p)) {
                  setMFormErr("Некорректная дата");
                  return;
                }
                if (p >= s) {
                  setMFormErr("Приём прогнозов должен закончиться раньше времени начала матча");
                  return;
                }
                if (p <= Date.now()) {
                  setMFormErr("Конец приёма прогнозов должен быть в будущем — иначе матч не появится в ленте");
                  return;
                }
                createM.mutate();
              }}
            >
              <div className="row" style={{ width: "100%" }}>
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="muted">Игра</span>
                  <select value={mGame} onChange={(e) => setMGame(e.target.value as "CS2" | "DOTA2")}>
                    <option value="CS2">CS2</option>
                    <option value="DOTA2">Dota 2</option>
                  </select>
                </label>
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="muted">Награда (гемы)</span>
                  <input
                    type="number"
                    min={0}
                    value={mReward}
                    onChange={(e) => setMReward(Number(e.target.value))}
                  />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="muted">Команда A</span>
                <input value={mTeamA} onChange={(e) => setMTeamA(e.target.value)} placeholder="Название" />
                <input
                  value={mLogoA}
                  onChange={(e) => setMLogoA(e.target.value)}
                  placeholder="URL логотипа https://…"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="muted">Команда B</span>
                <input value={mTeamB} onChange={(e) => setMTeamB(e.target.value)} placeholder="Название" />
                <input
                  value={mLogoB}
                  onChange={(e) => setMLogoB(e.target.value)}
                  placeholder="URL логотипа https://…"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="muted">Начало матча (локальное время)</span>
                <input type="datetime-local" value={mStarts} onChange={(e) => setMStarts(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="muted">Конец приёма прогнозов</span>
                <input type="datetime-local" value={mPredEnd} onChange={(e) => setMPredEnd(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="muted">Ссылка на стрим (необязательно)</span>
                <input
                  value={mStreamUrl}
                  onChange={(e) => setMStreamUrl(e.target.value)}
                  placeholder="https://twitch.tv/…"
                />
              </label>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                В ленте мини-приложения матч виден, пока статус scheduled/live, время приёма прогнозов ещё не
                прошло и совпадает игра с фильтром.
              </p>
              <button type="submit" disabled={createM.isPending}>
                {createM.isPending ? "Создание…" : "Создать матч"}
              </button>
              {mFormErr ? <p style={{ color: "#f87171", margin: 0, fontSize: 13 }}>{mFormErr}</p> : null}
              {lastCreatedId ? (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Создан матч <code>{lastCreatedId}</code>. В мини-приложении: <code>/match-room/{lastCreatedId}</code>
                </p>
              ) : null}
            </form>
          </div>

          {matches.isLoading && <p className="muted">Загрузка…</p>}
          {matches.data?.map((m) => (
            <div key={m.id} className="card">
              <div>
                {m.teamA} vs {m.teamB} · {m.game}
              </div>
              <div className="muted">
                Статус: {m.status} · награда {m.rewardGems} · победитель option: {m.winningOptionId ?? "—"}
              </div>
              <div className="muted">
                Старт: {new Date(m.startsAt).toLocaleString()} · прогнозы до:{" "}
                {new Date(m.predictionEndsAt).toLocaleString()}
              </div>
              {m.streamUrl ? (
                <div className="muted" style={{ fontSize: 12, wordBreak: "break-all" }}>
                  Стрим:{" "}
                  <a href={m.streamUrl} target="_blank" rel="noopener noreferrer">
                    {m.streamUrl}
                  </a>
                </div>
              ) : null}
              <div className="row" style={{ marginTop: 8 }}>
                <code style={{ fontSize: 11, wordBreak: "break-all" }}>{m.id}</code>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(m.id)}
                  style={{ fontSize: 12 }}
                >
                  Копировать id
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "shop" && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Новый лот</h3>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <input
                placeholder="Название"
                value={sTitle}
                onChange={(e) => setSTitle(e.target.value)}
                style={{ flex: "1 1 200px", minWidth: 160 }}
              />
              <select value={sGame} onChange={(e) => setSGame(e.target.value as "CS2" | "DOTA2")}>
                <option value="CS2">CS2</option>
                <option value="DOTA2">DOTA2</option>
              </select>
              <select value={sRarity} onChange={(e) => setSRarity(e.target.value as ShopItemRarity)}>
                {SHOP_RARITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              placeholder="URL картинки (https://…)"
              value={sImg}
              onChange={(e) => setSImg(e.target.value)}
              style={{ width: "100%", marginTop: 8 }}
            />
            <div className="row" style={{ marginTop: 8 }}>
              <label>
                Цена гемы{" "}
                <input
                  type="number"
                  min={1}
                  value={sPrice}
                  onChange={(e) => setSPrice(Number(e.target.value))}
                  style={{ width: 80 }}
                />
              </label>
              <label>
                Остаток{" "}
                <input
                  type="number"
                  min={0}
                  value={sStock}
                  onChange={(e) => setSStock(Number(e.target.value))}
                  style={{ width: 80 }}
                />
              </label>
              <button
                type="button"
                disabled={!sTitle.trim() || createShop.isPending}
                onClick={() => createShop.mutate()}
              >
                {createShop.isPending ? "…" : "Добавить"}
              </button>
            </div>
            {createShop.isError ? (
              <p style={{ color: "#f66", fontSize: 13 }}>{(createShop.error as Error).message}</p>
            ) : null}
          </div>
          {shop.isLoading && <p className="muted">Загрузка…</p>}
          {shop.data?.map((i) => (
            <div key={i.id} className="card" style={{ position: "relative", paddingRight: i.isActive ? undefined : 40 }}>
              {!i.isActive ? (
                <button
                  type="button"
                  title="Удалить лот из базы"
                  disabled={removeShopLot.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Удалить скрытый лот «${i.title}»? Если есть заказы, сервер отклонит удаление.`
                      )
                    ) {
                      removeShopLot.mutate(i.id);
                    }
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.45)",
                    color: "#888",
                    fontSize: 18,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              ) : null}
              <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    background: "#222",
                    borderRadius: 4,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {i.imageUrl ? (
                    <img src={i.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                <div style={{ flex: 1 }}>
                  <div>
                    <strong>{i.title}</strong> · {i.game}
                  </div>
                  <div className="muted">
                    {SHOP_RARITY_OPTIONS.find((r) => r.value === i.rarity)?.label ?? i.rarity} · {i.priceGems}{" "}
                    Gems · остаток {i.stock} · {i.isActive ? "в продаже" : "скрыт"}
                  </div>
                  <button
                    type="button"
                    style={{ marginTop: 8, fontSize: 12 }}
                    disabled={toggleShopActive.isPending}
                    onClick={() => toggleShopActive.mutate({ id: i.id, active: !i.isActive })}
                  >
                    {i.isActive ? "Скрыть" : "Вернуть"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
