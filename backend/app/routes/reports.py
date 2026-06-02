from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlmodel import Session

from app.models.database import Case, get_session
from app.services.auth import get_current_user, User
from app.services.report_gen import generate_pdf, generate_docx
from app.routes.cases import case_to_dict

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/{case_id}/pdf")
def download_pdf(case_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    pdf_bytes = generate_pdf(case_to_dict(case))
    filename = f"{case.case_number}_report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{case_id}/docx")
def download_docx(case_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    docx_bytes = generate_docx(case_to_dict(case))
    filename = f"{case.case_number}_report.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
