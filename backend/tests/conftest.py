"""Root conftest — mocks Firebase initialization so tests run without real credentials.

This file is loaded BEFORE any test modules, so we patch firebase_admin here
to prevent actual Firebase initialization during test runs.
"""

import os
import sys
from unittest.mock import MagicMock, patch

# Set dummy environment variables before any app module is imported
os.environ["OPENROUTER_API_KEY"] = "test-key-dummy"
os.environ["FIREBASE_PROJECT_ID"] = "test-project"
os.environ["FIREBASE_PRIVATE_KEY_ID"] = "test-key-id"
os.environ["FIREBASE_PRIVATE_KEY"] = "-----BEGIN PRIVATE KEY-----\\nMIIdummy\\n-----END PRIVATE KEY-----\\n"
os.environ["FIREBASE_CLIENT_EMAIL"] = "test@test.iam.gserviceaccount.com"
os.environ["FIREBASE_CLIENT_ID"] = "123456789"
os.environ["FIREBASE_CERT_URL"] = "https://www.googleapis.com/robot/v1/metadata/x509/test"
os.environ["FRONTEND_URL"] = "http://localhost:5173"

# Create mock firebase_admin module
mock_firebase_admin = MagicMock()
mock_firebase_admin._apps = []

mock_auth = MagicMock()
mock_credentials = MagicMock()
mock_firestore = MagicMock()

# Wire up the submodules
sys.modules["firebase_admin"] = mock_firebase_admin
sys.modules["firebase_admin.auth"] = mock_auth
sys.modules["firebase_admin.credentials"] = mock_credentials
sys.modules["firebase_admin.firestore"] = mock_firestore

# Make firebase_admin.auth resolve to our mock
mock_firebase_admin.auth = mock_auth
mock_firebase_admin.credentials = mock_credentials
mock_firebase_admin.firestore = mock_firestore

# Now it's safe to import app modules — Firebase won't actually initialize

import pytest
from app.models import Condition, DocumentationGap, QuoteValidation


@pytest.fixture
def sample_condition():
    """A valid Condition instance for testing."""
    return Condition(
        name="Essential Hypertension",
        evidence_quote="Patient has a history of hypertension managed with lisinopril 10mg daily.",
        documentation_status="well_documented",
        icd10_code="I10",
        confidence=0.92,
    )


@pytest.fixture
def sample_gap():
    """A valid DocumentationGap instance for testing."""
    return DocumentationGap(
        description="No assessment of renal function documented despite hypertension.",
        severity="medium",
    )


@pytest.fixture
def sample_note_text():
    """A sample clinical note for testing quote validation."""
    return (
        "Patient: John Doe\n"
        "Date: 2024-03-15\n"
        "Subjective: Patient presents with complaints of persistent headache and dizziness. "
        "Patient has a history of hypertension managed with lisinopril 10mg daily. "
        "Also reports difficulty sleeping for the past two weeks. "
        "Type 2 diabetes mellitus, currently on metformin 500mg BID. "
        "Objective: BP 148/92, HR 78, BMI 28.4\n"
        "Assessment: Uncontrolled essential hypertension. Type 2 DM. Insomnia.\n"
        "Plan: Increase lisinopril to 20mg. Continue metformin. Sleep hygiene counseling."
    )


@pytest.fixture
def mock_db():
    """A mock Firestore client."""
    return MagicMock()
