import { NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import { publishTournament } from "@/lib/realtime";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function extFor(type: string) {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const p = await prisma.participant.findUnique({
    where: { id },
    include: { tournament: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await requireDisciplineAccess(p.tournament.discipline);
  if ("error" in access) return access.error;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Только PNG, JPG, WEBP или GIF" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Максимум 2 МБ" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(dir, { recursive: true });
  const filename = `${id}.${extFor(file.type)}`;
  const abs = path.join(dir, filename);
  await writeFile(abs, buf);

  const logoUrl = `/uploads/logos/${filename}?v=${Date.now()}`;
  const updated = await prisma.participant.update({
    where: { id },
    data: { logoUrl },
  });
  publishTournament(p.tournamentId);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const p = await prisma.participant.findUnique({
    where: { id },
    include: { tournament: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await requireDisciplineAccess(p.tournament.discipline);
  if ("error" in access) return access.error;

  if (p.logoUrl) {
    try {
      const clean = p.logoUrl.split("?")[0]!.replace(/^\//, "");
      await unlink(path.join(process.cwd(), "public", clean));
    } catch {
      /* ignore missing file */
    }
  }

  const updated = await prisma.participant.update({
    where: { id },
    data: { logoUrl: null },
  });
  publishTournament(p.tournamentId);
  return NextResponse.json(updated);
}
