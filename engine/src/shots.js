// GENERIC GITA SHORT: every shot comes from script.json, so a new verse needs only a new script (see PLAYBOOK.md).
//   intro (peacock feather reveals verse_dev + verse_en) -> one painted shot per script line -> lotus outro.
// Per line:  scene  (cast picture key, e.g. "duryodhana")      scene2 + xf ("word")  crossfade to a 2nd picture at that word
//            pada   (0-3: show the Sanskrit verse building up)  gold [{ t, at, y, size, x, font: "dev"|"en" }]  overlay text at a word
//            tag    ("MEANING")                                 plate [y0, y1]  dark band behind overlays
//            kb     ({ z:[a,b], x:[a,b], y:[a,b] } Ken Burns, optional)   cut: false  (stay on the previous shot)
import { T, L, Wd } from './core/timing.js';
import { paint, scrim, motes, gold, ramp, plate } from './painted.js';
import { introDraw, flash, INTRO, setVerse } from './peacock.js';

const DEV = '"Noto Serif Devanagari", Caladea';
const KB = [{ z: [1.06, 1.22], y: [-0.3, 0.2] }, { z: [1.1, 1.24], x: [0.3, -0.3] }, { z: [1.06, 1.22], x: [-0.25, 0.25] }, { z: [1.08, 1.3], y: [0.1, -0.1] },
  { z: [1.22, 1.08], x: [-0.2, 0.25], y: [0.1, -0.15] }, { z: [1.12, 1.28], x: [0.25, -0.25], y: [-0.1, 0.1] }];

export function buildShots(script) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  if (Math.abs(T.offset - INTRO) > 0.01) throw new Error(`intro is ${INTRO}s but the narration is offset by ${T.offset}s: run python3 tools/offset.py ${INTRO}`);
  setVerse(script.verse_dev, script.verse_en);
  const lines = script.lines, wd = (w, i) => { try { return Wd(w, i); } catch (e) { console.error(String(e)); return L(i); } };

  add({ id: 'S00', at: 0, cam: [540, 960], zoom: 0.03, note: 'intro: feather reveals the verse', draw(lt) { introDraw(lt); flash((lt - (INTRO - 0.2)) / 0.18); } });
  cue(0.15, 'slide', { dur: 2.6, gain: 0.55 }); cue(1.0, 'sparkle', { dur: 1.8, gain: 0.35 }); cue(2.6, 'sparkle', { dur: 1.2, gain: 0.3 });

  let cur = null, n = 0;
  lines.forEach((ln, i) => {
    const st = i === 0 ? INTRO : L(i) - 0.08;
    if (ln.cut === false && cur) { cur.extra.push({ i, ln }); return; }
    const k = ln.scene || (cur && cur.k) || 'field', kb = ln.kb || KB[n++ % KB.length], k2 = ln.scene2 || null, xf = k2 && ln.xf ? wd(ln.xf, i) - st : 0;
    const items = [{ i, ln }], first = i === 0, last = i === lines.length - 1;
    cur = add({ id: 'S' + String(S.length).padStart(2, '0'), at: st, cam: [540, 960], zoom: 0, k, extra: items, note: `${k}${k2 ? ' -> ' + k2 : ''}: ${ln.text.slice(0, 40)}`,
      draw(lt, d, t) {
        paint(k, lt / d, kb); if (k2) paint(k2, lt / d, { z: [1.2, 1.1] }, ramp(lt, xf - 0.1, 0.5));
        scrim(0.35, 0.7); motes(t);
        for (const { i: j, ln: l } of items) {
          const o = (j === 0 ? INTRO : L(j) - 0.08) - st;
          if (l.plate) plate(l.plate[0], l.plate[1], l.plate[2] ?? 0.5);
          if (l.tag) gold(l.tag, 540, 190, 56, { font: 'Caladea', a: Math.min(ramp(lt, o + 0.1, 0.4), 1 - ramp(lt, o + 1.6, 0.4)), fit: 800, rise: 20 });
          if (l.pada != null) {                                   // Sanskrit verse building up, one pada per line
            const pv = script.verse_dev || [], a0 = L(j) - st;
            plate(980, 1100 + 118 * pv.length, 0.5);
            for (let p = 0; p <= l.pada && p < pv.length; p++) gold(pv[p], 540, 1090 + p * 118, 92, { font: DEV, a: p === l.pada ? ramp(lt, Math.max(0, a0 - 0.05), 0.5) : 0.62, fit: 880, rise: p === l.pada ? 22 : 0 });
          }
          for (const g of l.gold || []) {
            const at = g.at ? wd(g.at, j) - st : (j === 0 ? 0.3 : L(j) - st);
            gold(g.t, g.x ?? 540, g.y ?? 1190, g.size ?? 110, { font: g.font === 'en' ? 'Caladea' : DEV, a: ramp(lt, at - 0.05, 0.45), fit: g.fit ?? 900, rise: 24 });
          }
        }
        if (first) flash(1 - ramp(lt, 0, 0.4));
      } });
    cue(st, 'whoosh', { gain: 0.5 });
  });
  // sound cues on overlays and padas
  lines.forEach((ln, i) => {
    if (ln.pada != null) cue(L(i), 'sparkle', { dur: 0.7, gain: 0.3 });
    for (const g of ln.gold || []) cue(g.at ? wd(g.at, i) : L(i), 'pop', { gain: 0.5 });
    if (ln.xf) cue(wd(ln.xf, i), 'thud', { gain: 0.45 });
  });
  return { shots: S, cues: CUES };
}
