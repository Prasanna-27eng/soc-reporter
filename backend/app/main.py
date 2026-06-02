from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import os

from app.models.database import create_db
from app.routes import auth, cases, ioc, reports, ai_chat, malware

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="SOC Report Automator",
    description="AI-powered SOC incident report generator",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(round(time.time() - start, 4))
    return response

app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(ioc.router)
app.include_router(reports.router)
app.include_router(ai_chat.router)
app.include_router(malware.router)

@app.on_event("startup")
def on_startup():
    create_db()

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SOC Report Automator v1.0"}

@app.get("/api/test-db")
def test_db():
    import os
    from app.models.database import engine, DATABASE_URL
    try:
        with engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {
            "db_status": "connected",
            "db_url": DATABASE_URL,
            "tmp_writable": os.access("/tmp", os.W_OK),
            "cwd": os.getcwd(),
        }
    except Exception as e:
        return {"db_status": "error", "error": str(e), "db_url": DATABASE_URL}

# Serve React build (production)
STATIC_DIR = "/app/static"
STATIC_ASSETS = "/app/static/static"

if os.path.exists(STATIC_DIR):
    if os.path.exists(STATIC_ASSETS):
        app.mount("/static", StaticFiles(directory=STATIC_ASSETS), name="static")

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        if os.path.exists(f"{STATIC_DIR}/index.html"):
            return FileResponse(f"{STATIC_DIR}/index.html")
        return JSONResponse({"error": "Frontend not built yet"}, status_code=404)
