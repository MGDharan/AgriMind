from pathlib import Path
from typing import List

from app.extractors.base import BaseExtractor


class TXTExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> List[str]:
        content = file_path.read_text(encoding="utf-8", errors="replace")
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        return paragraphs or [content]
