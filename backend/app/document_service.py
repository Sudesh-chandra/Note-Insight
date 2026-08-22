"""Document extraction service — converts PDFs and images to plain text."""

import base64
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpeg", ".jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# MIME type mapping for image formats
IMAGE_MIME_TYPES = {
    ".png": "image/png",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
}


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
    """Extract text from an image using Gemini's native vision capability.

    Sends the image directly to Gemini 2.5 Flash via OpenRouter — no Tesseract needed.
    """
    try:
        from openai import OpenAI
        from app.config import settings

        # Determine MIME type from extension
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        mime_type = IMAGE_MIME_TYPES.get(ext, "image/png")

        # Encode image to base64
        b64_image = base64.b64encode(file_bytes).decode("utf-8")

        # Create OpenRouter client (reuses same config as gemini_service)
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
            timeout=60.0,
            max_retries=1,
        )

        response = client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract ALL text from this image exactly as it appears. Return only the extracted text, nothing else.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{b64_image}",
                            },
                        },
                    ],
                }
            ],
            max_tokens=4096,
        )

        text = response.choices[0].message.content
        if not text or not text.strip():
            raise ValueError("Vision model returned empty text. The image may not contain readable text.")
        return text.strip()

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
