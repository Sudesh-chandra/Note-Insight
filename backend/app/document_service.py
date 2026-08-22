"""Document extraction service — converts PDFs and images to plain text."""

import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpeg", ".jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file using PyPDF2."""
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n\n".join(pages)
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise ValueError(f"Failed to extract text from PDF: {e}")


def extract_text_from_image(file_bytes: bytes, filename: str) -> str:
    """Extract text from an image using pytesseract OCR."""
    try:
        from PIL import Image
        import pytesseract

        img = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(img)
        if not text.strip():
            raise ValueError("OCR returned empty text. The image may not contain readable text.")
        return text.strip()
    except ImportError:
        raise RuntimeError(
            "Tesseract OCR is not installed. Install it from https://tesseract-ocr.github.io/"
        )
    except Exception as e:
        logger.error(f"Image OCR failed: {e}")
        raise ValueError(f"Failed to extract text from image: {e}")


def extract_text_from_upload(file_bytes: bytes, filename: str) -> str:
    """Extract text from an uploaded file based on its extension.

    Returns the extracted plain text.
    Raises ValueError for unsupported formats or extraction failures.
    """
    # Normalize extension
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File too large ({len(file_bytes)} bytes). Maximum: {MAX_FILE_SIZE} bytes.")

    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    else:
        # png, jpeg, jpg
        return extract_text_from_image(file_bytes, filename)
