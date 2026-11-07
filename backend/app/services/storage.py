import abc
import os
import shutil
from pathlib import Path
from typing import BinaryIO, Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger


class StorageAdapter(abc.ABC):
    """Abstract adapter interface for file storage."""

    @abc.abstractmethod
    def save_file(self, file_obj: BinaryIO, destination_path: str) -> str:
        """Saves a binary file-like object to storage and returns the storage path/URI."""
        pass

    @abc.abstractmethod
    def read_file(self, storage_path: str) -> bytes:
        """Reads file bytes from storage."""
        pass

    @abc.abstractmethod
    def get_local_path(self, storage_path: str) -> str:
        """Returns a valid filesystem path for local processing (e.g. FFmpeg)."""
        pass

    @abc.abstractmethod
    def exists(self, storage_path: str) -> bool:
        """Checks if a file exists in storage."""
        pass

    @abc.abstractmethod
    def delete(self, storage_path: str) -> bool:
        """Deletes a file from storage."""
        pass


class LocalStorageAdapter(StorageAdapter):
    """Local disk storage adapter for development and testing."""

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.LOCAL_STORAGE_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve(self, storage_path: str) -> Path:
        p = Path(storage_path)
        if p.is_absolute() and p.exists():
            return p
        clean_path = storage_path.lstrip("/")
        full_path = (self.base_dir / clean_path).resolve()
        try:
            full_path.relative_to(self.base_dir)
        except ValueError:
            raise ValueError(f"Path traversal detected: {storage_path}")
        return full_path


    def save_file(self, file_obj: BinaryIO, destination_path: str) -> str:
        target = self._resolve(destination_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "wb") as f:
            shutil.copyfileobj(file_obj, f)
        logger.info(f"Saved file to local storage: {target}")
        return str(target)

    def read_file(self, storage_path: str) -> bytes:
        target = self._resolve(storage_path)
        with open(target, "rb") as f:
            return f.read()

    def get_local_path(self, storage_path: str) -> str:
        return str(self._resolve(storage_path))

    def exists(self, storage_path: str) -> bool:
        return self._resolve(storage_path).exists()

    def delete(self, storage_path: str) -> bool:
        target = self._resolve(storage_path)
        if target.exists():
            target.unlink()
            return True
        return False


_storage_instance: Optional[StorageAdapter] = None


def get_storage_adapter() -> StorageAdapter:
    """Factory dependency returning the configured storage adapter."""
    global _storage_instance
    if _storage_instance is None:
        if settings.STORAGE_BACKEND == "local":
            _storage_instance = LocalStorageAdapter()
        else:
            # Fallback to local for non-local if unconfigured
            _storage_instance = LocalStorageAdapter()
    return _storage_instance


def set_storage_adapter(adapter: StorageAdapter) -> None:
    """Allows test fixtures to inject custom storage adapters."""
    global _storage_instance
    _storage_instance = adapter
