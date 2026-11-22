#!/bin/bash
# Build one verse video:  tools/make_verse.sh 1.2      (needs verses/1.2/script.json; see PLAYBOOK.md)
# Output: build/<v>/renders/gita-<v>.mp4 (full quality), gita-<v>-small.mp4 (< 9.5 MB) and gita-<v>-cover.jpg
set -e
V="$1"; R="$(cd "$(dirname "$0")/.." && pwd)"; B="$R/build/$V"; PY="$HOME/.faceless-shorts/venv/bin/python"; export SOFTWARE_GL=1
[ -f "$R/verses/$V/script.json" ] || { echo "missing verses/$V/script.json"; exit 1; }
rm -rf "$B"; mkdir -p "$B"; cp -r "$R/engine/." "$B/"; ln -s "$R/cast" "$B/img"; cp "$R/verses/$V/script.json" "$B/script.json"
cd "$B"
"$PY" tools/voice_ph.py . | tail -2
"$PY" tools/words_hi.py . | tail -1
mkdir -p data/orig && cp data/narration.wav data/lines.json data/words.json data/orig/
INTRO=$(grep -o "CLEAR = [0-9.]*" src/peacock.js | head -1 | awk "{print \$3}")
python3 tools/offset.py $(python3 -c "print(round($INTRO + 4.0 + 0.2, 3))")
node tools/capture.mjs check | grep -E "duration|CHECK|ERROR|missing" 
node tools/capture.mjs cues && python3 tools/mix.py .
node tools/capture.mjs sheet review/all.jpg 1.5 10 >/dev/null
node tools/capture.mjs video "renders/gita-$V.mp4" | tail -c 160; echo
QS='&nocap=1' node tools/capture.mjs frames review/cover "$(python3 -c "import json;l=json.load(open('data/lines.json'))['lines'];print(round(l[1]['end']+0.3,2))")" >/dev/null
cp review/cover/*.jpg "renders/gita-$V-cover.jpg"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "renders/gita-$V.mp4"); BR=$(python3 -c "print(int(9.0*8*1024/$DUR - 128))")
ffmpeg -v error -y -i "renders/gita-$V.mp4" -c:v libx264 -preset slow -b:v ${BR}k -pass 1 -an -f mp4 /dev/null
ffmpeg -v error -y -i "renders/gita-$V.mp4" -c:v libx264 -preset slow -b:v ${BR}k -maxrate $((BR*2))k -bufsize $((BR*2))k -pass 2 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "renders/gita-$V-small.mp4"
rm -f ffmpeg2pass*; ls -la renders
