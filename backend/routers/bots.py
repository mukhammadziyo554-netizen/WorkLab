from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def bots_status() -> dict[str, str]:
    return {"message": "Bots router ready"}
