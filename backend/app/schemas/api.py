from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=6)
    location: Optional[str] = None
    language: str = "en"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    location: Optional[str]
    language: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class FarmCreate(BaseModel):
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_acres: Optional[float] = None


class FarmResponse(BaseModel):
    id: int
    name: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    area_acres: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class FieldCreate(BaseModel):
    name: str
    crop: str
    crop_age_days: Optional[int] = None
    farm_id: int


class FieldResponse(BaseModel):
    id: int
    name: str
    crop: str
    crop_age_days: Optional[int]
    farm_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentInsight(BaseModel):
    agent: str
    problem: Optional[str] = None
    cause: Optional[str] = None
    recommendation: str
    confidence: float
    risk: str = "Low"
    details: dict[str, Any] = {}


class CoordinatorRequest(BaseModel):
    query: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    crop: Optional[str] = None
    crop_age_days: Optional[int] = None
    soil_nitrogen: Optional[float] = None
    soil_phosphorus: Optional[float] = None
    soil_potassium: Optional[float] = None
    soil_ph: Optional[float] = None
    language: str = "en"


class CoordinatorResponse(BaseModel):
    session_id: str
    summary: str
    insights: list[AgentInsight]
    total_latency_ms: float


class VisionResponse(BaseModel):
    crop: Optional[str]
    disease: Optional[str]
    pest: Optional[str]
    severity: Optional[str]
    confidence: float
    problem: str
    cause: Optional[str]
    recommendation: str
    risk: str
    unable_to_identify: bool = False
    infected_region: Optional[str] = None


class WeatherResponse(BaseModel):
    location: str
    temperature_c: float
    humidity: float
    rainfall_mm: float
    forecast_rain_probability: float
    irrigation_suggestion: str
    confidence: float
    recommendation: str
    risk: str


class SoilAnalysisRequest(BaseModel):
    nitrogen: float = Field(ge=0, le=500)
    phosphorus: float = Field(ge=0, le=500)
    potassium: float = Field(ge=0, le=500)
    ph: float = Field(ge=0, le=14)
    crop: str


class MarketResponse(BaseModel):
    crop: str
    predicted_price_per_kg: float
    best_market: str
    best_selling_date: str
    trend: str
    confidence: float
    recommendation: str
    risk: str


class SchemeResponse(BaseModel):
    schemes: list[dict[str, Any]]
    recommendation: str
    confidence: float


class RAGRequest(BaseModel):
    question: str
    language: str = "en"


class RAGResponse(BaseModel):
    answer: str
    sources: list[str]
    confidence: float


class PredictionHistory(BaseModel):
    id: int
    agent: str
    input_summary: str
    result_json: str
    confidence: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_predictions: int
    farms_count: int
    fields_count: int
    recent_alerts: list[str]
    health_score: float
