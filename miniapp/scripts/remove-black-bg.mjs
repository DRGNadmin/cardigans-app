/**
 * Делает почти чёрные пиксели прозрачными (логотип на «чёрном» фоне без альфы).
 * Запуск: node scripts/remove-black-bg.mjs <вход.png> <выход.png>
 */
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const input = process.argv[2] ? resolve(process.argv[2]) : resolve(root, "public/cardigans-gaming-logo.png");
const output = process.argv[3] ? resolve(process.argv[3]) : resolve(root, "public/cardigans-gaming-logo.png");

/** Порог: если R,G,B ≤ threshold — считаем фоном. 4-й аргумент: число, иначе 48. */
const THRESHOLD = (() => {
  const n = process.argv[4] != null ? parseInt(process.argv[4], 10) : 48;
  if (Number.isFinite(n) && n >= 0 && n <= 255) return n;
  return 48;
})();

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (a === 0) continue;
  if (r <= THRESHOLD && g <= THRESHOLD && b <= THRESHOLD) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9, effort: 10 })
  .toFile(output);

console.log("OK:", output, `${info.width}x${info.height}`);
