from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel
from typing import List, Optional
import json
import httpx

from app.models.database import Case, get_session
from app.services.auth import get_current_user, User
from app.routes.cases import case_to_dict
from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])

GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    case_id: int
    messages: List[ChatMessage]

class CVERequest(BaseModel):
    cve_id: str

@router.post("/case")
async def chat_about_case(req: ChatRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if not settings.GROQ_API_KEY:
        raise HTTPException(400, "Groq API key not configured.")
    case = session.get(Case, req.case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    case_data = case_to_dict(case)
    system_prompt = f"""You are a senior SOC analyst assistant helping with an active incident investigation.

CURRENT CASE CONTEXT:
- Case: {case_data['case_number']} — {case_data['title']}
- Severity: {case_data['severity']} | Type: {case_data['incident_type']} | Status: {case_data['status']}
- Affected Systems: {case_data['affected_systems']}
- Description: {case_data['description']}
- Findings so far: {case_data['findings']}
- IOCs: {', '.join(case_data['iocs']) if case_data['iocs'] else 'None yet'}
- Commands run: {case_data['commands_run']}
- MITRE techniques mapped: {json.dumps(case_data.get('mitre_techniques', []))}

Respond as a knowledgeable, concise SOC analyst. Give actionable advice. Use bullet points for steps. Reference specific IOCs or findings when relevant. Keep responses focused and practical."""

    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in req.messages]

    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": MODEL, "messages": messages, "temperature": 0.4, "max_tokens": 1024}

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(GROQ_BASE, headers=headers, json=payload)
        r.raise_for_status()
        reply = r.json()["choices"][0]["message"]["content"]

    return {"reply": reply}

@router.get("/cve/{cve_id}")
async def lookup_cve(cve_id: str, user: User = Depends(get_current_user)):
    """Fetch CVE details from NVD (free, no API key needed)."""
    cve_id = cve_id.upper().strip()
    if not cve_id.startswith("CVE-"):
        cve_id = f"CVE-{cve_id}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}",
                headers={"User-Agent": "SOC-Reporter/1.0"}
            )
            r.raise_for_status()
            data = r.json()
            vulns = data.get("vulnerabilities", [])
            if not vulns:
                return {"cve_id": cve_id, "error": "CVE not found"}
            cve = vulns[0].get("cve", {})
            desc = next((d["value"] for d in cve.get("descriptions", []) if d["lang"] == "en"), "No description")
            metrics = cve.get("metrics", {})
            cvss_score = None
            cvss_severity = None
            for version in ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]:
                if version in metrics and metrics[version]:
                    cvss_data = metrics[version][0].get("cvssData", {})
                    cvss_score = cvss_data.get("baseScore")
                    cvss_severity = metrics[version][0].get("baseSeverity") or cvss_data.get("baseSeverity")
                    break
            refs = [r["url"] for r in cve.get("references", [])[:5]]
            return {
                "cve_id": cve_id,
                "description": desc,
                "cvss_score": cvss_score,
                "cvss_severity": cvss_severity,
                "published": cve.get("published", "N/A")[:10],
                "last_modified": cve.get("lastModified", "N/A")[:10],
                "references": refs,
            }
    except Exception as e:
        return {"cve_id": cve_id, "error": str(e)}
