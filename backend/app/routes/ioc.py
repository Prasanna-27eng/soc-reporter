from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List, Optional
import json
import re

from app.models.database import Case, get_session
from app.services.auth import get_current_user, User
from app.services.virustotal import lookup_ioc, detect_ioc_type
from app.config import settings

router = APIRouter(prefix="/api/ioc", tags=["ioc"])

class IOCLookupRequest(BaseModel):
    ioc: str
    case_id: Optional[int] = None

class BulkLookupRequest(BaseModel):
    iocs: List[str]
    case_id: Optional[int] = None

class PushFindingRequest(BaseModel):
    case_id: int
    ioc: str
    vt_result: dict
    push_as_ioc: bool = True
    note: Optional[str] = None

class ExtractIOCRequest(BaseModel):
    text: str

def extract_iocs_from_text(text: str) -> dict:
    """Extract all IOC types from raw text."""
    results = {
        "ips": [],
        "hashes_md5": [],
        "hashes_sha1": [],
        "hashes_sha256": [],
        "domains": [],
        "urls": [],
        "cves": [],
        "emails": [],
    }

    # IPs (exclude private ranges display)
    ip_pattern = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
    results["ips"] = list(set(re.findall(ip_pattern, text)))

    # Hashes
    results["hashes_md5"] = list(set(re.findall(r'\b[a-fA-F0-9]{32}\b', text)))
    results["hashes_sha1"] = list(set(re.findall(r'\b[a-fA-F0-9]{40}\b', text)))
    results["hashes_sha256"] = list(set(re.findall(r'\b[a-fA-F0-9]{64}\b', text)))

    # URLs
    results["urls"] = list(set(re.findall(r'https?://[^\s<>"{}|\\^`\[\]]+', text)))

    # Domains (basic pattern, exclude IPs)
    domain_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|io|co|uk|de|ru|cn|info|biz|onion|xyz|top|tk|ml|ga|cf)\b'
    domains = re.findall(domain_pattern, text)
    results["domains"] = list(set([d for d in domains if not re.match(r'^\d+\.\d+', d)]))

    # CVEs
    results["cves"] = list(set(re.findall(r'CVE-\d{4}-\d{4,7}', text, re.IGNORECASE)))

    # Emails
    results["emails"] = list(set(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)))

    # Total flat list for VT lookups
    all_iocs = (
        results["ips"] +
        results["hashes_md5"] +
        results["hashes_sha1"] +
        results["hashes_sha256"] +
        results["domains"] +
        results["urls"]
    )
    results["all_for_lookup"] = list(set(all_iocs))[:30]  # cap at 30

    return results

@router.post("/lookup")
async def lookup_single(req: IOCLookupRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if not settings.VIRUSTOTAL_API_KEY:
        raise HTTPException(400, "VirusTotal API key not configured. Add it to your .env file.")
    result = await lookup_ioc(settings.VIRUSTOTAL_API_KEY, req.ioc.strip())
    return result

@router.post("/bulk-lookup")
async def bulk_lookup(req: BulkLookupRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if not settings.VIRUSTOTAL_API_KEY:
        raise HTTPException(400, "VirusTotal API key not configured.")
    all_results = {}
    for ioc in req.iocs[:20]:
        vt_result = await lookup_ioc(settings.VIRUSTOTAL_API_KEY, ioc.strip())
        all_results[ioc.strip()] = vt_result
    return all_results

@router.post("/push-to-case")
async def push_to_case(req: PushFindingRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    """Push selected VT findings to a specific case."""
    case = session.get(Case, req.case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    # Add IOC to case list
    if req.push_as_ioc:
        iocs = json.loads(case.iocs or "[]")
        if req.ioc not in iocs:
            iocs.append(req.ioc)
            case.iocs = json.dumps(iocs)

    # Store VT result
    vt_store = json.loads(case.vt_results or "{}")
    vt_store[req.ioc] = req.vt_result
    case.vt_results = json.dumps(vt_store)

    # Append analyst note if provided
    if req.note:
        existing_findings = case.findings or ""
        timestamp = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        case.findings = existing_findings + f"\n\n[VT Finding {timestamp}] {req.ioc}: {req.note}"

    session.add(case)
    session.commit()
    return {"ok": True, "case_number": case.case_number, "ioc": req.ioc}

@router.post("/extract")
def extract_iocs(req: ExtractIOCRequest, user: User = Depends(get_current_user)):
    """Extract all IOCs from raw pasted text."""
    return extract_iocs_from_text(req.text)

@router.get("/correlate/{ioc}")
def correlate_ioc(ioc: str, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    """Find all cases that contain this IOC."""
    cases = session.exec(select(Case)).all()
    matches = []
    for c in cases:
        iocs = json.loads(c.iocs or "[]")
        if ioc in iocs:
            matches.append({
                "case_id": c.id,
                "case_number": c.case_number,
                "title": c.title,
                "severity": c.severity,
                "status": c.status,
                "created_at": str(c.created_at),
            })
    return {"ioc": ioc, "found_in_cases": matches}
