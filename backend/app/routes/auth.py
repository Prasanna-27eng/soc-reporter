from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/status")
def status():
    return {"status": "no auth required"}
