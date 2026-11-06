#!/usr/bin/env python3
"""
scripts/feasibility_gnani.py
Feasibility test script for Gnani STT API (REST endpoint).
Transcribes a short Hinglish audio sample using GNANI_API_KEY from .env / environment,
and saves the raw JSON response to docs/gnani_feasibility_response.json.

Usage:
    python scripts/feasibility_gnani.py [path_to_audio_file]
If no audio file is provided, it looks for sample_hinglish.wav or synthesizes a 3s test tone via python wave.
"""

import os
import sys
import json
import wave
import struct
import math
from pathlib import Path

# Try loading .env if python-dotenv is present, otherwise parse manually
def load_env_file(filepath: Path):
    if not filepath.exists():
        return
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            if k not in os.environ:
                os.environ[k] = v

# Load from backend/.env or root .env
load_env_file(Path(".env"))
load_env_file(Path("backend/.env"))

GNANI_API_KEY = os.getenv("GNANI_API_KEY") or os.getenv("GNANI_API_KEY_ID")

def create_dummy_wav(path: Path, duration_sec: float = 3.0):
    """Creates a basic PCM 16kHz mono WAV file if no test audio is supplied."""
    sample_rate = 16000
    num_samples = int(sample_rate * duration_sec)
    with wave.open(str(path), "w") as wav_file:
        wav_file.setnchannels(1)  # mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        # 440Hz sine wave beep
        for i in range(num_samples):
            value = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
            data = struct.pack("<h", value)
            wav_file.writeframesraw(data)

def main():
    if not GNANI_API_KEY:
        print("[ERROR] GNANI_API_KEY is not set in environment or .env file.")
        print("Please add GNANI_API_KEY=your_key to .env or export it in your shell.")
        sys.exit(1)

    # Determine audio file to test
    if len(sys.argv) > 1:
        audio_path = Path(sys.argv[1])
    else:
        sample_candidates = [
            Path("sample_hinglish.wav"),
            Path("sample_hinglish.mp3"),
            Path("scripts/sample_hinglish.wav"),
            Path("scripts/sample.wav")
        ]
        audio_path = next((p for p in sample_candidates if p.exists()), None)
        if not audio_path:
            audio_path = Path("scripts/temp_sample.wav")
            print(f"[INFO] No Hinglish sample found. Generating dummy test tone: {audio_path}")
            print("[NOTE] For genuine transcription, please supply a real Hinglish audio clip:")
            print(f"       python scripts/feasibility_gnani.py <path_to_audio.wav>")
            create_dummy_wav(audio_path, duration_sec=3.0)

    print(f"[INFO] Using audio file: {audio_path} (size: {audio_path.stat().st_size} bytes)")

    # Prepare multipart request
    # Using urllib.request to avoid external dependency issues if requests is not installed
    import urllib.request
    import uuid

    url = "https://api.vachana.ai/stt/v3"
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    
    # Form fields:
    # model: prisma-v3.0
    # language_code: hi-IN,en-IN
    # format: codemix
    form_fields = {
        "model": "prisma-v3.0",
        "language_code": "hi-IN,en-IN",
        "format": "codemix"
    }

    body = bytearray()
    for field_name, val in form_fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{field_name}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{val}\r\n".encode("utf-8"))

    # File field
    filename = audio_path.name
    # determine content type
    ext = audio_path.suffix.lower()
    content_type_map = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".flac": "audio/flac",
        ".ogg": "audio/ogg"
    }
    file_content_type = content_type_map.get(ext, "application/octet-stream")

    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="audio_file"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(f"Content-Type: {file_content_type}\r\n\r\n".encode("utf-8"))
    with open(audio_path, "rb") as f:
        body.extend(f.read())
    body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    headers = {
        "X-API-Key-ID": GNANI_API_KEY,
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Accept": "application/json",
        "User-Agent": "BanoAI-Backend/1.0 (python-urllib)"
    }

    req = urllib.request.Request(url, data=bytes(body), headers=headers, method="POST")

    print(f"[INFO] Sending POST request to {url} with model=prisma-v3.0, language_code=hi-IN,en-IN, format=codemix ...")

    output_file = Path("docs/gnani_feasibility_response.json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_code = resp.getcode()
            resp_data = resp.read().decode("utf-8")
            parsed_json = json.loads(resp_data)

            print(f"[SUCCESS] Received HTTP {resp_code}")
            print(f"[RESULT] Transcript: {parsed_json.get('transcript')}")
            print(f"[RESULT] Model: {parsed_json.get('model')}")
            print(f"[RESULT] Detected Language: {parsed_json.get('detected_language_code')}")

            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, "w", encoding="utf-8") as out:
                json.dump(parsed_json, out, indent=2, ensure_ascii=False)
            print(f"[SAVED] Raw JSON response saved to {output_file}")

    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[HTTP ERROR] Code: {e.code}, Reason: {e.reason}")
        print(f"[HTTP BODY] {err_msg}")
        err_obj = {
            "error_code": e.code,
            "reason": e.reason,
            "body": err_msg
        }
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as out:
            json.dump(err_obj, out, indent=2)
        print(f"[SAVED] Error output saved to {output_file}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

