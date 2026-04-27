import base64
import json
import os
import sys
import tempfile
import traceback
import numpy as np
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from subprocess import run

import imageio_ffmpeg
import whisper
import whisper.audio as whisper_audio
import whisper.transcribe as whisper_transcribe

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / "backend" / ".env"


def load_env_file(env_path: Path):
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env_file(ENV_PATH)

HOST = os.getenv("WHISPER_SERVICE_HOST", "127.0.0.1")
PORT = int(os.getenv("WHISPER_SERVICE_PORT", "8765"))
FFMPEG_DIR = os.getenv("WHISPER_FFMPEG_DIR", "")
FFMPEG_EXE = os.getenv("WHISPER_FFMPEG_EXE", "")

if not FFMPEG_EXE:
    try:
        FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        FFMPEG_EXE = ""

if not FFMPEG_DIR and FFMPEG_EXE:
    FFMPEG_DIR = str(Path(FFMPEG_EXE).parent)

if FFMPEG_DIR:
    os.environ["PATH"] = FFMPEG_DIR + os.pathsep + os.environ.get("PATH", "")

if FFMPEG_EXE:
    os.environ["IMAGEIO_FFMPEG_EXE"] = FFMPEG_EXE


def load_audio_with_explicit_ffmpeg(file: str, sr: int = whisper_audio.SAMPLE_RATE):
    cmd = [
        FFMPEG_EXE or "ffmpeg",
        "-nostdin",
        "-threads",
        "0",
        "-i",
        file,
        "-f",
        "s16le",
        "-ac",
        "1",
        "-acodec",
        "pcm_s16le",
        "-ar",
        str(sr),
        "-",
    ]
    out = run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0


whisper_audio.load_audio = load_audio_with_explicit_ffmpeg
whisper_transcribe.load_audio = load_audio_with_explicit_ffmpeg

MODELS = {}


def get_model(model_name: str):
    normalized = model_name or os.getenv("WHISPER_MODEL", "base")
    if normalized not in MODELS:
      MODELS[normalized] = whisper.load_model(normalized)
    return MODELS[normalized]


class WhisperHandler(BaseHTTPRequestHandler):
    server_version = "WhisperHTTP/1.0"

    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {
                "ok": True,
                "ffmpeg_dir": FFMPEG_DIR,
                "ffmpeg_exe": FFMPEG_EXE,
            })
            return
        self._send_json(404, {"ok": False, "message": "Not found"})

    def do_POST(self):
        if self.path != "/transcribe":
            self._send_json(404, {"ok": False, "message": "Not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_length)
            payload = json.loads(raw.decode("utf-8"))

            audio_base64 = payload.get("audioBase64")
            if not audio_base64:
                self._send_json(400, {"ok": False, "message": "audioBase64 is required"})
                return

            file_name = payload.get("fileName") or "audio.webm"
            suffix = Path(file_name).suffix or ".webm"
            model_name = payload.get("model") or os.getenv("WHISPER_MODEL", "base")
            language = payload.get("language") or os.getenv("WHISPER_LANGUAGE", "Nepali")

            with tempfile.TemporaryDirectory(prefix="whisper-http-") as temp_dir:
                audio_path = Path(temp_dir) / f"input{suffix}"
                audio_path.write_bytes(base64.b64decode(audio_base64))

                model = get_model(model_name)
                result = model.transcribe(
                    str(audio_path),
                    language=language,
                    task="transcribe",
                    fp16=False,
                    verbose=False,
                )

            self._send_json(200, {
                "ok": True,
                "text": (result.get("text") or "").strip(),
            })
        except Exception as exc:
            traceback.print_exc()
            sys.stdout.flush()
            self._send_json(500, {
                "ok": False,
                "message": str(exc),
                "traceback": traceback.format_exc(limit=3),
                "ffmpeg_dir": FFMPEG_DIR,
                "ffmpeg_exe": FFMPEG_EXE,
            })

    def log_message(self, format, *args):
        sys.stdout.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), format % args))
        sys.stdout.flush()


if __name__ == "__main__":
    print(f"Whisper HTTP service listening on http://{HOST}:{PORT}", flush=True)
    server = ThreadingHTTPServer((HOST, PORT), WhisperHandler)
    server.serve_forever()
