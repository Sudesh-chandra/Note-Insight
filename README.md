# Note Insight

**Clinical Documentation Analysis Web Application**

Note Insight is a full-stack web application that helps clinicians analyze clinical notes using AI. Paste a clinical note, and the app automatically extracts medical conditions, assigns ICD-10 codes, identifies documentation gaps, and generates an encounter summary — all powered by Google Gemini 2.5 Flash via OpenRouter.

---

## Live Demo

- **Frontend**: [https://frontend-red-one-81.vercel.app](https://frontend-red-one-81.vercel.app)
- **Backend API**: [https://note-insight.onrender.com](https://note-insight.onrender.com)

---

## Features

- **AI-Powered Analysis** — Automatically extracts conditions, ICD-10 codes, confidence scores, and documentation gaps from clinical notes
- **Evidence Traceability** — Every extracted condition includes a verbatim quote from the original note
- **Human Review & Correction** — Clinicians can edit AI output, add missed conditions, and save reviewed versions alongside the original
- **Data Immutability** — Original AI output is always preserved separately from human-reviewed corrections
- **User Isolation** — Firebase Authentication ensures each user can only access their own notes
- **History & Sorting** — All notes displayed newest-first with review status badges

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
│   │   ├── auth.py              # Firebase ID token verification
│   │   ├── config.py            # Pydantic settings (loads from .env)
│   │   ├── db.py                # Firestore CRUD operations
│   │   ├── gemini_service.py    # AI analysis via OpenRouter/Gemini
│   │   ├── main.py              # FastAPI app, CORS, route registration
│   │   ├── models.py            # Pydantic request/response models
│   │   ├── prompts/
│   │   │   └── analysis_prompt.txt  # LLM system prompt
│   │   └── routes/
│   │       ├── analyses.py      # Review submission endpoint
│   │       └── notes.py         # Note submission & listing endpoints
│   ├── requirements.txt
│   ── .env                     # Backend environment variables (NOT committed)
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # Authenticated API client
│   │   ├── components/
│   │   │   ├── Analysis/        # AnalysisView, ReviewEditor
│   │   │   ├── Auth/            # LoginForm, SignupForm
│   │   │   ├── Layout/          # AppLayout, LoadingStates, ProtectedRoute
│   │   │   └── Notes/           # NoteForm, NoteHistory
│   │   ├── context/AuthContext.tsx
│   │   ├── hooks/               # useAuth, useNotes, useAnalysis
│   │   ├── pages/               # Dashboard, Login, NoteDetail
│   │   ├── styles/global.css
│   │   ├── types/index.ts       # Shared TypeScript types
│   │   ├── firebase.ts          # Firebase client initialization
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                     # Frontend environment variables (NOT committed)
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── prompts/                     # Prompt templates
├── sample-notes/                # Sample clinical notes for testing
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

### 3. Using the App

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
| `GET` | `/api/notes` | List all notes for the authenticated user (newest first) |
| `GET` | `/api/notes/{note_id}` | Get full note detail with all analyses |
| `PUT` | `/api/analyses/{note_id}/{analysis_id}/review` | Save human review/corrections |

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

## License

MIT
