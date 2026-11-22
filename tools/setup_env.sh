#!/bin/bash
# One-time setup for a fresh workspace: Python voice env (Kokoro, free/local) + model files. Safe to re-run.
set -e
FH="$HOME/.faceless-shorts"; VENV="$FH/venv"; mkdir -p "$FH"
if [ ! -x "$VENV/bin/python" ]; then (command -v uv >/dev/null && uv venv --python 3.11 "$VENV") || python3 -m venv "$VENV"; fi
PY="$VENV/bin/python"
if ! "$PY" -c "import numpy, scipy, kokoro_onnx" 2>/dev/null; then
  (command -v uv >/dev/null && uv pip install --python "$PY" -q numpy scipy kokoro-onnx) || ("$PY" -m pip install -q numpy scipy kokoro-onnx)
fi
"$PY" "$(dirname "$0")/../engine/tools/voice_ph.py" --download
python3 -c "import numpy, scipy" 2>/dev/null || pip install --break-system-packages -q numpy scipy pillow
command -v ffmpeg >/dev/null && node -v && echo "env OK"
