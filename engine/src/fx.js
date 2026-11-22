// LIVING PAINTINGS: per-scene motion drawn on top of each painted image, in the image's own pixel space
// (so it rides the Ken Burns move): waving banners, rippling water, flickering flames, rising smoke and embers,
// drifting dust and mist, pulsing light, birds. Everything is a pure function of the clock t.
import { ctx, TAU, clamp, rnd } from './core/lib.js';

// ---- helpers (image pixel coords; u, v are 0..1 of the image) ----
let IW = 1536, IH = 2720;
const X = (u) => u * IW, Y = (v) => v * IH;

/** cloth ripple: redraw a region of the image in thin vertical strips shifted up/down by a travelling wave.
 *  pole = 'left' | 'right' (the fixed edge, where the wave amplitude is zero) */
function wave(im, t, u0, v0, u1, v1, { pole = 'left', amp = 0.012, k = 9, sp = 2.4, strip = 6, ph = 0 } = {}) {
  const x0 = X(u0), x1 = X(u1), y0 = Y(v0), y1 = Y(v1), w = x1 - x0, h = y1 - y0, A = amp * IH;
  for (let x = x0; x < x1; x += strip) {
    const r = pole === 'left' ? (x - x0) / w : (x1 - x) / w, s = pole === 'left' ? r : r;            // 0 at the pole → 1 at the free edge
    const dy = A * Math.pow(s, 1.3) * Math.sin(k * s - t * sp + ph), sh = 1 + 0.05 * s * Math.cos(k * s - t * sp + ph);
    ctx.drawImage(im, x, y0, strip + 1, h, x, y0 + dy, strip + 1, h * sh);
  }
}
/** water: redraw rows below `v0` shifted sideways by small waves that grow toward the viewer */
function water(im, t, v0, v1 = 1, { amp = 0.004, row = 4 } = {}) {
  const y0 = Y(v0), y1 = Y(v1);
  for (let y = y0; y < y1; y += row) {
    const d = (y - y0) / (y1 - y0), dx = amp * IW * (0.3 + d) * (Math.sin(y * 0.045 - t * 1.6) + 0.5 * Math.sin(y * 0.11 + t * 2.3));
    ctx.drawImage(im, 0, y, IW, row + 1, dx, y, IW, row + 1);
  }
}
function glow(u, v, r, col, a) {
  const x = X(u), y = Y(v), g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
/** a flickering flame: additive glow + three dancing tongues; s = size in image px */
function flame(u, v, s, t, seed = 0) {
  const f = 0.75 + 0.25 * Math.sin(t * 13 + seed) * Math.sin(t * 7.3 + seed * 2), x = X(u), y = Y(v);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(u, v, s * 6, '255,170,60', 0.28 * f); glow(u, v, s * 2.2, '255,210,120', 0.35 * f);
  for (let i = 0; i < 3; i++) {
    const sw = Math.sin(t * (6 + i * 2.1) + seed + i) * s * 0.25, hh = s * (1.6 + 0.5 * Math.sin(t * 9 + i * 3 + seed)) * (1 - i * 0.22);
    const g = ctx.createLinearGradient(x, y, x, y - hh); g.addColorStop(0, 'rgba(255,190,70,0.55)'); g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.quadraticCurveTo(x - s * 0.5 + sw, y - hh * 0.5, x + sw * 1.6, y - hh);
    ctx.quadraticCurveTo(x + s * 0.5 + sw, y - hh * 0.5, x + s * 0.45, y); ctx.fill();
  }
  ctx.restore();
}
/** embers drifting up from (u, v) */
function embers(u, v, t, n = 18, spread = 60, rise = 520, seed = 0) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const life = 2.2 + rnd(seed + i) * 1.8, p = ((t + rnd(seed + i * 3) * life) % life) / life;
    const x = X(u) + (rnd(seed + i * 5) - 0.5) * spread + Math.sin(t * 2 + i) * 30 * p, y = Y(v) - p * rise;
    ctx.globalAlpha = (1 - p) * 0.9; ctx.fillStyle = '#FFC46A'; ctx.beginPath(); ctx.arc(x, y, 2.5 + 2 * (1 - p), 0, TAU); ctx.fill();
  }
  ctx.restore();
}
/** soft smoke wisps rising and widening from (u, v) */
function smoke(u, v, t, { n = 9, rise = 700, size = 50, a = 0.12, seed = 0, drift = 120 } = {}) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const life = 4 + rnd(seed + i) * 2, p = ((t + i * life / n) % life) / life, x = X(u) + Math.sin(p * 4 + i + t * 0.6) * 40 * p + drift * p, y = Y(v) - p * rise, r = size * (0.6 + p * 2.6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(225,215,200,${a * Math.sin(Math.PI * p)})`); g.addColorStop(1, 'rgba(225,215,200,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.restore();
}
/** drifting dust / mist bands */
function mist(v0, v1, t, { n = 7, a = 0.13, col = '235,190,120', sp = 25, seed = 0 } = {}) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const rx = IW * (0.35 + rnd(seed + i) * 0.4), ry = (Y(v1) - Y(v0)) * (0.35 + rnd(seed + i * 2) * 0.4);
    const x = ((rnd(seed + i * 7) * IW * 1.6 + t * sp * (0.6 + rnd(i) * 0.8)) % (IW * 1.6)) - IW * 0.3, y = Y(v0) + rnd(seed + i * 9) * (Y(v1) - Y(v0));
    ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
/** a few birds gliding across the sky band */
function birds(v0, v1, t, n = 5, seed = 0) {
  ctx.save(); ctx.strokeStyle = 'rgba(40,22,10,0.75)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const sp = 70 + rnd(seed + i) * 60, x = ((rnd(seed + i * 3) * IW + t * sp) % (IW * 1.3)) - IW * 0.15, y = Y(v0) + rnd(seed + i * 5) * (Y(v1) - Y(v0)) + Math.sin(t * 0.8 + i) * 12;
    const s = 16 + rnd(seed + i * 7) * 12, fl = Math.sin(t * 7 + i * 2) * 0.6;
    ctx.beginPath(); ctx.moveTo(x - s, y - s * fl * 0.6); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.3, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.3, x + s, y - s * fl * 0.6); ctx.stroke();
  }
  ctx.restore();
}
/** a soft shaft of light that breathes */
function beam(u, v, w, h, t, a = 0.12, rot = 0) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(X(u), Y(v)); ctx.rotate(rot);
  const g = ctx.createLinearGradient(-w * IW / 2, 0, w * IW / 2, 0), b = a * (0.7 + 0.3 * Math.sin(t * 0.9));
  g.addColorStop(0, 'rgba(255,214,140,0)'); g.addColorStop(0.5, `rgba(255,214,140,${b})`); g.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = g; ctx.fillRect(-w * IW / 2, 0, w * IW, h * IH); ctx.restore();
}

// ---- per-scene choreography (coordinates measured on the supplied 1536x2720 paintings) ----
const SCENES = {
  manuscript(im, t) {
    smoke(0.715, 0.40, t, { n: 8, rise: 620, size: 34, a: 0.16, seed: 3, drift: -60 });
    flame(0.913, 0.468, 26, t, 1); flame(0.497, 0.317, 10, t, 4);
    beam(0.70, -0.05, 0.16, 0.6, t, 0.09, 0.35);
    embers(0.52, 0.44, t, 22, 380, 420, 9);
  },
  field(im, t) {
    birds(0.12, 0.28, t, 5, 2);
    mist(0.40, 0.53, t, { n: 8, a: 0.16, col: '255,220,170', sp: 30, seed: 4 });
    smoke(0.43, 0.52, t, { n: 10, rise: 820, size: 40, a: 0.13, seed: 5, drift: 40 });
    flame(0.43, 0.545, 40, t, 2); embers(0.43, 0.535, t, 22, 70, 640, 7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0.515, 0.34, 260, '255,200,110', 0.14 + 0.05 * Math.sin(t * 0.8)); ctx.restore();
  },
  armies(im, t) {
    wave(im, t, 0.03, 0.15, 0.31, 0.27, { pole: 'left', amp: 0.007, k: 8, sp: 3.2 });
    wave(im, t, 0.84, 0.16, 1.0, 0.28, { pole: 'left', amp: 0.007, k: 8, sp: 3.0, ph: 1 });
    mist(0.50, 0.75, t, { n: 9, a: 0.16, col: '230,180,110', sp: 45, seed: 8 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0.51, 0.315, 230, '255,210,120', 0.18 + 0.05 * Math.sin(t)); ctx.restore();
    embers(0.5, 0.75, t, 26, 1300, 700, 11);
  },
  banners(im, t) {
    wave(im, t, 0.0, 0.17, 0.355, 0.52, { pole: 'right', amp: 0.01, k: 7, sp: 2.6 });
    wave(im, t, 0.645, 0.18, 1.0, 0.51, { pole: 'left', amp: 0.01, k: 7, sp: 2.4, ph: 0.8 });
    beam(0.5, 0.08, 0.06, 0.72, t, 0.18);
    mist(0.6, 0.72, t, { n: 8, a: 0.15, col: '230,185,120', sp: 35, seed: 12 });
  },
  banners2(im, t) {
    wave(im, t, 0.03, 0.10, 0.46, 0.55, { pole: 'left', amp: 0.008, k: 7, sp: 2.8 });
    wave(im, t, 0.70, 0.12, 1.0, 0.56, { pole: 'right', amp: 0.008, k: 7, sp: 2.6, ph: 1.2 });
    birds(0.18, 0.36, t, 4, 6);
    mist(0.64, 0.76, t, { n: 8, a: 0.17, col: '240,170,100', sp: 30, seed: 14 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0.52, 0.585, 200, '255,200,110', 0.2 + 0.06 * Math.sin(t * 1.1)); ctx.restore();
  },
  throne(im, t) {
    [[0.235, 0.115], [0.37, 0.205], [0.55, 0.27], [0.735, 0.305]].forEach(([u, v], i) => flame(u, v, 14, t, i * 2));
    beam(0.86, 0.12, 0.10, 0.6, t, 0.12, 0.5); beam(0.95, 0.08, 0.07, 0.6, t + 2, 0.1, 0.48);
    embers(0.6, 0.6, t, 20, 700, 500, 21);
  },
  king(im, t) {
    flame(0.055, 0.29, 16, t, 3); flame(0.965, 0.33, 16, t, 5);
    smoke(0.03, 0.3, t, { n: 6, rise: 500, size: 30, a: 0.1, seed: 31 }); smoke(0.97, 0.33, t, { n: 6, rise: 500, size: 30, a: 0.1, seed: 33 });
  },
  portrait(im, t) {
    flame(0.89, 0.245, 18, t, 7); flame(0.725, 0.295, 12, t, 9); flame(0.03, 0.4, 10, t, 11);
    smoke(0.07, 0.33, t, { n: 7, rise: 520, size: 30, a: 0.12, seed: 41 });
  },
  lotus(im, t) {
    water(im, t, 0.37, 1.0, { amp: 0.0035 });
    mist(0.31, 0.38, t, { n: 7, a: 0.2, col: '255,225,190', sp: 18, seed: 51 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0.5, 0.195, 340, '255,235,170', 0.16 + 0.08 * Math.sin(t * 1.4)); ctx.restore();
    embers(0.5, 0.6, t, 16, 600, 500, 55);
  },
  chariot(im, t) {
    wave(im, t, 0.40, 0.07, 0.84, 0.31, { pole: 'left', amp: 0.009, k: 7, sp: 2.6 });
    mist(0.62, 0.95, t, { n: 10, a: 0.18, col: '235,185,110', sp: 60, seed: 61 }); embers(0.5, 0.9, t, 22, 1300, 600, 63);
  },
  arjuna_despair(im, t) {
    wave(im, t, 0.12, 0.0, 0.55, 0.27, { pole: 'left', amp: 0.008, k: 6, sp: 2.2 });
    smoke(0.3, 0.3, t, { n: 7, rise: 500, size: 60, a: 0.08, seed: 71, drift: 80 }); mist(0.28, 0.45, t, { n: 6, a: 0.12, seed: 72 });
  },
  krishna(im, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0.5, 0.2, 420, '255,215,140', 0.14 + 0.06 * Math.sin(t * 1.2)); ctx.restore(); mist(0.25, 0.6, t, { n: 6, a: 0.1, seed: 81 }); embers(0.5, 0.7, t, 14, 900, 600, 83); },
  arjuna(im, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0.76, 0.3, 260, '255,200,110', 0.16 + 0.05 * Math.sin(t)); ctx.restore(); mist(0.45, 0.8, t, { n: 7, a: 0.12, seed: 91 }); },
  karna(im, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0.47, 0.21, 420, '255,190,90', 0.2 + 0.08 * Math.sin(t * 0.9)); ctx.restore(); embers(0.5, 0.8, t, 18, 1200, 700, 101); },
  bhishma(im, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0.94, 0.37, 300, '255,210,120', 0.2 + 0.06 * Math.sin(t)); ctx.restore(); mist(0.75, 1.0, t, { n: 8, a: 0.16, col: '240,190,110', seed: 111, sp: 40 }); },
  duryodhana(im, t) { wave(im, t, 0.08, 0.02, 0.45, 0.25, { pole: 'left', amp: 0.007, k: 6, sp: 2.4 }); mist(0.6, 0.85, t, { n: 7, a: 0.12, seed: 121 }); },
  drona(im, t) { wave(im, t, 0.02, 0.03, 0.25, 0.12, { pole: 'left', amp: 0.006, k: 6, sp: 2.4 }); smoke(0.3, 0.4, t, { n: 5, rise: 400, size: 40, a: 0.06, seed: 131 }); mist(0.5, 0.75, t, { n: 6, a: 0.1, seed: 132 }); },
  bhima(im, t) { wave(im, t, 0.83, 0.12, 1.0, 0.24, { pole: 'left', amp: 0.006, k: 6, sp: 2.6 }); mist(0.7, 0.95, t, { n: 8, a: 0.15, seed: 141, sp: 45 }); },
  yudhishthira(im, t) { wave(im, t, 0.0, 0.07, 0.38, 0.22, { pole: 'right', amp: 0.006, k: 6, sp: 2.4 }); mist(0.6, 0.9, t, { n: 6, a: 0.1, seed: 151 }); },
};
export function sceneFX(k, im, t) {
  if (!im) return; IW = im.width; IH = im.height;
  const f = SCENES[k]; if (f) return f(im, t);
  mist(0.6, 0.9, t, { n: 7, a: 0.12, seed: 7 }); embers(0.5, 0.85, t, 14, 1100, 600, 3);   // any new picture: drifting dust + embers
}
