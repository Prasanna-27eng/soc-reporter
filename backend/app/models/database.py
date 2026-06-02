from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional
from datetime import datetime
import os

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Case(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_number: str = Field(index=True, unique=True)
    title: str
    severity: str
    status: str = "Open"
    incident_type: str
    affected_systems: str = ""
    analyst_name: str = ""
    customer_name: str = ""
    classification: str = "TLP:AMBER"
    description: str = ""
    commands_run: str = ""
    findings: str = ""
    recommendations: str = ""
    iocs: str = "[]"
    timeline_events: str = "[]"
    mitre_techniques: str = "[]"
    ai_executive_summary: str = ""
    ai_technical_summary: str = ""
    ai_severity_score: int = 0
    ai_severity_reasoning: str = ""
    vt_results: str = "{}"
    abuse_results: str = "{}"
    urlscan_results: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Database path — configurable via DATABASE_URL env var.
# For Render persistent disk: set DATABASE_URL=sqlite:////var/data/soc_reporter.db
# and add a Render Disk mounted at /var/data in the Render dashboard.
# Default falls back to /tmp (ephemeral — data lost on container restart).
_raw_url = os.getenv("DATABASE_URL", "sqlite:////tmp/soc_reporter.db")

# Auto-create directory for SQLite paths so startup never fails
if _raw_url.startswith("sqlite:///"):
    _db_path = _raw_url.replace("sqlite:///", "", 1)
    _db_dir = os.path.dirname(_db_path)
    if _db_dir and _db_dir not in ("/", "/tmp"):
        os.makedirs(_db_dir, exist_ok=True)

DATABASE_URL = _raw_url
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

def create_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
