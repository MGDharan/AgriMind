from abc import ABC, abstractmethod
from pathlib import Path
from typing import List


class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, file_path: Path) -> List[str]:
        """Extract text from a file. Returns a list of text blocks (pages / sections)."""
        ...
