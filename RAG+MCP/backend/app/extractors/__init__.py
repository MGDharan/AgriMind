from pathlib import Path
from app.extractors.base import BaseExtractor
from app.extractors.pdf_extractor import PDFExtractor
from app.extractors.docx_extractor import DOCXExtractor
from app.extractors.txt_extractor import TXTExtractor
from app.extractors.markdown_extractor import MarkdownExtractor
from app.extractors.csv_extractor import CSVExtractor

_REGISTRY: dict[str, type[BaseExtractor]] = {
    ".pdf": PDFExtractor,
    ".docx": DOCXExtractor,
    ".doc": DOCXExtractor,
    ".txt": TXTExtractor,
    ".md": MarkdownExtractor,
    ".markdown": MarkdownExtractor,
    ".csv": CSVExtractor,
}


def get_extractor(file_type: str) -> BaseExtractor:
    cls = _REGISTRY.get(file_type.lower())
    if cls is None:
        raise ValueError(f"Unsupported file type: {file_type}")
    return cls()
