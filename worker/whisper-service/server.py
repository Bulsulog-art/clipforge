"""
faster-whisper FastAPI service.

Drop-in replacement for OpenAI's Whisper API used in worker/src/steps/transcribe.ts.
Same wire shape: multipart file upload, returns verbose JSON with word timestamps.

Cost benefit (vs OpenAI Whisper-1 @ $0.006/min):
  • 30-min podcast: $0.18 → $0 marginal (just server cycles)
  • 100 podcasts/month: $18 saved
  • At scale (1000 jobs): $180/mo saved
  • Single VPS or droplet cost ($15-30/mo) → break-even at ~3000 mins/month transcribed

Model choice:
  • Default WHISPER_MODEL_SIZE = "small" (multilingual, 500MB, fits 4 CPU / 8GB worker)
  • Override via env: tiny|base|small|medium|large-v3|large-v3-turbo
  • compute_type="int8" → 4x CPU speedup vs float32, negligible quality drop

Why faster-whisper over openai-whisper:
  • ctranslate2 backend, 4x faster on CPU
  • Same word-level timestamps API surface
  • Less RAM (int8 quantization)
"""
import io
import logging
import os
import tempfile
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("whisper-service")

# Boot-time singleton — model load is ~5-10s, do it once.
MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "small")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")  # "cuda" if GPU available
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

logger.info("loading whisper model=%s device=%s compute=%s", MODEL_SIZE, DEVICE, COMPUTE_TYPE)
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
logger.info("whisper model ready")

app = FastAPI(title="clipforge-whisper", version="1.0")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": MODEL_SIZE, "device": DEVICE, "compute_type": COMPUTE_TYPE}


@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form("en"),
    # OpenAI compatibility — accepted but ignored (we always emit verbose_json with words)
    model: Optional[str] = Form(None),  # noqa: ARG001  - kept for API parity
    response_format: Optional[str] = Form("verbose_json"),  # noqa: ARG001
    timestamp_granularities: Optional[str] = Form(None),  # noqa: ARG001
) -> JSONResponse:
    """
    Transcribe audio. Returns a JSON shape compatible with the OpenAI verbose_json
    response used by `worker/src/steps/transcribe.ts`:
        {
          "language": "en",
          "text": "full text",
          "words":    [{"word": "Hi", "start": 0.0, "end": 0.31}, ...],
          "segments": [{"start": ..., "end": ..., "text": ...}, ...]
        }
    """
    # Read upload into a temp file. faster-whisper accepts file path or bytes — we
    # use the path form because the underlying ffmpeg call streams better that way.
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty audio body")

    # NamedTemporaryFile gives us a real fd we can close + reopen cross-platform.
    suffix = os.path.splitext(file.filename or "")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        # Force language to None if "auto" was passed; otherwise pass through.
        lang_arg = None if language in (None, "", "auto") else language

        segments_iter, info = model.transcribe(
            tmp_path,
            language=lang_arg,
            word_timestamps=True,
            vad_filter=True,  # cuts silence, lower cost per minute
            beam_size=5,
        )

        # faster-whisper yields lazily; iterate once.
        words = []
        segments = []
        text_parts = []
        for seg in segments_iter:
            segments.append({"start": float(seg.start), "end": float(seg.end), "text": seg.text})
            text_parts.append(seg.text)
            if seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word.strip(),
                        "start": float(w.start),
                        "end": float(w.end),
                    })

        payload = {
            "language": info.language,
            "text": "".join(text_parts).strip(),
            "words": words,
            "segments": segments,
        }
        logger.info(
            "transcribed file=%s lang=%s words=%d segments=%d duration=%.1fs",
            file.filename, info.language, len(words), len(segments), info.duration,
        )
        return JSONResponse(payload)
    finally:
        # Best-effort cleanup; in containers /tmp is wiped on restart anyway.
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
