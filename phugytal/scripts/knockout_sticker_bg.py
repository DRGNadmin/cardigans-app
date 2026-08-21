from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "stickers"


def knock_out_black(path: Path, threshold: int = 28, softness: int = 18) -> str:
    im = Image.open(path).convert("RGBA")
    pixels = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            mx = max(r, g, b)
            if r < threshold and g < threshold and b < threshold:
                pixels[x, y] = (r, g, b, 0)
                continue
            t = max(0.0, min(1.0, (mx - threshold) / max(softness, 1)))
            pixels[x, y] = (r, g, b, int(a * t))
    im.save(path, optimize=True)
    return path.name


def main() -> None:
    for p in sorted(ROOT.glob("*.png")):
        print("processed", knock_out_black(p))


if __name__ == "__main__":
    main()
