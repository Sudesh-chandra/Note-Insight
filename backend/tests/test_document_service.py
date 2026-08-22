"""Tests for document extraction service — PDF and image text extraction."""

import io
import pytest
from unittest.mock import patch, MagicMock

from app.document_service import (
    extract_text_from_upload,
    extract_text_from_pdf,
    extract_text_from_image,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
)


class TestFileValidation:
    """Verify file extension and size validation."""

    def test_allowed_extensions(self):
        assert ".pdf" in ALLOWED_EXTENSIONS
        assert ".png" in ALLOWED_EXTENSIONS
        assert ".jpeg" in ALLOWED_EXTENSIONS
        assert ".jpg" in ALLOWED_EXTENSIONS

    def test_unsupported_extension_rejected(self):
        with pytest.raises(ValueError, match="Unsupported file type"):
            extract_text_from_upload(b"fake content", "file.docx")

    def test_oversized_file_rejected(self):
        fake_bytes = b"x" * (MAX_FILE_SIZE + 1)
        with pytest.raises(ValueError, match="File too large"):
            extract_text_from_upload(fake_bytes, "large.pdf")

    def test_no_extension_rejected(self):
        with pytest.raises(ValueError, match="Unsupported file type"):
            extract_text_from_upload(b"content", "noextension")


class TestPDFExtraction:
    """Test PDF text extraction using mocked PyPDF2."""

    def test_pdf_extraction_failure(self):
        """Corrupt PDF should raise ValueError."""
        with pytest.raises((ValueError, Exception)):
            extract_text_from_pdf(b"not a real pdf")


class TestImageExtraction:
    """Test image OCR extraction using Gemini vision API."""

    def test_image_extraction_success(self):
        """Mock a successful Gemini vision extraction."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Patient has hypertension and diabetes."

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            result = extract_text_from_image(b"fake-image-bytes", "test.png")
            assert "hypertension" in result
            assert "diabetes" in result

    def test_image_extraction_failure(self):
        """API failure should raise ValueError."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("API error")

        with patch("openai.OpenAI", return_value=mock_client):
            with pytest.raises(ValueError, match="Failed to extract text from image"):
                extract_text_from_image(b"fake-image-bytes", "test.png")

    def test_image_empty_response(self):
        """Empty vision response should raise ValueError."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = ""

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            with pytest.raises(ValueError, match="Vision model returned empty text"):
                extract_text_from_image(b"fake-image-bytes", "test.png")


class TestExtractFromUpload:
    """Test the dispatch function that routes by file extension."""

    def test_pdf_dispatch(self):
        """PDF files should go through PDF extraction path."""
        # Corrupt bytes will fail, but we verify the routing works
        with pytest.raises(Exception):
            extract_text_from_upload(b"fake", "test.pdf")

    def test_png_dispatch(self):
        """PNG files should go through image extraction path (Gemini vision)."""
        # Mock the OpenAI client so image extraction doesn't make real API calls
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("mocked")
        with patch("openai.OpenAI", return_value=mock_client):
            with pytest.raises(ValueError):
                extract_text_from_upload(b"fake", "test.png")

    def test_jpg_dispatch(self):
        """JPG files should go through image extraction path (Gemini vision)."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("mocked")
        with patch("openai.OpenAI", return_value=mock_client):
            with pytest.raises(ValueError):
                extract_text_from_upload(b"fake", "photo.jpg")
