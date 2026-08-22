# Note Insight

**Clinical Documentation Analysis Web Application**

Note Insight is a full-stack web application that helps clinicians analyze clinical notes using AI. Paste a clinical note, and the app automatically extracts medical conditions, assigns ICD-10 codes, identifies documentation gaps, and generates an encounter summary — all powered by Google Gemini 2.5 Flash via OpenRouter.

---

## Live Demo

- **Frontend**: [https://frontend-red-one-81.vercel.app](https://frontend-red-one-81.vercel.app)
- **Backend API**: [https://note-insight.onrender.com](https://note-insight.onrender.com)

---

## Features

### Core Features
- **AI-Powered Analysis** — Automatically extracts conditions, ICD-10 codes, confidence scores, and documentation gaps from clinical notes
- **Evidence Traceability** — Every extracted condition includes a verbatim quote from the original note
- **Hallucination Guardrail** — Programmatic check verifies every evidence quote exists verbatim in the source text
- **Human Review & Correction** — Clinicians can edit AI output, add missed conditions, and save reviewed versions alongside the original
- **Data Immutability** — Original AI output is always preserved separately from human-reviewed corrections
- **User Isolation** — Firebase Authentication ensures each user can only access their own notes
- **History & Sorting** — All notes displayed newest-first with review status badges
- **Strict TypeScript** — Zero `any` types across the entire frontend

### Bonus Features
1. **Document & Image Upload Pipeline** — Upload `.pdf`, `.png`, or `.jpeg` files via drag-and-drop or file picker. PDFs are extracted with PyPDF2, images are processed with Tesseract OCR. Extracted text flows into the same AI analysis pipeline.
2. **Streaming Analysis (SSE)** — Real-time Server-Sent Events endpoint (`POST /api/notes/analyze/stream`) streams LLM tokens and structured progress stages to the frontend as analysis runs.
3. **Duplicate Note Caching** — SHA-256 hash of normalized note text per user. Identical notes return cached analysis instantly without calling the AI API.
4. **Inline Evidence Highlighting** — Hover over any condition card to highlight its evidence quote directly in the clinical note text.
5. **Clinician Correction Metrics Dashboard** — Aggregated `/metrics` view showing total notes analyzed vs reviewed, correction rate (%), breakdown by field (name, ICD-10, status, quote, confidence), and gap changes.
6. **Per-User Rate Limiting** — FastAPI middleware (slowapi) enforces 10 requests/minute per authenticated user, returning HTTP 429 on abuse.
7. **Automated Test Suite** — Backend: 46 pytest tests (schema validation, hallucination detection, cache hashing, auth structure, rate limiting). Frontend: 26 Vitest tests (form loading states, condition editing, error boundaries).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript, Vite, React Router, Firebase Auth (client SDK) |
| **Backend** | Python FastAPI, Pydantic v2, OpenAI SDK (OpenRouter), Firebase Admin SDK |
| **Database** | Google Firestore (notes → analyses subcollection pattern) |
| **AI Model** | Google Gemini 2.5 Flash via OpenRouter API |
| **Auth** | Firebase Authentication (Email/Password) with server-side ID token verification |

---

## Project Structure

```
Note-Insight/
├── backend/
│   ├── app/
│   │   ├── auth.py              # Firebase ID token verification + per-user rate limit key
│   │   ├── cache_service.py     # SHA-256 duplicate note caching
│   │   ├── config.py            # Pydantic settings (loads from .env)
│   │   ├── db.py                # Firestore CRUD operations
│   │   ├── document_service.py  # PDF/image text extraction (PyPDF2 + Tesseract OCR)
│   │   ├── gemini_service.py    # AI analysis via OpenRouter/Gemini
│   │   ├── limiter.py           # Shared per-user rate limiter (slowapi)
│   │   ├── main.py              # FastAPI app, CORS, route registration
│   │   ├── metrics_service.py   # Clinician correction metrics aggregation
│   │   ├── models.py            # Pydantic request/response models
│   │   ├── streaming_service.py # SSE streaming analysis service
│   │   ├── prompts/
│   │   │   └── analysis_prompt.py  # LLM system & user prompts
│   │   └── routes/
│   │       ├── analyses.py      # Review submission endpoint
│   │       ├── metrics.py       # Metrics aggregation endpoint
│   │       └── notes.py         # Note submission, upload, streaming, listing
│   ├── tests/
│   │   ├── conftest.py          # Firebase mock setup + shared fixtures
│   │   ├── test_auth_rate_limit.py  # Auth structure + rate limiter tests
│   │   ├── test_cache.py        # SHA-256 hash computation tests
│   │   ├── test_document_service.py # File validation + extraction tests
│   │   ├── test_hallucination.py    # Quote validation / hallucination detection
│   │   └── test_models.py       # Pydantic schema validation tests
│   ├── pytest.ini
│   ├── requirements.txt
│   ── .env                     # Backend environment variables (NOT committed)
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # Authenticated API client (incl. upload, stream, metrics)
│   │   ├── components/
│   │   │   ├── Analysis/        # AnalysisView, ReviewEditor, EvidenceHighlight
│   │   │   ├── Auth/            # LoginForm, SignupForm
│   │   │   ├── Layout/          # AppLayout, LoadingStates, ProtectedRoute
│   │   │   └── Notes/           # NoteForm, NoteHistory, DocumentUpload
│   │   ├── context/AuthContext.tsx
│   │   ├── hooks/               # useAuth, useNotes, useAnalysis
│   │   ├── pages/               # Dashboard, Login, NoteDetail, Metrics
│   │   ├── test/                # Vitest test files
│   │   │   ├── NoteForm.test.tsx
│   │   │   ├── ReviewEditor.test.tsx
│   │   │   └── LoadingStates.test.tsx
│   │   ├── types/index.ts       # Shared TypeScript types (zero `any`)
│   │   ├── firebase.ts          # Firebase client initialization
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                     # Frontend environment variables (NOT committed)
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── test_fixtures/               # 5 synthetic test files (2 PNG + 3 PDF)
├── sample-notes/                # 3 synthetic clinical notes for testing
└── .gitignore
```

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm
- **Firebase Project** with:
  - Authentication enabled (Email/Password provider)
  - Firestore database created
  - A service account key (for backend Admin SDK)
- **OpenRouter API Key** (for Gemini 2.5 Flash access)
- **Firestore Composite Indexes** — Two indexes are required (the app will show a helpful error with creation links if missing):
  1. `notes` collection: `userId` (Ascending) + `createdAt` (Descending)
  2. `analyses` subcollection: `userId` (Ascending) + `createdAt` (Descending)

---

## Environment Setup

### Backend `.env` (`backend/.env`)

Create this file in the `backend/` directory with the following variables:

```env
# OpenRouter API key (get from https://openrouter.ai/keys)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Firebase Admin SDK service account credentials
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

> **How to get Firebase Admin credentials:** Go to Firebase Console → Project Settings → Service Accounts → Generate New Private Key. Download the JSON file and copy the values into the `.env` file above.

### Frontend `.env` (`frontend/.env`)

Create this file in the `frontend/` directory with your Firebase web app config:

```env
# Firebase web app configuration (from Firebase Console → Project Settings → Your Apps)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend API URL (leave empty for same-origin, or set to backend URL)
VITE_API_URL=
```

> **How to get Firebase web app config:** Go to Firebase Console → Project Settings → Your Apps → Web App → Config. Copy the values into the `.env` file above.

> **Security note:** `.env` files are listed in `.gitignore` and should **never** be committed to version control. They contain sensitive API keys and credentials.

---

## Running the Application

### 1. Start the Backend

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend will be available at **http://localhost:8000**

### 2. Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be available at **http://localhost:5173**

### 3. Running Tests

**Backend tests (pytest):**
```bash
cd backend
python -m pytest tests/ -v
```

**Frontend tests (Vitest):**
```bash
cd frontend
npm test
```

### 4. Using the App

1. Open http://localhost:5173 in your browser
2. **Sign up** with an email and password (creates a new Firebase Auth account)
3. **Paste a clinical note** in the text area
4. Optionally click **"Add optional metadata"** to enter patient pseudonym and visit date
5. Click **"Analyze Note"** — the AI will process the note (takes ~10-30 seconds)
6. Review the AI analysis: conditions, ICD-10 codes, evidence quotes, documentation gaps
7. Click **"Review & Correct"** to edit any condition, add new conditions, or modify the summary
8. Click **"Save Review"** to persist your corrections (original AI output is preserved)
9. View your note history on the dashboard — notes are sorted newest-first

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/notes` | Submit a clinical note for AI analysis |
| `POST` | `/api/notes/upload` | Upload a PDF/image for OCR extraction + AI analysis |
| `POST` | `/api/notes/analyze/stream` | Stream AI analysis in real-time via SSE |
| `GET` | `/api/notes` | List all notes for the authenticated user (newest first) |
| `GET` | `/api/notes/{note_id}` | Get full note detail with all analyses |
| `PUT` | `/api/analyses/{note_id}/{analysis_id}/review` | Save human review/corrections |
| `GET` | `/api/metrics` | Get aggregated clinician correction metrics |

All endpoints (except `/health`) require a valid Firebase ID token in the `Authorization: Bearer <token>` header.

---

## Security

- **API keys** (OpenRouter, Firebase Admin) live exclusively on the backend — never exposed to the browser
- **Firebase ID tokens** are verified server-side on every API request
- **User isolation** is enforced at both the API layer (token verification) and database layer (userId filtering on all queries)
- **CORS** is configured to only allow the configured frontend origin (plus Vercel preview deployments)
- **`.env` files** are gitignored to prevent accidental credential exposure

---

## Deployment

This project is currently deployed and live:

- **Frontend**: [https://frontend-red-one-81.vercel.app](https://frontend-red-one-81.vercel.app) (Vercel)
- **Backend**: [https://note-insight.onrender.com](https://note-insight.onrender.com) (Render)

### Backend (Render)

1. Connect your GitHub repo to Render as a **Python Web Service**
2. Set **Root Directory**: `backend`
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from `backend/.env` in the Render dashboard:
   - `OPENROUTER_API_KEY`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_CLIENT_ID`, `FIREBASE_CERT_URL`
   - `FRONTEND_URL` (set to your deployed frontend URL, **no trailing slash**)

### Frontend (Vercel)

1. Import your GitHub repo on Vercel
2. Set **Root Directory**: `frontend`
3. Set **Framework Preset**: Vite
4. Add environment variables in Vercel Settings → Environment Variables:
   - All `VITE_FIREBASE_*` variables from `frontend/.env`
   - `VITE_API_URL` = your deployed backend URL (e.g., `https://note-insight.onrender.com`)
5. Build command: `npm run build`
6. Output directory: `dist`

> **Important**: Vite bakes environment variables at build time. After changing any `VITE_*` env var on Vercel, you must trigger a new deployment (Redeploy) for changes to take effect.

---

## Data Model

The application uses a **subcollection-based Firestore schema** with four distinct entity types:

```
Firestore
└── notes/                          # Top-level collection
    └── {noteId}                    # One document per clinical note
        ├── userId: string          # Owner (Firebase Auth UID)
        ├── rawText: string         # Original clinical note text (immutable)
        ├── pseudonym: string?      # Patient identifier
        ├── visitDate: string?      # ISO date
        ├── createdAt: timestamp    # Sort key (newest first)
        ├── updatedAt: timestamp
        │
        └── analyses/               # Subcollection — one per AI run
            └── {analysisId}        # Individual analysis document
                ├── noteId: string
                ├── userId: string  # Redundant ownership for subcollection queries
                │
                │  ── Machine-written fields (immutable after creation) ──
                ├── aiConditions: Condition[]
                ├── aiGaps: DocumentationGap[]
                ├── aiSummary: string
                ├── modelVersion: string
                ├── promptVersion: string
                ├── quoteValidation: QuoteValidation[]
                ├── status: "processing" | "completed" | "failed"
                ├── createdAt: timestamp
                │
                │  ── Human-written fields (null until clinician reviews) ──
                ├── reviewedConditions: Condition[] | null
                ├── reviewedGaps: DocumentationGap[] | null
                ├── reviewedSummary: string | null
                ├── reviewStatus: "pending" | "reviewed"
                └── reviewedAt: timestamp | null
```

### Type Definitions

| Entity | Key Fields | Purpose |
|--------|-----------|---------|
| **Condition** | `name`, `evidence_quote`, `documentation_status`, `icd10_code`, `confidence` | A single extracted medical condition with traceability |
| **DocumentationGap** | `description`, `severity` | An actionable observation about missing documentation |
| **QuoteValidation** | `condition_name`, `evidence_quote`, `found_in_note` | Hallucination check result per evidence quote |

### Provenance & Immutability

The original AI output (`aiConditions`, `aiGaps`, `aiSummary`) is **never modified**. When a clinician reviews and corrects the analysis, their edits are saved to separate fields (`reviewedConditions`, `reviewedGaps`, `reviewedSummary`). This means we can always answer: *"What did the model predict vs. what did the clinician change?"*

---

## Architecture & Design Tradeoffs

### 1. Synchronous AI Analysis (MVP Choice)

**Decision**: The AI analysis runs synchronously within the HTTP request cycle rather than using a background job queue.

**Tradeoff**: This simplifies the architecture significantly (no Celery/Redis, no polling, no websockets) but means the user waits 10–30 seconds for the response. For a production system with higher traffic, we would move to async processing with a task queue (e.g., Celery + Redis or Cloud Tasks) and use WebSockets or SSE for real-time status updates.

### 2. Firestore Subcollection Pattern vs. Flat Collections

**Decision**: Analyses are stored as a subcollection of Notes (`notes/{noteId}/analyses/{analysisId}`) rather than a flat top-level collection.

**Tradeoff**: This naturally models the 1:N relationship and makes it easy to fetch "all analyses for a note" with a single query. However, it requires composite indexes for sorted queries and makes cross-note analysis queries harder. For a larger-scale system, flat collections with explicit foreign keys would offer more query flexibility.

### 3. OpenRouter as LLM Gateway vs. Direct Gemini API

**Decision**: We use OpenRouter (OpenAI-compatible API) to access Google Gemini 2.5 Flash rather than calling the Gemini API directly.

**Tradeoff**: OpenRouter provides a unified interface that makes swapping models trivial (change one string) and handles load balancing/fallbacks. The downside is an additional network hop and dependency on a third-party service. For production, direct API access would reduce latency and cost.

### 4. Client-Side Firebase Auth + Server-Side Verification

**Decision**: The frontend uses the Firebase client SDK for authentication (email/password), obtains an ID token, and sends it as a Bearer token. The backend verifies it with `firebase_admin.auth.verify_id_token()`.

**Tradeoff**: This is the standard Firebase pattern — secure and well-supported. The alternative (custom JWT auth with a separate identity provider) would give more control but adds significant complexity. Firebase Auth handles password hashing, session management, and token refresh automatically.

---

## Future Roadmap (What I'd Build Next with 1 More Week)

1. **Async Analysis Pipeline** — Move AI processing to a background task queue (Celery + Redis or Google Cloud Tasks) with WebSocket/SSE push for real-time status updates. This eliminates the 10-30s blocking request.

2. **FHIR Integration** — Add HL7 FHIR R4 resource mapping so extracted conditions can be exported as standard `Condition` resources for EHR interoperability.

3. **Batch Note Processing** — Allow clinicians to upload a CSV or paste multiple notes at once for bulk analysis, with progress tracking per note.

4. **Analytics Dashboard** — Track documentation quality trends over time: which conditions are frequently under-documented, average confidence scores, hallucination rates per model version.

5. **Multi-Model Comparison** — Run the same note through multiple LLMs (Gemini, GPT-4, Claude) and compare extraction quality side-by-side, using the existing `modelVersion` field.

6. **Comprehensive Test Suite** — Add pytest backend tests (unit + integration), Vitest frontend tests, and Playwright E2E tests covering the full submit → analyze → review flow.

---

## Assessment Effort

**Total time spent:** Approximately 32 hours across the full assessment lifecycle, broken down as:

| Phase | Time | Activities |
|-------|------|-----------|
| Architecture & Setup | ~3h | Firebase project, Firestore schema, FastAPI scaffold, Vite + React + TS setup |
| Backend Development | ~5h | Auth, CRUD, AI integration, Pydantic models, quote validation, error handling |
| Frontend Development | ~5h | Auth flow, note form, analysis view, review editor, history, routing |
| Styling & UX Polish | ~2h | CSS, loading states, error banners, responsive layout |
| Initial QA & Deployment | ~3h | End-to-end flow testing, Render + Vercel deployment, README documentation |
| Bonus Feature 1: Upload Pipeline | ~2.5h | Document service (PyPDF2 + Tesseract), upload endpoint, drag-and-drop UI component |
| Bonus Feature 2: SSE Streaming | ~2h | Streaming service with token-level events, frontend SSE parser, progress stages |
| Bonus Feature 3: Duplicate Caching | ~1h | SHA-256 hash computation, Firestore cache collection, cache lookup integration |
| Bonus Feature 4: Evidence Highlighting | ~1.5h | EvidenceHighlight component, hover state wiring between AnalysisView and note text |
| Bonus Feature 5: Metrics Dashboard | ~2h | Metrics aggregation service, /metrics endpoint, MetricsPage with field breakdown |
| Bonus Feature 6: Rate Limiting | ~1h | Per-user rate limiter with slowapi, shared limiter module, request.state integration |
| Bonus Feature 7: Test Suite | ~3h | 46 backend pytest tests + 26 frontend Vitest tests, Firebase mocking infrastructure |

**All 7 bonus features completed. All baseline requirements satisfied.**

---

## License

MIT
