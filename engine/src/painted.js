// PAINTED style helpers: full-bleed painted scenes with slow Ken Burns moves, gold overlay text, soft scrims, drifting golden motes, white subtitles.
// All scenes are ORIGINAL images (generated for this channel); nothing here is taken from another creator's film.
import { ctx, W, H, TAU, clamp, lerp, seg, eio, eob, rnd } from './core/lib.js';
import { sceneFX } from './fx.js';

// Pictures come from the cast library: scene key "krishna" -> img/krishna.jpg (img/ links to the repo's cast/ folder).
// loadImages(keys) loads every key the script uses, plus the feather for the intro.
export const IMG = {}, USED = {}, CLK = { t: 0 };
export async function loadImages(keys) {
  const all = [...new Set([...keys, 'feather', 'lotus', 'manuscript'])];
  await Promise.all(all.map(async (k) => {
    for (const src of [`img/${k}.jpg`, `img/${k}.png`]) {
      const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
      if (im) { IMG[k] = im; USED[k] = src; return; }
    }
    IMG[k] = null; USED[k] = null; console.error('missing picture img/' + k + '.jpg');
  }));
  return USED;
}

/** draw scene k covering the canvas. kb = { z:[z0,z1] zoom, x:[x0,x1], y:[y0,y1] pan in -1..1 across the spare margin }, p = progress 0..1 */
export function paint(k, p, kb = {}, alpha = 1) {
  const [z0, z1] = kb.z || [1.06, 1.2], [x0, x1] = kb.x || [0, 0], [y0, y1] = kb.y || [0, 0];
  const e = eio(clamp(p)), z = lerp(z0, z1, e), px = lerp(x0, x1, e), py = lerp(y0, y1, e), im = IMG[k];
  ctx.save(); ctx.globalAlpha = alpha;
  if (im) {
    const base = Math.max(W / im.width, H / im.height) * z, w = im.width * base, h = im.height * base, mx = (w - W) / 2, my = (h - H) / 2;
    ctx.imageSmoothingQuality = 'high'; ctx.translate(-mx + px * mx, -my + py * my); ctx.scale(w / im.width, h / im.height); ctx.drawImage(im, 0, 0);
    sceneFX(k, im, CLK.t);                                                       // the painting comes alive (fx.js)
  } else {                                                                       // image missing: a labelled warm placeholder
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3A2515'); g.addColorStop(0.5, '#7A4F24'); g.addColorStop(1, '#1E130B'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.font = '700 70px Caladea'; ctx.fillStyle = 'rgba(255,230,170,0.5)'; ctx.textAlign = 'center'; ctx.fillText('[' + k + ']', W / 2, 700);
  }
  ctx.restore();
}

/** dark gradients so gold text and subtitles stay readable, plus a soft vignette */
export function scrim(top = 0.35, bottom = 0.7) {
  let g = ctx.createLinearGradient(0, 980, 0, H); g.addColorStop(0, 'rgba(8,5,2,0)'); g.addColorStop(1, `rgba(8,5,2,${bottom})`); ctx.fillStyle = g; ctx.fillRect(0, 980, W, H - 980);
  g = ctx.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, `rgba(8,5,2,${top})`); g.addColorStop(1, 'rgba(8,5,2,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 560);
  g = ctx.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
/** a soft dark band behind overlay text so gold stays readable over bright paintings (feathered top and bottom) */
export function plate(y0, y1, a = 0.5, fade = 0.3) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(8,5,2,0)'); g.addColorStop(fade, `rgba(8,5,2,${a})`); g.addColorStop(1 - fade, `rgba(8,5,2,${a})`); g.addColorStop(1, 'rgba(8,5,2,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
}
/** slow drifting golden dust */
export function motes(t, n = 38) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const sp = 18 + rnd(i + 3) * 34, x = (rnd(i) * W + Math.sin(t * 0.6 + i) * 40 + 2 * W) % W, y = ((rnd(i + 50) * H - t * sp) % H + H) % H, r = 1.5 + rnd(i + 9) * 3.2;
    ctx.globalAlpha = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7))) * 0.8; ctx.fillStyle = '#FFE2A0'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
/** gold overlay text (centred), a = opacity, rise = px it floats up while fading in */
export function gold(text, x, y, size, { font = 'Caladea, "Noto Serif Devanagari"', a = 1, weight = 700, fit = 900, color = null, rise = 0 } = {}) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(text).width, f = Math.min(1, fit / w); ctx.translate(x, y + (1 - clamp(a)) * rise); ctx.scale(f, f);
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 5;
  if (color) ctx.fillStyle = color; else { const g = ctx.createLinearGradient(0, -size, 0, size * 0.15); g.addColorStop(0, '#FFF0B8'); g.addColorStop(1, '#E3A93C'); ctx.fillStyle = g; }
  ctx.fillText(text, 0, 0); ctx.restore();
}
/** subtitle: white text, thick dark outline, one gold word; pops in */
export function subtitle(words, x, y, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.font = '700 94px Caladea, "Noto Serif Devanagari"'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  const sp = 26, ws = words.map((w) => ctx.measureText(w.txt).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1), fit = Math.min(1, 940 / tw);
  ctx.scale(fit, fit); let cx = -tw / 2;
  words.forEach((w, i) => { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.strokeStyle = 'rgba(12,7,3,0.95)'; ctx.lineWidth = 16; ctx.strokeText(w.txt, cx, 0);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = w.hi ? '#FFD36B' : '#FFFFFF'; ctx.fillText(w.txt, cx, 0); cx += ws[i] + sp; });
  ctx.restore();
}
export const ramp = (lt, a, dur = 0.45) => eio(seg(lt, a, a + dur));
