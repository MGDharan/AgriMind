from pathlib import Path
from typing import List

from docx import Document

from app.extractors.base import BaseExtractor
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DOCXExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> List[str]:
        doc = Document(str(file_path))
        sections: List[str] = []
        current: List[str] = []

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                if current:
                    sections.append("\n".join(current))
                    current = []
            else:
                current.append(text)

        if current:
            sections.append("\n".join(current))

        logger.info("DOCX extracted", file=file_path.name, sections=len(sections))
        return sections or [""]
