from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import notes, analyses
from app.config import settings

app = FastAPI(
    title="Note Insight API",
    version="1.0.0",
    description="Clinical documentation analysis powered by AI",
)

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
