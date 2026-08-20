from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import re

from app.routes import notes, analyses
from app.config import settings

app = FastAPI(
    title="Note Insight API",
    version="1.0.0",
    description="Clinical documentation analysis powered by AI",
)


def is_allowed_origin(origin: str) -> bool:
    """Check if the request origin is in the allowed list.

    Supports exact match for the configured frontend URL and
    regex matching for *.vercel.app preview deployments.
    """
    if origin == settings.frontend_url:
        return True
    # Allow any Vercel preview URL (e.g., https://note-insight-abc123.vercel.app)
    if re.match(r"^https://[\w-]+\.vercel\.app$", origin):
        return True
    return False


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_origin_regex=r"^https://[\w-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes.router)
app.include_router(analyses.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
