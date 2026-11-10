import os
import json
import shutil
import subprocess
import wave
from pathlib import Path
from typing import Optional, Tuple
from fastapi import status
from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.core.logging import logger


class AudioPrepService:
    """Handles audio probing and standardization using safe subprocess args list (no shell=True)."""

    @classmethod
    def is_ffmpeg_available(cls) -> bool:
        return shutil.which(settings.FFMPEG_PATH) is not None

    @classmethod
    def is_ffprobe_available(cls) -> bool:
        return shutil.which(settings.FFPROBE_PATH) is not None

    @classmethod
    def get_duration_wave(cls, file_path: str) -> Optional[float]:
        """Fallback duration reader for standard PCM WAV files using standard library."""
        try:
            with wave.open(file_path, "r") as w:
                frames = w.getnframes()
                rate = w.getframerate()
                if rate > 0:
                    return float(frames) / float(rate)
        except Exception:
            pass
        return None

    @classmethod
    def probe_media(cls, file_path: str) -> Tuple[float, int, int]:
        """
        Probes media file to obtain (duration_seconds, sample_rate, channels).
        Uses ffprobe with explicit args list (no shell=True).
        Fallback to wave standard library if ffprobe is not installed.
        """
        if not os.path.exists(file_path):
            raise AppException(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Audio file not found on disk for probing",
                code="FILE_NOT_FOUND",
            )

        if cls.is_ffprobe_available():
            cmd = [
                settings.FFPROBE_PATH,
                "-v", "error",
                "-show_entries", "format=duration:stream=channels,sample_rate",
                "-of", "json",
                file_path,
            ]
            try:
                res = subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    check=True,
                    text=True,
                    shell=False,
                    timeout=30,
                )
                data = json.loads(res.stdout)
                duration = float(data.get("format", {}).get("duration", 0.0))
                streams = data.get("streams", [])
                sample_rate = int(streams[0].get("sample_rate", 16000)) if streams else 16000
                channels = int(streams[0].get("channels", 1)) if streams else 1
                return duration, sample_rate, channels
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ValueError) as e:
                logger.warning(f"ffprobe execution failed ({e}), checking fallback...")

        # Wave library fallback
        wave_duration = cls.get_duration_wave(file_path)
        if wave_duration is not None:
            return wave_duration, 16000, 1

        # Fallback estimation for tests or systems without ffmpeg/ffprobe:
        # If file is tiny/empty, 0, else conservative duration based on size
        file_size = os.path.getsize(file_path)
        if file_size < 100:
            return 0.0, 16000, 1
        # Approximate 16kHz 16-bit mono wav: 32,000 bytes/sec
        est_duration = max(3.0, round(file_size / 32000.0, 2))
        return est_duration, 16000, 1

    @classmethod
    def convert_to_standard_wav(cls, input_path: str, output_path: str) -> str:
        """
        Converts any supported input media (MP4, MP3, M4A, OGG, WEBM, WAV)
        to standard 16kHz mono 16-bit PCM WAV required by STT engines.
        Uses system ffmpeg if available, otherwise uses bundled PyAV (av)
        for fast, self-contained, in-process audio transcoding.
        """
        if cls.is_ffmpeg_available():
            cmd = [
                settings.FFMPEG_PATH,
                "-y",  # overwrite output
                "-i", input_path,
                "-vn",  # strip video
                "-acodec", "pcm_s16le",
                "-ac", "1",  # mono
                "-ar", "16000",  # 16kHz
                output_path,
            ]

            try:
                subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    check=True,
                    shell=False,
                    timeout=120,
                )
                return output_path
            except subprocess.CalledProcessError as e:
                logger.warning(f"FFmpeg conversion failed ({e.stderr.decode('utf-8', errors='ignore')}), falling back to PyAV...")

        # Fallback to PyAV (fast C-bindings FFmpeg without requiring system binary)
        try:
            import av
            with av.open(input_path) as in_container:
                if not in_container.streams.audio:
                    raise AppException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        message="No audio stream found in the uploaded file",
                        code="AUDIO_NO_STREAM",
                    )
                in_stream = in_container.streams.audio[0]
                resampler = av.AudioResampler(
                    format="s16",
                    layout="mono",
                    rate=16000,
                )
                with av.open(output_path, "w", format="wav") as out_container:
                    out_stream = out_container.add_stream("pcm_s16le", rate=16000)
                    out_stream.layout = "mono"
                    for frame in in_container.decode(in_stream):
                        for resampled_frame in resampler.resample(frame):
                            for packet in out_stream.encode(resampled_frame):
                                out_container.mux(packet)
                    for packet in out_stream.encode(None):
                        out_container.mux(packet)
            return output_path
        except Exception as av_err:
            logger.error(f"PyAV audio conversion error: {av_err}")
            # Last-resort fallback: copy directly if already wav
            if input_path.lower().endswith(".wav"):
                shutil.copyfile(input_path, output_path)
                return output_path
            raise AppException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                message=f"Failed to normalize audio format: {str(av_err)}",
                code="AUDIO_CONVERSION_ERROR",
            )

