// INTRO: iridescent peacock feathers sweep left → right across a warm golden scene and reveal the Sanskrit verse (Devanagari + transliteration).
// The feathers are drawn here in code (barbs + eye), so they are original artwork. introDraw(lt) is a pure function of the intro clock lt (seconds).
import { ctx, setCtx, W, H, TAU, clamp, lerp, seg, rnd } from './core/lib.js';
import { gold, motes, scrim, IMG } from './painted.js';

const DEV = '"Noto Serif Devanagari", Caladea';
// the verse shown in the intro comes from script.json (verse_dev / verse_en, 2-4 lines each); setVerse() is called by shots.js
export let VERSE_DEV = [], VERSE_EN = [];
export function setVerse(dev, en) { VERSE_DEV = dev || []; VERSE_EN = en || []; }

// timing of the intro (seconds on the intro clock)
export const SWEEP = { t0: 0.2, dur: 2.9 };
export const FEATHER_VARIANT = 'A';                // A wiper · B settle upright behind the verse · C rest low on the right          // the feather crosses the screen
export const CLEAR = 3.1;                            // feather gone, verse fully clear from here …
export const HOLD = 4.0;                             // … for 4 seconds
export const INTRO = CLEAR + HOLD + 0.2;             // 7.3 s: 4 s clear, then a 0.2 s golden flash into the story; the narration starts after this

const sine = (p) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(p));

// ---------- one feather sprite: stem along +x, eye at x = eyeX; hs shifts the hue (the shimmer crossfades between two shifts) ----------
function makeFeather(len, wid, seed, hs = 0) {
  const pad = 50, c = document.createElement('canvas'); c.width = Math.ceil(len + pad * 2); c.height = Math.ceil(wid + pad * 2);
  const g = c.getContext('2d'), cy = c.height / 2, x0 = pad, eyeX = pad + len * 0.9, bow = wid * 0.05;
  const yS = (x) => cy + bow * Math.sin(Math.PI * clamp((x - x0) / (eyeX - x0)));
  g.lineCap = 'round';
  const prof = (u) => (u < 0.88 ? 0.12 + 0.88 * Math.pow(Math.sin(Math.min(1, u / 0.88) * Math.PI / 2), 0.85) : 1 - 0.5 * Math.pow((u - 0.88) / 0.12, 2));
  const hue = (u) => (u < 0.3 ? lerp(34, 58, u / 0.3) : u < 0.7 ? lerp(58, 152, (u - 0.3) / 0.4) : lerp(152, 190, (u - 0.7) / 0.3));
  // faint body glow so the feather reads as a soft shape between the hair-fine barbs
  for (let side = -1; side <= 1; side += 2) {
    const N = 560;
    for (let k = 0; k < N; k++) {
      const u = (k + rnd(seed + k * 3 + side * 7) * 0.9) / N, xs = x0 + (eyeX - x0) * (0.03 + 0.97 * u), ys = yS(xs);
      const L = (wid / 2) * prof(u) * (0.9 + 0.2 * rnd(seed + k)), a = 0.95 - 0.12 * u, dx = Math.cos(a) * L, dy = Math.sin(a) * L * side;
      const h = hue(u) + hs + (rnd(seed + k * 5) - 0.5) * 14;
      g.beginPath(); g.moveTo(xs, ys); g.quadraticCurveTo(xs + dx * 0.35, ys + dy * 0.75, xs + dx, ys + dy);
      g.strokeStyle = `hsla(${h},66%,${28 + 15 * u}%,0.8)`; g.lineWidth = 1.9; g.stroke();
      g.beginPath(); g.moveTo(xs + dx * 0.6, ys + dy * 0.62); g.quadraticCurveTo(xs + dx * 0.8, ys + dy * 0.86, xs + dx, ys + dy);
      g.strokeStyle = `hsla(${hue(u) * 0.35 + 28 + hs * 0.5},85%,62%,0.55)`; g.lineWidth = 1.4; g.stroke();
    }
  }
  // the eye: gold fringe, bronze ring, emerald ring, sapphire, violet core, a catch-light
  const rx = wid * 0.30, ry = wid * 0.235, ey = yS(eyeX), disc = (k, stops) => {
    g.save(); g.translate(eyeX, ey); g.scale(rx * k, ry * k); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore(); };
  disc(1.55, [[0, `hsla(${150 + hs},70%,34%,0.95)`], [0.8, `hsla(${120 + hs},60%,30%,0.9)`], [1, `hsla(${60 + hs},70%,40%,0)`]]);
  disc(1.28, [[0, '#B8891B'], [0.7, '#D6AA3A'], [1, '#7A5A12']]);
  disc(1.08, [[0, `hsl(${168 + hs},80%,26%)`], [1, `hsl(${160 + hs},85%,38%)`]]);
  disc(0.84, [[0, `hsl(${222 + hs},85%,28%)`], [0.6, `hsl(${212 + hs},90%,42%)`], [1, `hsl(${196 + hs},90%,44%)`]]);
  g.save(); g.translate(eyeX + rx * 0.05, ey); g.scale(rx * 0.44, ry * 0.52);
  const core = g.createRadialGradient(0, 0, 0, 0, 0, 1); core.addColorStop(0, '#1A0630'); core.addColorStop(0.7, '#4A1A7E'); core.addColorStop(1, '#5B2A9A');
  g.fillStyle = core; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(eyeX - rx * 0.18, ey - ry * 0.2, rx * 0.11, ry * 0.08, -0.4, 0, TAU); g.fill();
  // stem
  const sg = g.createLinearGradient(x0 - 30, 0, eyeX, 0); sg.addColorStop(0, '#6A4A1A'); sg.addColorStop(1, '#E0C070');
  g.strokeStyle = sg; g.lineWidth = 4.5; g.beginPath(); g.moveTo(x0 - 30, yS(x0)); for (let x = x0; x <= eyeX - rx * 0.9; x += 20) g.lineTo(x, yS(x)); g.stroke();
  c.eyeX = eyeX; c.cy = cy; return c;
}

let SPR = null, TEXT = null, TMP = null;
const SIZES = [[1700, 520, 11]];                                     // fallback feather (drawn in code) used until img/08_feather.* is supplied
const X0 = -440, X1 = 1520;                                           // x of the feather's axis at the start / end of the sweep (off-screen both times)
export const frontX = (lt) => lerp(X0, X1, sine((lt - SWEEP.t0) / SWEEP.dur));

// the painted feather (img/08_feather.png transparent, or .jpg on black): find its bounding box and, on black, turn black into transparency
let FE = null;
function prepFeather() {
  const im = IMG.feather; if (!im) return null;
  const w = im.width, h = im.height, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, w, h), px = d.data, corner = [0, 4 * (w - 1), 4 * w * (h - 1), 4 * (w * h - 1)].map((i) => px[i + 3]);
  const alphaMode = Math.max(...corner) < 40;
  // background colour = average of the border pixels (the feather sits on a dark warm backdrop)
  let br = 0, bg = 0, bb = 0, bn = 0;
  const edge = (x, y) => { const i = 4 * (y * w + x); br += px[i]; bg += px[i + 1]; bb += px[i + 2]; bn++; };
  for (let x = 0; x < w; x += 7) { edge(x, 2); edge(x, h - 3); } for (let y = 0; y < h; y += 7) { edge(2, y); edge(w - 3, y); }
  br /= bn; bg /= bn; bb /= bn;
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = 4 * (y * w + x);
    if (!alphaMode) { const dd = Math.max(px[i] - br, px[i + 1] - bg, px[i + 2] - bb) - 9; px[i + 3] = Math.max(0, Math.min(255, dd * 8)); }   // backdrop → transparent, feather colours kept
    if (px[i + 3] > 140) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  g.putImageData(d, 0, 0);
  return { c, w, h, bx: (x0 + x1) / 2, by: (y0 + y1) / 2, bh: y1 - y0, bw: x1 - x0, alphaMode };
}

function init() {
  if (SPR) return;
  FE = prepFeather();
  SPR = SIZES.map(([l, w, s]) => [makeFeather(l, w, s, 0), makeFeather(l, w, s, 34)]);
  // the verse, drawn once on its own layer
  TEXT = document.createElement('canvas'); TEXT.width = W; TEXT.height = H; TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H;
  const main = ctx; setCtx(TEXT.getContext('2d'));
  const nd = VERSE_DEV.length, d0 = 590 + (4 - nd) * 69; VERSE_DEV.forEach((t, j) => gold(t, 540, d0 + j * 138, 104, { font: DEV, fit: 900 }));
  const c = ctx; c.save(); const dg = c.createLinearGradient(240, 0, 840, 0); dg.addColorStop(0, 'rgba(255,214,120,0)'); dg.addColorStop(0.5, 'rgba(255,214,120,0.9)'); dg.addColorStop(1, 'rgba(255,214,120,0)');
  c.fillStyle = dg; c.fillRect(240, 1100, 600, 3); c.translate(540, 1101.5); c.rotate(Math.PI / 4); c.fillStyle = '#FFD98A'; c.fillRect(-9, -9, 18, 18); c.restore();
  VERSE_EN.forEach((t, j) => gold(t, 540, 1195 + j * 76 + (j > 1 ? 30 : 0), 56, { font: 'Caladea', fit: 900, color: '#FBE7B5' }));
  setCtx(main);
}

function backdrop(t) {
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2C190B'); g.addColorStop(0.5, '#3F250F'); g.addColorStop(1, '#1B1008'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const br = 0.8 + 0.2 * Math.sin(t * 1.1);
  g = ctx.createRadialGradient(300, 300, 40, 300, 300, 900); g.addColorStop(0, `rgba(255,170,60,${0.30 * br})`); g.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(860, 1560, 40, 860, 1560, 860); g.addColorStop(0, `rgba(255,150,50,${0.24 * br})`); g.addColorStop(1, 'rgba(255,150,50,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {                                                      // slow light rays from the top
    const a = -0.55 + i * 0.14 + Math.sin(t * 0.25 + i) * 0.03, w = 0.045;
    ctx.fillStyle = `rgba(255,205,120,${0.05 + 0.025 * Math.sin(t * 0.8 + i * 2)})`; ctx.beginPath(); ctx.moveTo(300, -60);
    ctx.lineTo(300 + Math.tan(a - w) * 2300, 2240); ctx.lineTo(300 + Math.tan(a + w) * 2300, 2240); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 16; i++) {                                                     // soft bokeh
    const x = rnd(i * 3) * W, y = ((rnd(i * 3 + 1) * H - t * (6 + rnd(i) * 8)) % H + H) % H, r = 40 + rnd(i * 3 + 2) * 90;
    g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,205,120,0.16)'); g.addColorStop(1, 'rgba(255,205,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** the whole intro at intro-time lt */
export function introDraw(lt) {
  init(); const t = lt;
  backdrop(t);
  // ONE feather pivoting on its quill at the bottom centre, sweeping left → right; the verse is revealed in the wedge it has swept.
  // ?fv=A wiper (sweeps across and out) · B sweep, then settle upright behind the verse · C sweep, then rest low on the right
  const FV = (new URLSearchParams(location.search).get('fv') || FEATHER_VARIANT).toUpperCase();
  const DEG = Math.PI / 180, PX = 540, PY = H + 30;
  const thA = (x) => lerp(-100 * DEG, 100 * DEG, sine((x - SWEEP.t0) / SWEEP.dur));
  const tAt = (deg) => SWEEP.t0 + SWEEP.dur * Math.acos(1 - 2 * ((deg + 100) / 200)) / Math.PI;      // time the wiper reaches deg
  let th = thA(lt), alpha = 1, behind = false;
  if (FV === 'B') { const tb = tAt(45); if (lt > tb) { const p = sine((lt - tb) / 1.1); th = lerp(45 * DEG, 0, p) + Math.sin(t * 1.2) * 2 * DEG * p; alpha = lerp(1, 0.42, p); } behind = true; }
  if (FV === 'C') { const tc = tAt(36); if (lt > tc) { th = 36 * DEG + Math.sin((lt - tc) * 1.3) * 2.5 * DEG; alpha = lerp(1, 0.6, sine((lt - tc) / 1)); } behind = true; }
  const rev = thA(lt), soft = 0.065;
  const drawText = () => {
    const tc = TMP.getContext('2d'); tc.globalCompositeOperation = 'copy'; tc.drawImage(TEXT, 0, 0); tc.globalCompositeOperation = 'destination-in';
    const s0 = -Math.PI / 2 - 1.95, f = clamp((-Math.PI / 2 + rev - s0) / TAU, 0, 1), mg = tc.createConicGradient(s0, PX, PY);
    mg.addColorStop(0, 'rgba(0,0,0,1)'); mg.addColorStop(Math.max(0, f - soft), 'rgba(0,0,0,1)'); mg.addColorStop(Math.max(0.0001, f), 'rgba(0,0,0,0)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
    tc.fillStyle = mg; tc.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, Math.sin(t * 0.9) * 3); ctx.drawImage(TMP, 0, 0); ctx.restore();
  };
  const sweeping = lt > SWEEP.t0 - 0.2 && lt < SWEEP.t0 + SWEEP.dur + 0.1;
  const drawFeather = () => {
    if (!FE || th > 98 * DEG) return;
    const k = (H * 0.92) / FE.bh, w = (200 * DEG / SWEEP.dur) * Math.sin(Math.PI * clamp((lt - SWEEP.t0) / SWEEP.dur)) * (FV === 'A' || th < 40 * DEG ? 1 : 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';                          // warm light on the feather
    const mx = PX + Math.sin(th) * 900, my = PY - Math.cos(th) * 900, g = ctx.createRadialGradient(mx, my, 40, mx, my, 760);
    g.addColorStop(0, `rgba(255,200,100,${0.2 * alpha})`); g.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    for (const gh of [2, 1, 0]) {                                                  // faint ghosts = soft motion blur
      if (gh && w < 0.05) continue;
      ctx.save(); ctx.translate(PX, PY); ctx.rotate(th - gh * w * 0.011); ctx.globalAlpha = (gh ? 0.14 / gh : 1) * alpha;
      ctx.scale(k, k); ctx.drawImage(FE.c, -FE.bx, -(FE.by + FE.bh / 2)); ctx.restore();
    }
  };
  if (behind) { drawFeather(); drawText(); } else { drawText(); drawFeather(); }
  if (sweeping) {                                                                  // sparks along the reveal edge
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) {
      const r = 250 + rnd(i * 7 + 1) * 1650, a = -Math.PI / 2 + rev - rnd(i * 7 + 2) * 0.22, x = PX + Math.cos(a) * r, y = PY + Math.sin(a) * r;
      const tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 2.3); ctx.globalAlpha = 0.6 * tw * (1 - seg(rev, 80 * DEG, 100 * DEG)) * seg(rev, -95 * DEG, -80 * DEG);
      ctx.fillStyle = '#FFE7A8'; ctx.beginPath(); ctx.arc(x, y, 2 + rnd(i * 7 + 3) * 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  motes(t, 46);
  scrim(0.35, 0.45);
}
/** golden flash used to blend the end of the intro into the first painted scene */
export function flash(a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = '#FFE6B0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
