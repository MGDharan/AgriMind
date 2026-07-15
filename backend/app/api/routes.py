import uuid
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.entities import User
from app.repositories.base import FarmRepository, FieldRepository, PredictionRepository, UserRepository
from app.schemas.api import (
    DashboardStats,
    FarmCreate,
    FarmResponse,
    FieldCreate,
    FieldResponse,
    PredictionHistory,
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
)
from app.core.security import create_access_token, verify_password
from app.repositories.base import UserRepository

router = APIRouter(prefix="/api", tags=["core"])


@router.post("/auth/register", response_model=TokenResponse)
def register(data: UserCreate, db: Session = Depends(get_db)):
    repo = UserRepository(db)
    if repo.get_by_email(data.email):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Email already registered")
    user = repo.create(data.email, data.full_name, data.password, data.location, data.language)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/auth/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    repo = UserRepository(db)
    user = repo.get_by_email(data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/auth/google/login")
def google_login() -> RedirectResponse:
    settings = get_settings()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")


@router.get("/auth/google/callback")
async def google_callback(code: Optional[str] = None, error: Optional[str] = None, db: Session = Depends(get_db)) -> RedirectResponse:
    if error:
        raise HTTPException(status_code=400, detail=f"Google OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    settings = get_settings()
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_oauth_redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Google token exchange failed")

    data = token_resp.json()
    id_token = data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Google did not return an ID token")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        id_info = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to verify Google token: {exc}")

    if not id_info.get("email_verified"):
        raise HTTPException(status_code=400, detail="Google email not verified")

    email = id_info.get("email")
    full_name = id_info.get("name") or email.split("@")[0]
    if not email:
        raise HTTPException(status_code=400, detail="Google account email missing")

    repo = UserRepository(db)
    user = repo.get_by_email(email)
    if not user:
        user = repo.create(
            email=email,
            full_name=full_name,
            password=uuid.uuid4().hex,
            location="",
            language="en",
        )

    token = create_access_token(str(user.id))
    redirect_url = f"{settings.frontend_url}/login?token={token}"
    return RedirectResponse(redirect_url)


@router.get("/auth/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.get("/history", response_model=list[PredictionHistory])
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    preds = PredictionRepository(db).list_by_user(user.id)
    return [PredictionHistory.model_validate(p) for p in preds]


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pred_repo = PredictionRepository(db)
    farm_repo = FarmRepository(db)
    farms = farm_repo.list_by_owner(user.id)
    fields_count = sum(len(f.fields) for f in farms)
    total = pred_repo.count_by_user(user.id)
    return DashboardStats(
        total_predictions=total,
        farms_count=len(farms),
        fields_count=fields_count,
        recent_alerts=["Monitor irrigation schedule", "Check for pest activity this week"],
        health_score=min(95.0, 70.0 + total * 2),
    )


@router.post("/farms", response_model=FarmResponse)
def create_farm(data: FarmCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = FarmRepository(db).create(
        user.id, data.name, data.location, data.latitude, data.longitude, data.area_acres
    )
    return FarmResponse.model_validate(farm)


@router.get("/farms", response_model=list[FarmResponse])
def list_farms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farms = FarmRepository(db).list_by_owner(user.id)
    return [FarmResponse.model_validate(f) for f in farms]


@router.post("/fields", response_model=FieldResponse)
def create_field(data: FieldCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = FieldRepository(db).create(data.farm_id, data.name, data.crop, data.crop_age_days)
    return FieldResponse.model_validate(field)


@router.get("/fields", response_model=list[FieldResponse])
def list_fields(farm_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fields = FieldRepository(db).list_by_farm(farm_id)
    return [FieldResponse.model_validate(f) for f in fields]


@router.get("/fields/{field_id}/schedule")
async def get_field_schedule(
    field_id: int,
    current_hour: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a full crop schedule + time-aware irrigation advice.
    Pass current_hour (0-23, local time at user's device) for accurate window suggestion.
    """
    from fastapi import HTTPException
    from app.agents.schedule_agent import CropScheduleAgent
    from app.agents.weather_agent import WeatherAgent

    field = FieldRepository(db).get_by_id(field_id)
    if not field:
        raise HTTPException(404, "Field not found")

    farm = FarmRepository(db).get_by_id(field.farm_id)
    lat = (farm.latitude or 13.0827) if farm else 13.0827
    lng = (farm.longitude or 80.2707) if farm else 80.2707
    location = (farm.location or "India") if farm else "India"

    weather_agent = WeatherAgent()
    weather = await weather_agent.analyze(lat, lng, field.crop)

    agent = CropScheduleAgent()
    schedule = agent.analyze(
        crop=field.crop,
        crop_age_days=field.crop_age_days or 0,
        location=location,
        temperature_c=weather["temperature_c"],
        humidity=weather["humidity"],
        rain_prob=weather["forecast_rain_probability"],
        current_hour=current_hour,
    )
    schedule["weather"] = {
        "temperature_c": weather["temperature_c"],
        "humidity": weather["humidity"],
        "rainfall_mm": weather["rainfall_mm"],
        "rain_probability": weather["forecast_rain_probability"],
    }
    return schedule


@router.post("/fields/{field_id}/notify")
async def send_field_notification(
    field_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send irrigation reminder email to the user for this field."""
    from fastapi import HTTPException
    from app.agents.schedule_agent import CropScheduleAgent
    from app.agents.weather_agent import WeatherAgent
    from app.services.email_service import send_irrigation_alert

    field = FieldRepository(db).get_by_id(field_id)
    if not field:
        raise HTTPException(404, "Field not found")

    farm = FarmRepository(db).get_by_id(field.farm_id)
    lat = (farm.latitude or 13.0827) if farm else 13.0827
    lng = (farm.longitude or 80.2707) if farm else 80.2707
    location = (farm.location or "India") if farm else "India"

    weather_agent = WeatherAgent()
    weather = await weather_agent.analyze(lat, lng, field.crop)

    agent = CropScheduleAgent()
    schedule = agent.analyze(
        crop=field.crop,
        crop_age_days=field.crop_age_days or 0,
        location=location,
        temperature_c=weather["temperature_c"],
        humidity=weather["humidity"],
        rain_prob=weather["forecast_rain_probability"],
    )

    advice = schedule["irrigation_advice"]
    sent = False

    if advice["should_water"]:
        sent = send_irrigation_alert(
            to_email=user.email,
            to_name=user.full_name,
            crop=field.crop,
            field_name=field.name,
            farm_name=farm.name if farm else "Your Farm",
            window_start=advice["window_start"],
            window_end=advice["window_end"],
            reason=advice["reason"],
            temperature_c=weather["temperature_c"],
            location=location,
            upcoming_events=schedule.get("upcoming_events", []),
        )

    return {
        "sent": sent,
        "should_water": advice["should_water"],
        "window": f"{advice['window_start']}–{advice['window_end']}" if advice["should_water"] else None,
        "reason": advice["reason"],
        "email": user.email,
        "smtp_configured": sent or not advice["should_water"],
    }
