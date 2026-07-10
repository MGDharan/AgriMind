from pathlib import Path
from typing import List

import pandas as pd

from app.extractors.base import BaseExtractor
from app.utils.logger import get_logger

logger = get_logger(__name__)

ROWS_PER_CHUNK = 10


class CSVExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> List[str]:
        df = pd.read_csv(file_path, dtype=str).fillna("")
        columns = df.columns.tolist()

        row_texts: List[str] = []
        for _, row in df.iterrows():
            parts = [f"{col}: {val}" for col, val in zip(columns, row) if val]
            if parts:
                row_texts.append(", ".join(parts))

        # Group rows into chunks
        chunks: List[str] = []
        for i in range(0, len(row_texts), ROWS_PER_CHUNK):
            group = row_texts[i : i + ROWS_PER_CHUNK]
            chunks.append("\n".join(group))

        logger.info("CSV extracted", file=file_path.name, rows=len(df), chunks=len(chunks))
        return chunks or [""]
