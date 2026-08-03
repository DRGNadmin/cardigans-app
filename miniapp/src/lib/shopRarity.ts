/** Совпадает с enum ShopItemRarity в Prisma. */
export type ShopItemRarity =
  | "restricted"
  | "classified"
  | "covert"
  | "contraband"
  | "immortal"
  | "arcana";

export const SHOP_RARITY_OPTIONS: { value: ShopItemRarity; label: string }[] = [
  { value: "restricted", label: "Запрещённое" },
  { value: "classified", label: "Засекреченное" },
  { value: "covert", label: "Тайное" },
  { value: "contraband", label: "Контрабанда" },
  { value: "immortal", label: "Immortal" },
  { value: "arcana", label: "Arcana" },
];

const RARITY_CSS: Record<ShopItemRarity, string> = {
  restricted: "var(--rarity-restricted)",
  classified: "var(--rarity-classified)",
  covert: "var(--rarity-covert)",
  contraband: "var(--rarity-contraband)",
  immortal: "var(--rarity-immortal)",
  arcana: "var(--rarity-arcana)",
};

export function rarityVisual(rarity: string): { color: string; label: string; placeholder: string } {
  const row = SHOP_RARITY_OPTIONS.find((o) => o.value === rarity);
  const label = row?.label ?? "Предмет";
  const color =
    rarity in RARITY_CSS ? RARITY_CSS[rarity as ShopItemRarity] : "var(--rarity-restricted)";
  return { color, label, placeholder: "SKIN" };
}

/** Лёгкий шиммер на карточке для высоких редкостей. */
export type ShopCardShimmer = "none" | "high" | "elite";

export function shopCardShimmer(rarity: string): ShopCardShimmer {
  if (rarity === "immortal" || rarity === "arcana") return "elite";
  if (rarity === "covert" || rarity === "contraband") return "high";
  return "none";
}
