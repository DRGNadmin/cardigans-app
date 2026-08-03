import { prisma } from "../db.js";

type DefaultTaskRow = {
  key: string;
  title: string;
  description: string;
  rewardGems: number;
  type:
    | "daily_login"
    | "predictions_count"
    | "predictions_game"
    | "correct_streak"
    | "weekly_streak"
    | "trade_url"
    | "onboarding";
  targetCount: number | null;
  sort: number;
  game?: "CS2" | "DOTA2";
};

const DEFAULT_TASKS: DefaultTaskRow[] = [
  {
    key: "onb_first_prediction",
    title: "Первый прогноз",
    description: "Сделайте первый прогноз на матч.",
    rewardGems: 75,
    type: "onboarding",
    targetCount: null,
    sort: 5,
  },
  {
    key: "onb_first_order",
    title: "Первая покупка",
    description: "Оформите первый заказ в магазине гемов.",
    rewardGems: 100,
    type: "onboarding",
    targetCount: null,
    sort: 6,
  },
  {
    key: "onb_visit_shop",
    title: "Загляните в магазин",
    description: "Откройте раздел «Магазин» в приложении.",
    rewardGems: 30,
    type: "onboarding",
    targetCount: null,
    sort: 7,
  },
  {
    key: "trade_url_bonus",
    title: "Steam Trade URL",
    description: "Укажите ссылку на обмен Steam в профиле — так мы сможем отправить приз.",
    rewardGems: 80,
    type: "trade_url",
    targetCount: null,
    sort: 12,
  },
  {
    key: "predictions_cs2_row",
    title: "Прогнозы CS2",
    description: "Сделайте 3 прогноза на матчи CS2.",
    rewardGems: 120,
    type: "predictions_game",
    game: "CS2",
    targetCount: 3,
    sort: 15,
  },
  {
    key: "predictions_dota_row",
    title: "Прогнозы Dota 2",
    description: "Сделайте 3 прогноза на матчи Dota 2.",
    rewardGems: 120,
    type: "predictions_game",
    game: "DOTA2",
    targetCount: 3,
    sort: 18,
  },
  {
    key: "daily_login",
    title: "Ежедневный вход",
    description: "Заходите в приложение и забирайте награду. Обновляется каждые 24 часа.",
    rewardGems: 50,
    type: "daily_login",
    targetCount: null,
    sort: 25,
  },
  {
    key: "predictions_master",
    title: "Прогноз мастер",
    description: "Сделайте 5 прогнозов на матчи.",
    rewardGems: 200,
    type: "predictions_count",
    targetCount: 5,
    sort: 30,
  },
  {
    key: "sharp_shooter",
    title: "Точный стрелок",
    description: "Угадайте исход 3 матчей подряд (верные прогнозы после их завершения). Ошибка — серия сбрасывается.",
    rewardGems: 250,
    type: "correct_streak",
    targetCount: 3,
    sort: 40,
  },
  {
    key: "weekly_login",
    title: "Еженедельный вход",
    description: "Заходите в приложение 7 дней подряд (календарные дни UTC). Пропустили день — прогресс обнуляется.",
    rewardGems: 300,
    type: "weekly_streak",
    targetCount: 7,
    sort: 50,
  },
];

export async function ensureDefaultTasks(): Promise<void> {
  await prisma.task.deleteMany({
    where: {
      OR: [
        { title: { equals: "КАК ДЕЛА", mode: "insensitive" } },
        { title: { contains: "как дела", mode: "insensitive" } },
      ],
    },
  });

  for (const t of DEFAULT_TASKS) {
    await prisma.task.upsert({
      where: { key: t.key },
      create: {
        key: t.key,
        title: t.title,
        description: t.description,
        rewardGems: t.rewardGems,
        type: t.type,
        targetCount: t.targetCount,
        sort: t.sort,
        isActive: true,
        game: t.game ?? null,
      },
      update: {
        title: t.title,
        description: t.description,
        rewardGems: t.rewardGems,
        type: t.type,
        targetCount: t.targetCount,
        sort: t.sort,
        isActive: true,
        game: t.game ?? null,
      },
    });
  }
}
