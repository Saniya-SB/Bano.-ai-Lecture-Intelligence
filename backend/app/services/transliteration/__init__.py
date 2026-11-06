"""
Transliteration service exports.
"""

from backend.app.services.transliteration.lexicon import (
    DEFAULT_TECHNICAL_LEXICON,
    DEFAULT_PRESERVED_ENGLISH_TERMS,
)
from backend.app.services.transliteration.deterministic import (
    DeterministicTransliterator,
)
from backend.app.services.transliteration.service import (
    TransliterationService,
    TransliterationComparisonResult,
    transliteration_service,
)

__all__ = [
    "DEFAULT_TECHNICAL_LEXICON",
    "DEFAULT_PRESERVED_ENGLISH_TERMS",
    "DeterministicTransliterator",
    "TransliterationService",
    "TransliterationComparisonResult",
    "transliteration_service",
]

