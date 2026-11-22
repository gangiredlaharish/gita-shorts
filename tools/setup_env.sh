#!/bin/bash
# One-time setup for a fresh workspace: Python voice env (Kokoro, free/local) + model files. Safe to re-run.
set -e
FH="$HOME/.faceless-shorts"; VENV="$FH/venv"; mkdir -p "$FH"
if [ ! -x "$VENV/bin/python" ]; then (command -v uv >/dev/null && uv venv --python 3.11 "$VENV") || python3 -m venv "$VENV"; fi
PY="$VENV/bin/python"
if ! "$PY" -c "import numpy, scipy, kokoro_onnx, faster_whisper" 2>/dev/null; then
  (command -v uv >/dev/null && uv pip install --python "$PY" -q numpy scipy kokoro-onnx faster-whisper) || ("$PY" -m pip install -q numpy scipy kokoro-onnx faster-whisper)
fi
"$PY" "$(dirname "$0")/../engine/tools/voice_ph.py" --download
# Pre-download the multilingual Whisper model used for real word-level caption timing (tools/words_hi.py).
# Needs huggingface.co reachable (Settings > Capabilities on claude.ai) — if it's blocked, this is skipped
# and words_hi.py falls back to spreading words evenly inside each line's known duration, which still works,
# just without true audio-aligned timing.
"$PY" -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8'); print('Whisper small model cached OK')" \
  || echo "Whisper model could not download (huggingface.co likely blocked) — word timing will use the fallback spread instead"
python3 -c "import numpy, scipy" 2>/dev/null || pip install --break-system-packages -q numpy scipy pillow
command -v ffmpeg >/dev/null && node -v && echo "env OK"
