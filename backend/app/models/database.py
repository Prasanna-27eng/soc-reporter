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

# Always use /tmp — guaranteed writable on every platform
DATABASE_URL = "sqlite:////tmp/soc_reporter.db"
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

def create_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
