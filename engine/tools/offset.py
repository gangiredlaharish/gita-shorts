"""Shift the narration clock by INTRO seconds so a silent/music-only intro can play before the voice.
  python3 tools/offset.py 7.2     (always works from data/orig/*, so it is safe to re-run with a new value)
Writes data/lines.json (+offset field), data/words.json, data/narration.wav (silence in front)."""
import json, subprocess, sys
from pathlib import Path
P = Path(__file__).resolve().parent.parent; D = P / 'data'; O = D / 'orig'
off = float(sys.argv[1])
l = json.loads((O / 'lines.json').read_text()); w = json.loads((O / 'words.json').read_text())
l['duration'] = round(l['duration'] + off, 3); l['offset'] = off
for x in l['lines']: x['start'] = round(x['start'] + off, 3); x['end'] = round(x['end'] + off, 3)
for x in w: x['s'] = round(x['s'] + off, 3); x['e'] = round(x['e'] + off, 3)
(D / 'lines.json').write_text(json.dumps(l, ensure_ascii=False, indent=1)); (D / 'words.json').write_text(json.dumps(w, ensure_ascii=False, indent=1))
ms = int(round(off * 1000))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(O / 'narration.wav'), '-af', f'adelay={ms}:all=1', '-ar', '24000', '-ac', '1', str(D / 'narration.wav')], check=True)
print(f'offset {off}s applied: duration {l["duration"]}')
