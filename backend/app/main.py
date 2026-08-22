from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.limiter import limiter
from app.routes import notes, analyses, metrics
from app.config import settings

app = FastAPI(
    title="Note Insight API",
    version="1.0.0",
    description="Clinical documentation analysis powered by AI",
)

# Rate limiting setup — per-user via shared limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
app.include_router(metrics.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
