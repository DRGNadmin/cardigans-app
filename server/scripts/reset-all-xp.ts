/**
 * Одноразово: xp_total = 0 у всех пользователей (для теста анимации уровня и т.п.).
 * Запуск: npm run db:reset-xp
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.user.updateMany({ data: { xpTotal: 0 } });
  console.log(`Сброшен XP у пользователей: ${r.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
