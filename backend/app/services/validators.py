import hashlib
import ipaddress
import socket
from typing import BinaryIO, Tuple
from urllib.parse import urlparse
from fastapi import status
from backend.app.core.config import settings
from backend.app.core.exceptions import AppException

# Common magic bytes
MAGIC_SIGNATURES = {
    # WAV: "RIFF" .... "WAVE"
    "wav": [(0, b"RIFF"), (8, b"WAVE")],
    # MP3: ID3 header or sync frame 0xFFFB, 0xFFF3, 0xFFF2
    "mp3_id3": [(0, b"ID3")],
    "mp3_sync": [(0, b"\xff\xfb"), (0, b"\xff\xf3"), (0, b"\xff\xf2")],
    # MP4 / M4A: starts with ftyp box at offset 4
    "mp4": [(4, b"ftyp")],
    # OGG: "OggS"
    "ogg": [(0, b"OggS")],
    # FLAC: "fLaC"
    "flac": [(0, b"fLaC")],
    # Matroska / WebM: 0x1A45DFA3
    "webm": [(0, b"\x1a\x45\xdf\xa3")],
}


def compute_sha256(file_obj: BinaryIO) -> str:
    """Computes SHA-256 of file stream, rewinds file pointer before returning."""
    hasher = hashlib.sha256()
    file_obj.seek(0)
    while chunk := file_obj.read(65536):
        hasher.update(chunk)
    file_obj.seek(0)
    return hasher.hexdigest()


def validate_magic_bytes(header: bytes) -> Tuple[bool, str]:
    """
    Checks leading bytes against supported audio/video magic numbers.
    Returns (is_valid, detected_format).
    """
    if len(header) < 3:
        return False, "file_too_small"

    # Check MP3 ID3 (3 bytes)
    if header.startswith(b"ID3"):
        return True, "mp3"

    # Check MP3 sync frames (2 bytes)
    if header[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return True, "mp3"

    # Check FLAC (4 bytes)
    if header.startswith(b"fLaC"):
        return True, "flac"

    # Check Ogg (4 bytes)
    if header.startswith(b"OggS"):
        return True, "ogg"

    # Check WebM / Matroska (4 bytes)
    if header.startswith(b"\x1a\x45\xdf\xa3"):
        return True, "webm"

    if len(header) >= 8:
        # Check MP4 / M4A (offset 4 has 'ftyp')
        if header[4:8] == b"ftyp":
            return True, "mp4"

    if len(header) >= 12:
        # Check WAV: "RIFF" .... "WAVE"
        if header.startswith(b"RIFF") and header[8:12] == b"WAVE":
            return True, "wav"

    return False, "unknown"



def validate_file_metadata(file_size: int, mime_type: str = None) -> None:
    """Validates declared file size within configured limits."""
    if file_size <= 0:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Uploaded file is empty (0 bytes)",
            code="EMPTY_FILE",
        )
    if file_size > settings.MAX_UPLOAD_FILE_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_FILE_SIZE_BYTES // (1024 * 1024)
        raise AppException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            message=f"File exceeds maximum upload size limit of {max_mb} MB",
            code="FILE_TOO_LARGE",
        )


ALLOWED_YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
}


def validate_youtube_url_safety(url_str: str) -> str:
    """
    Validates YouTube URL for SSRF protection:
    - Verifies scheme is http or https
    - Hostname must be official YouTube domain
    - Resolves DNS and blocks private/loopback/link-local/multicast IP addresses
    """
    try:
        parsed = urlparse(url_str)
    except Exception:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Invalid URL format",
            code="INVALID_URL",
        )

    if parsed.scheme not in ("http", "https"):
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="URL scheme must be http or https",
            code="INVALID_URL_SCHEME",
        )

    hostname = (parsed.hostname or "").lower()
    if not hostname or hostname not in ALLOWED_YOUTUBE_HOSTS:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="URL host is not an authorized YouTube domain",
            code="DISALLOWED_HOST",
        )

    # SSRF DNS check
    try:
        resolved_ips = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
        for item in resolved_ips:
            ip_str = item[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_multicast
                or ip_obj.is_reserved
            ):
                raise AppException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    message="URL resolves to restricted IP space",
                    code="SSRF_PREVENTION",
                )
    except socket.gaierror:
        # If in offline/sandboxed test environment without external DNS, allow standard domain pass-through
        if settings.ENVIRONMENT in ("development", "test"):
            pass
        else:
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Unable to resolve hostname",
                code="DNS_RESOLUTION_FAILED",
            )


    return url_str
