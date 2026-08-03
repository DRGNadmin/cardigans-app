import fs from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = process.argv[2] ?? resolve(__dirname, "../../Downloads/design-615e742b-45df-478f-a0b6-7f029a14730a.html");
const outPath = resolve(__dirname, "../src/components/SplashScreenLogo.tsx");

const html = fs.readFileSync(htmlPath, "utf8");
const re =
  /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="100%"[^>]*>([\s\S]*?)<\/svg>/;
const m = html.match(re);
if (!m) throw new Error("Logo SVG not found in HTML");

let inner = m[1];
inner = inner.replace(/class="emblem-group"/g, 'className="cg-splash-emblem"');
inner = inner.replace(/class="text-c-letter"/g, 'className="cg-splash-c-letter"');
inner = inner.replace(/class="text-g-letter"/g, 'className="cg-splash-g-letter"');
inner = inner.replace(/\s+vid="[^"]*"/g, "");
inner = inner.replace(/class="text-cardigans"/g, 'className="text-cardigans"');
inner = inner.replace(/class="text-gaming"/g, 'className="text-gaming"');

const out = `import type { ReactNode } from "react";

export function SplashScreenLogo(): ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="auto"
      viewBox="0 0 431 158"
      fill="none"
      className="w-full drop-shadow-2xl"
      aria-hidden
    >
${inner}
    </svg>
  );
}
`;

fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", outPath);
