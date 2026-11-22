# Gita Shorts — Playbook

One engine (`engine/`), one shared cast (`cast/`), many verses (`verses/<chapter>.<verse>/script.json`).
To make a new verse's video, you only ever need to write a new `script.json` — never touch `engine/`.

## Build a verse

```bash
tools/make_verse.sh 1.2
```

Produces `build/1.2/renders/gita-1.2.mp4` (full quality), `gita-1.2-small.mp4` (<9.5MB, upload-ready),
and `gita-1.2-cover.jpg` (thumbnail).

First time on a fresh machine: `tools/setup_env.sh` once.

## script.json schema

Top level:
- `title` — internal label
- `chapter`, `verse` — numbers
- `verse_dev` — array of Devanagari lines (padas) of the Sanskrit shloka
- `verse_en` — array of transliteration lines (same length as verse_dev)
- `voice` — kokoro voice id (`hm_omega` = male, chosen voice for this channel), `speed` (e.g. 0.92)
- `music` — `"flute"` for the procedural bansuri+tanpura+tabla bed
- `youtube.title` — the YouTube title to publish with
- `lines[]` — the narration, one object per spoken line (see below)

Each line in `lines[]`:
- `text` — what's shown as caption/subtitle (Hindi, or Hindi+Devanagari as needed)
- `say` — optional override of what's spoken if different from `text` (supports `{Devanagari}` segments phonemized as Hindi, `<raw ipa>` tags)
- `scene` — cast picture key to show (filename stem in `cast/`, e.g. `duryodhana`, `chariot`, `field`). Omit to keep the previous line's scene.
- `scene2` + `xf` — crossfade to a second picture at the word given in `xf` (word must appear in `text`)
- `pada` — 0-3: reveals that pada (line) of `verse_dev` building up on screen, big Sanskrit text
- `tag` — short banner text (e.g. `"MEANING"`) shown at the top
- `plate` — `[y0, y1, opacity?]` dark readability band behind overlay text
- `gold[]` — overlay text beats: `{ t, at (word to trigger on), y, size, x, font: "dev"|"en", fit }`
- `kb` — custom Ken Burns `{ z:[a,b], x:[a,b], y:[a,b] }` (optional; otherwise cycles through presets)
- `cut: false` — keep narrating over the *same* shot as the previous line (stack another overlay beat) instead of cutting to a new shot

## Cast

`cast/` holds the shared character + scene library (one picture per key, `<key>.jpg`):
`krishna, arjuna, arjuna_despair, duryodhana, drona, bhishma, karna, bhima, yudhishthira, chariot,
manuscript, throne, field, armies, banners, banners2, portrait, lotus, king, feather`.

Chapter 1 character map (who should be `scene` for which verses):
- 1.1 — `king` (Dhritarashtra) / `manuscript`
- 1.2–1.11 — `duryodhana` speaking to `drona`; named warriors (`bhima`, `arjuna`, `karna`, `bhishma`, `yudhishthira`) as mentioned
- 1.12–1.19 — conches: `bhishma`, `krishna`, `arjuna`, `bhima`, `yudhishthira`
- 1.20–1.27 — `chariot` (Krishna & Arjuna between the armies)
- 1.28–1.47 — `arjuna_despair`

Any scene key not in this list still gets a sensible default drifting-mist-and-embers animation
(see `sceneFX()`'s fallback in `engine/src/fx.js`), so a brand-new picture never breaks the build —
but a bespoke choreography (cloth wave, glow, smoke) looks better; add one in `fx.js` if it's reused often.

## Gotcha: caption chunks vs. spoken words

Each `caps` chunk (split by `|`) must map to at least one spoken word in that line. If a line's Sanskrit/English
phrase collapses into fewer spoken tokens than you gave `caps` chunks (e.g. a compound word like
"Acharyamupasangamya" is ONE spoken token even if you write it as two English words), the build throws
`Cannot read properties of undefined (reading 's')` in `captions.js`. Fix: count words in `data/words.json`
for that line (`python3 -c "import json; w=json.load(open('data/words.json')); ..."` after `voice_ph.py`/`words_hi.py`
have run) and make sure `caps` has no more `|`-separated chunks than there are spoken words.

## Known constants

- Feather intro length: `peacock.js`'s `CLEAR (3.1s) + HOLD (4.0s) + 0.2s flash` = **7.3s**. The build script
  reads `CLEAR` from `src/peacock.js` directly; if you ever change `HOLD` or the flash padding in `peacock.js`,
  update the `+ 4.0 + 0.2` in `tools/make_verse.sh` to match.
- Feather variant: `FEATHER_VARIANT = 'A'` in `peacock.js` (sweeps across, exits) — this is what shipped in 1.1.
  Variants `'B'` (settles upright) and `'C'` (rests leaning right) exist if a different motion is ever wanted.

## Publishing

1. Build with `tools/make_verse.sh <verse>`.
2. Upload `renders/gita-<verse>-small.mp4` + `renders/gita-<verse>-cover.jpg` to the user's Google Drive
   "Bhagavad Gita" folder (manual upload by the user if the Drive connector's size limit blocks it — it's
   ~3MB per call, well under typical video size).
3. Find the uploaded files via Zapier `GoogleDriveCLIAPI` → `google_drive_find_a_file`, use the hydrated
   `file` URL as the `video`/`thumbnail` params on `YouTubeV4CLIAPI` → `upload_video`
   (category_id "27" = Education, language hi, public).
4. Log it in `_published.md`.
