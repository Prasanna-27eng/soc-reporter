from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import uuid

from app.models.database import Case, get_session
from app.services.auth import get_current_user, User  # noqa
from app.services.groq_ai import generate_ai_summary
from app.config import settings

router = APIRouter(prefix="/api/cases", tags=["cases"])

class CaseCreate(BaseModel):
    title: str
    severity: str
    incident_type: str
    affected_systems: str = ""
    analyst_name: str = ""
    customer_name: str = ""
    classification: str = "TLP:AMBER"
    description: str = ""
    commands_run: str = ""
    findings: str = ""
    recommendations: str = ""
    iocs: List[str] = []
    timeline_events: List[str] = []

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    incident_type: Optional[str] = None
    affected_systems: Optional[str] = None
    analyst_name: Optional[str] = None
    customer_name: Optional[str] = None
    classification: Optional[str] = None
    description: Optional[str] = None
    commands_run: Optional[str] = None
    findings: Optional[str] = None
    recommendations: Optional[str] = None
    iocs: Optional[List[str]] = None
    timeline_events: Optional[List[str]] = None

def generate_case_number():
    ts = datetime.utcnow().strftime("%Y%m%d")
    uid = str(uuid.uuid4())[:6].upper()
    return f"SOC-{ts}-{uid}"

def case_to_dict(case: Case) -> dict:
    d = case.dict()
    for json_field in ["iocs", "timeline_events", "mitre_techniques", "vt_results", "abuse_results", "urlscan_results"]:
        try:
            d[json_field] = json.loads(d[json_field] or "[]" if "results" not in json_field else d[json_field] or "{}")
        except Exception:
            d[json_field] = [] if "results" not in json_field else {}
    return d

@router.post("")
def create_case(req: CaseCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    case = Case(
        case_number=generate_case_number(),
        title=req.title,
        severity=req.severity,
        incident_type=req.incident_type,
        affected_systems=req.affected_systems,
        analyst_name=req.analyst_name,
        customer_name=req.customer_name,
        classification=req.classification,
        description=req.description,
        commands_run=req.commands_run,
        findings=req.findings,
        recommendations=req.recommendations,
        iocs=json.dumps(req.iocs),
        timeline_events=json.dumps(req.timeline_events),
    )
    session.add(case)
    session.commit()
    session.refresh(case)
    return case_to_dict(case)

@router.get("")
def list_cases(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    cases = session.exec(select(Case).order_by(Case.created_at.desc())).all()
    return [case_to_dict(c) for c in cases]

@router.get("/{case_id}")
def get_case(case_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case_to_dict(case)

@router.put("/{case_id}")
def update_case(case_id: int, req: CaseUpdate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    data = req.dict(exclude_none=True)
    for key, val in data.items():
        if key in ["iocs", "timeline_events"]:
            setattr(case, key, json.dumps(val))
        else:
            setattr(case, key, val)
    case.updated_at = datetime.utcnow()
    session.add(case)
    session.commit()
    session.refresh(case)
    return case_to_dict(case)

@router.delete("/{case_id}")
def delete_case(case_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    session.delete(case)
    session.commit()
    return {"ok": True}

@router.post("/{case_id}/generate-ai")
async def generate_ai(case_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise HTTPException(400, "Groq API key not configured")
    result = await generate_ai_summary(api_key, case_to_dict(case))
    case.ai_executive_summary = result["executive_summary"]
    case.ai_technical_summary = result["technical_summary"]
    case.mitre_techniques = json.dumps(result["mitre_techniques"])
    case.ai_severity_score = result["severity_score"]
    case.ai_severity_reasoning = result["severity_reasoning"]
    if result.get("recommendations"):
        case.recommendations = result["recommendations"]
    case.updated_at = datetime.utcnow()
    session.add(case)
    session.commit()
    session.refresh(case)
    return case_to_dict(case)
