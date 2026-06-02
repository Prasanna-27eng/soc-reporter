from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional
from datetime import datetime
import json

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Case(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_number: str = Field(index=True, unique=True)
    title: str
    severity: str  # Critical, High, Medium, Low
    status: str = "Open"  # Open, In Progress, Closed
    incident_type: str  # Ransomware, Phishing, BEC, Insider, Other
    affected_systems: str = ""
    analyst_name: str = ""
    customer_name: str = ""
    classification: str = "TLP:AMBER"
    description: str = ""
    commands_run: str = ""
    findings: str = ""
    recommendations: str = ""
    iocs: str = "[]"  # JSON list of IOCs
    timeline_events: str = "[]"  # JSON list of timeline events
    mitre_techniques: str = "[]"  # JSON list of ATT&CK techniques
    ai_executive_summary: str = ""
    ai_technical_summary: str = ""
    ai_severity_score: int = 0
    ai_severity_reasoning: str = ""
    vt_results: str = "{}"  # JSON dict of VT results keyed by IOC
    abuse_results: str = "{}"
    urlscan_results: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

import os
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////tmp/soc_reporter.db")
engine = create_engine(DATABASE_URL, echo=False)

def create_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
