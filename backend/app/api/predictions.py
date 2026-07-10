import json
import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.agents.coordinator import CoordinatorAgent
from app.agents.market_agent import MarketAgent
from app.agents.rag_agent import RAGAgent
from app.agents.soil_agent import SoilAgent
from app.agents.weather_agent import WeatherAgent
from app.api.deps import get_current_user, get_optional_user, save_image, validate_image
from app.core.database import get_db
from app.models.entities import User
from app.repositories.base import PredictionRepository
from app.schemas.api import (
    CoordinatorRequest,
    CoordinatorResponse,
    MarketResponse,
    RAGRequest,
    RAGResponse,
    SoilAnalysisRequest,
    VisionResponse,
    WeatherResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["predictions"])

coordinator = CoordinatorAgent()


@router.post("/ndvi/analyze")
async def analyze_ndvi(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """
    Upload the Warwan data.zip (all 3 datasets) OR a single CSV/Excel.
    Returns 30-day XGBoost forecast + field health suggestions.
    """
    from app.agents.ndvi_agent import NDVIAgent
    from fastapi import HTTPException

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(413, "File exceeds 50MB limit")

    agent = NDVIAgent()
    fname = (file.filename or "upload").lower()

    if fname.endswith(".zip"):
        result = agent.analyze_zip(content)
    else:
        result = agent.analyze_file(content, file.filename or "upload.xlsx")

    return result


@router.post("/image", response_model=CoordinatorResponse)
async def analyze_image(
    file: UploadFile = File(...),
    crop: str = Form(default=""),
    latitude: float = Form(default=13.0827),
    longitude: float = Form(default=80.2707),
    location: str = Form(default="Tamil Nadu, India"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await validate_image(file)
    filepath = save_image(content, user.id)
    logger.info("Image saved: %s for user %d", filepath, user.id)

    result = await coordinator.process_image(
        content,
        crop_hint=crop or None,
        latitude=latitude,
        longitude=longitude,
        location=location,
    )

    PredictionRepository(db).create(
        user.id, "coordinator_image", f"Image: {file.filename}", json.dumps(result), None
    )

    return CoordinatorResponse(**result)


@router.post("/predict", response_model=CoordinatorResponse)
async def predict(
    request: CoordinatorRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await coordinator.process_query(request.model_dump())
    PredictionRepository(db).create(
        user.id, "coordinator", request.query or request.crop or "general", json.dumps(result), None
    )
    return CoordinatorResponse(**result)


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    latitude: float = 13.0827,
    longitude: float = 80.2707,
    crop: str = "tomato",
    user: User | None = Depends(get_optional_user),
):
    agent = WeatherAgent()
    result = await agent.analyze(latitude, longitude, crop)
    return WeatherResponse(**{k: result[k] for k in WeatherResponse.model_fields})


@router.post("/soil", response_model=dict)
async def analyze_soil(request: SoilAnalysisRequest, user: User = Depends(get_current_user)):
    agent = SoilAgent()
    return agent.analyze(request.nitrogen, request.phosphorus, request.potassium, request.ph, request.crop)


@router.get("/market", response_model=MarketResponse)
async def get_market(crop: str = "tomato", user: User | None = Depends(get_optional_user)):
    agent = MarketAgent()
    result = agent.analyze(crop)
    return MarketResponse(**{k: result[k] for k in MarketResponse.model_fields})


@router.post("/rag", response_model=RAGResponse)
async def ask_rag(request: RAGRequest, user: User = Depends(get_current_user)):
    agent = RAGAgent()
    result = agent.analyze(request.question)
    return RAGResponse(
        answer=result["answer"],
        sources=result["sources"],
        confidence=result["confidence"],
    )
