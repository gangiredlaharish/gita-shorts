#!/usr/bin/env python3
"""Compose an eye-catching YouTube Shorts thumbnail -> renders/gita-<v>-cover.jpg.

Driven by script.json's top-level "thumbnail" field:
  "thumbnail": {
    "scene": "duryodhana",            # cast/<scene>.jpg - cropped/zoomed to a tight portrait
    "hook":  "दुर्योधन की चिंता",       # big bold headline (Devanagari or English)
    "badge": "अध्याय 1 · श्लोक 2",      # small pill top-left: chapter/verse
    "side":  "pandava" | "kaurava"     # channel convention: royal-blue accent for Pandava-aligned
                                       #   content, wine-red for Kaurava-aligned (omit for neutral/gold)
  }

Usage:  python3 thumbnail.py <project_dir>   (project_dir has script.json + img/<scene>.jpg + renders/)
"""
import json, sys, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

W, H = 1080, 1920
FONT_DIR = Path(__file__).resolve().parent.parent / 'fonts'
DEV_BOLD = FONT_DIR / 'NotoSerifDevanagari-Bold.woff2'
EN_BLACK = FONT_DIR / 'Inter-Black.otf'

GOLD = (255, 214, 120)
CREAM = (255, 248, 232)
ACCENT = {'pandava': (64, 95, 200), 'kaurava': (150, 35, 48), None: (201, 155, 70)}


def font_for(text, size):
    return ImageFont.truetype(str(DEV_BOLD if re.search(r'[ऀ-ॿ]', text) else EN_BLACK), size)


def runs(text):
    """Split into (substring, is_devanagari) runs - NotoSerifDevanagari-Bold doesn't carry digits/punctuation
    glyphs, so anything mixing Hindi with numbers or "·" needs per-run fonts, not one font for the whole string."""
    out, cur, cur_dev = [], '', None
    for ch in text:
        dev = 'ऀ' <= ch <= 'ॿ'
        if cur and dev != cur_dev and ch != ' ':
            out.append((cur, cur_dev)); cur = ''
        cur += ch; cur_dev = dev if ch != ' ' else cur_dev
    if cur: out.append((cur, cur_dev))
    return out


def mixed_width(draw, text, size):
    return sum(draw.textlength(t, font=font_for(t if dev else 'a', size)) for t, dev in runs(text))


def draw_mixed(draw, xy, text, size, fill, anchor='lm', stroke_w=0, stroke_fill=(20, 12, 4)):
    """Draw text that may switch between Devanagari and Latin/digits mid-string, each run in the right font,
    laid out left-to-right starting at xy, vertically centered the same way for every run (anchor's 'm'/'s'/'t' row)."""
    x, y = xy
    row = anchor[1] if len(anchor) > 1 else 'm'
    total = mixed_width(draw, text, size)
    if anchor[0] == 'm': x -= total / 2
    elif anchor[0] == 'r': x -= total
    for t, dev in runs(text):
        f = font_for(t if dev else 'a', size)
        draw.text((x, y), t, font=f, fill=fill, stroke_width=stroke_w, stroke_fill=stroke_fill, anchor='l' + row)
        x += draw.textlength(t, font=f)


def fit_crop(im, w, h, focus_y=0.33):
    """Cover-fit crop, biased toward the upper portion (faces) rather than dead-center."""
    sw, sh = im.size
    s = max(w / sw, h / sh)
    im = im.resize((round(sw * s), round(sh * s)), Image.LANCZOS)
    sw, sh = im.size
    x0 = (sw - w) / 2
    y0 = max(0, min(sh - h, (sh - h) * focus_y))
    return im.crop((round(x0), round(y0), round(x0) + w, round(y0) + h))


def wrap(draw, text, size, max_w):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if mixed_width(draw, t, size) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines


def main():
    P = Path(sys.argv[1])
    S = json.loads((P / 'script.json').read_text())
    T = S.get('thumbnail') or {}
    scene = T.get('scene') or next((l['scene'] for l in S['lines'] if l.get('scene') and l['scene'] not in ('manuscript', 'lotus')), 'field')
    hook = T.get('hook') or S.get('title', '').split('|')[0].strip()
    badge = T.get('badge') or f"अध्याय {S.get('chapter', 1)} · श्लोक {S.get('verse', '')}"
    accent = ACCENT.get(T.get('side'), ACCENT[None])

    src = None
    for ext in ('jpg', 'png'):
        p = P / 'img' / f'{scene}.{ext}'
        if p.exists(): src = p; break
    if not src: raise SystemExit(f'thumbnail: no picture for scene "{scene}" (img/{scene}.jpg)')

    im = fit_crop(Image.open(src).convert('RGB'), W, H, focus_y=0.30)
    im = ImageOps.autocontrast(im, cutoff=1)
    im = Image.eval(im, lambda p: min(255, int(p * 1.08)))  # slight pop

    canvas = im.convert('RGBA')
    draw = ImageDraw.Draw(canvas)

    # bottom scrim for text legibility
    scrim = Image.new('L', (1, H), 0)
    for y in range(H):
        t = max(0, (y - H * 0.42) / (H * 0.58))
        scrim.putpixel((0, y), int(235 * (t ** 1.6)))
    scrim = scrim.resize((W, H))
    black = Image.new('RGBA', (W, H), (10, 6, 2, 255))
    canvas = Image.composite(black, canvas, scrim)
    draw = ImageDraw.Draw(canvas)

    # top scrim so the badge always reads
    for y in range(0, 260):
        a = int(170 * max(0, 1 - y / 260))
        draw.line([(0, y), (W, y)], fill=(8, 5, 2, a))

    # accent edge bars (channel convention: royal-blue = Pandava side, wine-red = Kaurava side)
    bar_w = 14
    draw.rectangle([0, 0, bar_w, H], fill=accent + (255,))
    draw.rectangle([W - bar_w, 0, W, H], fill=accent + (255,))

    # chapter/verse badge, top-left
    bw = mixed_width(draw, badge, 46)
    pad_x, pad_y = 34, 20
    bx0, by0 = 56, 64
    draw.rounded_rectangle([bx0, by0, bx0 + bw + pad_x * 2, by0 + 46 + pad_y * 2], radius=14,
                            fill=(20, 13, 6, 235), outline=GOLD + (255,), width=2)
    draw_mixed(draw, (bx0 + pad_x, by0 + pad_y + 23), badge, 46, GOLD, anchor='lm')

    # small wordmark, bottom-right corner
    wf = font_for('भगवद्गीता', 40)
    draw.text((W - 44, H - 40), 'भगवद्गीता', font=wf, fill=(255, 255, 255, 170), anchor='rs')

    # big bold hook headline, bottom
    size = 118 if len(hook) <= 14 else 96 if len(hook) <= 22 else 78
    lines = wrap(draw, hook, size, W - 140)
    if len(lines) > 2:  # shrink to fit if still too long
        size = int(size * 0.8); lines = wrap(draw, hook, size, W - 140)
    line_h = int(size * 1.18)
    y = H - 90 - line_h * (len(lines) - 1) - size * 0.5
    for ln in lines:
        draw_mixed(draw, (W / 2, y), ln, size, CREAM, anchor='mm', stroke_w=max(8, size // 11))
        y += line_h

    # thin gold rule above the headline block
    ry = y - line_h * 0.15
    draw.line([(90, ry), (W - 90, ry)], fill=GOLD + (160,), width=3)

    out = P / 'renders' / f"gita-{S.get('chapter', 1)}.{S.get('verse', '')}-cover.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(out, quality=95)
    print(f'{out} ({out.stat().st_size} bytes) — scene={scene} hook="{hook}"')


if __name__ == '__main__':
    main()
