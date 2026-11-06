import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock

from backend.app.services.gnani_provider import GnaniSTTProvider, NormalisedTranscript
from backend.app.core.exceptions import AppException


@pytest.mark.asyncio
async def test_gnani_provider_rest_success():
    provider = GnaniSTTProvider(api_key="mock_test_key", base_url="https://api.vachana.ai")

    mock_rest_response = {
        "success": True,
        "transcript": "आज हम बाइनरी ट्री डिस्कस करेंगे",
        "model": "prisma-v3.0",
        "detected_language_code": "hi-IN",
        "segments": [
            {"start_time": 0.0, "end_time": 4.5, "text": "आज हम बाइनरी ट्री डिस्कस करेंगे", "confidence": 0.95}
        ],
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_rest_response
        mock_post.return_value = mock_resp

        result = await provider.transcribe(
            audio_bytes=b"dummy_wav_data",
            filename="test.wav",
            duration_seconds=15.0,  # <= 30s triggers REST
            lecture_id="lec_123",
        )

        assert isinstance(result, NormalisedTranscript)
        assert result.lecture_id == "lec_123"
        assert result.full_text_devanagari == "आज हम बाइनरी ट्री डिस्कस करेंगे"
        # Roman transcript must be transliterated
        assert len(result.roman_segments) == 1
        assert "aaja hama" in result.full_text_roman.lower() or "bainari" in result.full_text_roman.lower()
        assert result.raw_provider_response == mock_rest_response


@pytest.mark.asyncio
async def test_gnani_provider_batch_success():
    provider = GnaniSTTProvider(api_key="mock_test_key", base_url="https://api.vachana.ai")

    # Mock batch create, start, poll, and files responses
    create_resp = MagicMock()
    create_resp.status_code = 200
    create_resp.json.return_value = {"job_id": "gnani_batch_job_456"}

    start_resp = MagicMock()
    start_resp.status_code = 200
    start_resp.json.return_value = {"status": "started"}

    status_resp = MagicMock()
    status_resp.status_code = 200
    status_resp.json.return_value = {"status": "completed"}

    files_resp = MagicMock()
    files_resp.status_code = 200
    files_resp.json.return_value = {
        "files": [
            {
                "file_name": "test.wav",
                "transcript": "यह डेटा स्ट्रक्चर्स का लेक्चर है",
                "segments": [
                    {"start_time": 0.0, "end_time": 10.0, "text": "यह डेटा स्ट्रक्चर्स का लेक्चर है", "confidence": 0.92}
                ],
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        
        mock_post.side_effect = [create_resp, start_resp]
        mock_get.side_effect = [status_resp, files_resp]

        result = await provider.transcribe(
            audio_bytes=b"dummy_wav_data",
            filename="test.wav",
            duration_seconds=120.0,  # > 30s triggers Batch
            lecture_id="lec_batch_123",
        )

        assert isinstance(result, NormalisedTranscript)
        assert result.lecture_id == "lec_batch_123"
        assert result.full_text_devanagari == "यह डेटा स्ट्रक्चर्स का लेक्चर है"
        assert len(result.roman_segments) == 1
        assert len(result.devanagari_segments) == 1


@pytest.mark.asyncio
async def test_gnani_provider_timeout_handling():
    provider = GnaniSTTProvider(api_key="mock_test_key", base_url="https://api.vachana.ai")

    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Connection timed out")):
        with pytest.raises(AppException) as exc:
            await provider.transcribe(
                audio_bytes=b"dummy_wav_data",
                filename="test.wav",
                duration_seconds=10.0,
                lecture_id="lec_timeout",
            )
        assert exc.value.code == "PROVIDER_TIMEOUT"
        assert exc.value.status_code == 504


@pytest.mark.asyncio
async def test_gnani_provider_failure_handling():
    provider = GnaniSTTProvider(api_key="mock_test_key", base_url="https://api.vachana.ai")

    err_resp = MagicMock()
    err_resp.status_code = 401
    err_resp.text = "Unauthorized: Invalid API Key"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = err_resp
        with pytest.raises(AppException) as exc:
            await provider.transcribe(
                audio_bytes=b"dummy_wav_data",
                filename="test.wav",
                duration_seconds=10.0,
                lecture_id="lec_err",
            )
        assert exc.value.code == "GNANI_REST_ERROR"
        assert exc.value.status_code == 401


@pytest.mark.real_api
@pytest.mark.asyncio
async def test_gnani_real_api_call():
    """Real-API test marker: Only executed when GNANI_API_KEY is configured and pytest -m real_api is passed."""
    import os
    api_key = os.getenv("GNANI_API_KEY")
    if not api_key:
        pytest.skip("GNANI_API_KEY is not set in environment; skipping real API test")

    provider = GnaniSTTProvider(api_key=api_key)
    # Using tiny test tone or sample
    dummy_wav = b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    res = await provider.transcribe(dummy_wav, "real_test.wav", duration_seconds=3.0, lecture_id="lec_real_1")
    assert res is not None

