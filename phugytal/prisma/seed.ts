import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@phugytal.local")
    .trim()
    .toLowerCase();
  const password = (process.env.ADMIN_PASSWORD ?? "ChangeMeAdmin123!").trim();
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  }
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN", name: "Super Admin" },
    create: {
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      name: "Super Admin",
    },
  });

  console.log(`Seeded SUPER_ADMIN: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
