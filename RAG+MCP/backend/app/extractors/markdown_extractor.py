import re
from pathlib import Path
from typing import List

from app.extractors.base import BaseExtractor


class MarkdownExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> List[str]:
        content = file_path.read_text(encoding="utf-8", errors="replace")
        # Split on markdown headings
        sections = re.split(r"(?=^#{1,6}\s)", content, flags=re.MULTILINE)
        result = [s.strip() for s in sections if s.strip()]
        return result or [content]
