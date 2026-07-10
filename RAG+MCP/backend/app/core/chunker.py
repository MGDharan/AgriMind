from typing import List

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Separators tried in order — prefer larger breaks first
_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]


def chunk_text(
    text: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> List[str]:
    """Split text into overlapping chunks using recursive character splitting."""
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap

    text = text.strip()
    if not text:
        return []

    if len(text) <= chunk_size:
        return [text]

    chunks = _split(text, _SEPARATORS, chunk_size, chunk_overlap)
    result = [c.strip() for c in chunks if c.strip()]
    logger.debug("Chunked text", input_len=len(text), chunk_count=len(result))
    return result


def _split(
    text: str,
    separators: List[str],
    chunk_size: int,
    chunk_overlap: int,
) -> List[str]:
    """Recursive character text splitter."""
    # Find the best separator
    separator = ""
    new_separators: List[str] = []
    for i, sep in enumerate(separators):
        if sep == "":
            separator = sep
            break
        if sep in text:
            separator = sep
            new_separators = separators[i + 1 :]
            break

    splits = text.split(separator) if separator else list(text)

    good: List[str] = []
    current_len = 0
    chunks: List[str] = []

    for s in splits:
        s_len = len(s)
        add_len = s_len + (len(separator) if good else 0)

        if current_len + add_len > chunk_size and good:
            # Emit current chunk
            merged = separator.join(good)
            if merged.strip():
                chunks.append(merged)
            # Build overlap
            while good and current_len > chunk_overlap:
                removed = good.pop(0)
                current_len -= len(removed) + len(separator)
            current_len = max(0, current_len)

        if s_len > chunk_size and new_separators:
            # Recurse for large splits
            sub = _split(s, new_separators, chunk_size, chunk_overlap)
            chunks.extend(sub)
        else:
            good.append(s)
            current_len += s_len + len(separator)

    if good:
        merged = separator.join(good)
        if merged.strip():
            chunks.append(merged)

    return chunks
