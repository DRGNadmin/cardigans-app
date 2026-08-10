import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { assertSameOrigin } from "@/lib/auth/http";
import { requireUser } from "@/lib/auth/guard";
import { isDisciplineSlug } from "@/lib/disciplines";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  name: z.string().min(1).max(80).optional(),
  disciplines: z.array(z.string()).min(1).max(5),
});

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const users = await prisma.user.findMany({
    include: { disciplines: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      disciplines: u.disciplines.map((d) => d.disciplineSlug),
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const disciplines = parsed.data.disciplines.filter(isDisciplineSlug);
  if (!disciplines.length) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: parsed.data.name,
        role: "DISCIPLINE_ADMIN",
        disciplines: {
          create: disciplines.map((disciplineSlug) => ({ disciplineSlug })),
        },
      },
      include: { disciplines: true },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          disciplines: user.disciplines.map((d) => d.disciplineSlug),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Could not create user" }, { status: 400 });
  }
}
