/**
 * Удаление старых (или всех) матчей, заказов, тикетов поддержки и строк журнала purchase.
 *
 * Важно: удаление ledger не меняет gems_balance у пользователей (баланс уже был списан при покупке).
 *
 * По умолчанию — только вывод плана (dry-run). Чтобы применить:
 *   npx tsx scripts/cleanup-old-data.ts --execute --all
 * Или только записи старше N дней (заказы/тикеты/purchase: createdAt; матчи: startsAt):
 *   npx tsx scripts/cleanup-old-data.ts --execute --days 30
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs() {
  const argv = process.argv.slice(2);
  let execute = false;
  let all = false;
  let days: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--execute") execute = true;
    else if (a === "--all") all = true;
    else if (a === "--days" && argv[i + 1]) {
      days = Math.max(0, parseInt(argv[++i], 10));
      if (Number.isNaN(days)) days = 30;
    }
  }
  if (!all && days === null) days = 30;
  if (all) days = null;
  return { execute, all, days };
}

async function main() {
  const { execute, all, days } = parseArgs();
  const cutoff = days != null ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  const ticketWhere = all || !cutoff ? {} : { createdAt: { lt: cutoff } };
  const orderWhere = all || !cutoff ? {} : { createdAt: { lt: cutoff } };
  const matchWhere = all || !cutoff ? {} : { startsAt: { lt: cutoff } };
  const purchaseLedgerWhere =
    all || !cutoff
      ? { type: "purchase" as const }
      : { type: "purchase" as const, createdAt: { lt: cutoff } };

  const [tickets, orders, matches, purchaseLedger] = await Promise.all([
    prisma.supportTicket.count({ where: ticketWhere }),
    prisma.order.count({ where: orderWhere }),
    prisma.match.count({ where: matchWhere }),
    prisma.ledgerTransaction.count({ where: purchaseLedgerWhere }),
  ]);

  const mode = all
    ? "ВСЕ записи"
    : `старше ${days} дн. (тикеты/заказы/purchase: createdAt; матчи: startsAt)`;
  console.log(`Режим: ${mode}`);
  console.log(`  support_tickets: ${tickets}`);
  console.log(`  orders:          ${orders}`);
  console.log(`  matches (+ каскад options/predictions): ${matches}`);
  console.log(`  ledger (type=purchase): ${purchaseLedger}`);

  if (!execute) {
    console.log("\nDry-run. Добавьте --execute для удаления.");
    return;
  }

  const delT = await prisma.supportTicket.deleteMany({ where: ticketWhere });
  const delO = await prisma.order.deleteMany({ where: orderWhere });
  const delL = await prisma.ledgerTransaction.deleteMany({ where: purchaseLedgerWhere });
  const delM = await prisma.match.deleteMany({ where: matchWhere });

  console.log("\nУдалено:");
  console.log(`  support_tickets: ${delT.count}`);
  console.log(`  orders:          ${delO.count}`);
  console.log(`  ledger purchase: ${delL.count}`);
  console.log(`  matches:         ${delM.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
