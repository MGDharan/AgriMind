from pathlib import Path
from typing import List

import pdfplumber

from app.extractors.base import BaseExtractor
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PDFExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> List[str]:
        pages: List[str] = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text and text.strip():
                    pages.append(text.strip())
        logger.info("PDF extracted", file=file_path.name, pages=len(pages))
        return pages
