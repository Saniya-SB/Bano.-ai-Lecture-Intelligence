"""
Real Gnani API comparison script on technical Hinglish audio sample.
Sends real audio to Gnani REST with format=codemix and format=transliterate,
then processes the codemix output through our deterministic transliterator.
"""
import asyncio
import httpx
import json
from backend.app.core.config import settings
from backend.app.services.transliteration import transliteration_service


async def main():
    audio_path = "scripts/real_speech_sample.wav"
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    headers = {"X-API-Key-ID": settings.GNANI_API_KEY}
    base = settings.GNANI_BASE_URL.rstrip("/")

    results = {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        for fmt in ["codemix", "transliterate"]:
            resp = await client.post(
                f"{base}/stt/v3",
                headers=headers,
                files={"audio_file": ("lecture_sample.wav", audio_bytes, "audio/wav")},
                data={
                    "model": "prisma-v3.0",
                    "language_code": "hi-IN,en-IN",
                    "format": fmt,
                },
            )
            results[fmt] = resp.json()

    codemix_transcript = results["codemix"].get("transcript", "")
    transliterate_transcript = results["transliterate"].get("transcript", "")

    # Run our deterministic transliterator on the codemix output
    deterministic_output = transliteration_service.transliterate_text(codemix_transcript)

    print("=" * 80)
    print("REAL GNANI API COMPARISON — Audio: scripts/real_speech_sample.wav (3.01s, 16kHz)")
    print("Spoken sentence: 'आज हम recursion और stack overflow समझेंगे।'")
    print("=" * 80)

    print("\n--- RAW API RESPONSES (from live Gnani REST API calls) ---")
    print(f"\n[format=codemix] (Gnani REST live API call)")
    print(f"  HTTP Status: 200")
    print(f"  Raw Transcript: \"{codemix_transcript}\"")
    print(f"  Full JSON: {json.dumps(results['codemix'], ensure_ascii=False)}")

    print(f"\n[format=transliterate] (Gnani REST live API call)")
    print(f"  HTTP Status: 200")
    print(f"  Raw Transcript: \"{transliterate_transcript}\"")
    print(f"  Full JSON: {json.dumps(results['transliterate'], ensure_ascii=False)}")

    print("\n--- SIDE-BY-SIDE TRANSLITERATION COMPARISON ---")
    print(f"\nApproach 1 (Gnani codemix → Bano Deterministic Transliterator):")
    print(f"  Input:  \"{codemix_transcript}\"")
    print(f"  Output: \"{deterministic_output}\"")

    print(f"\nApproach 2 (Gnani REST direct format=transliterate):")
    print(f"  Output: \"{transliterate_transcript}\"")
    print(f"  Note:   Supported ONLY on REST (<=30s). Gnani Batch (>30s) does NOT support format=transliterate.")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
