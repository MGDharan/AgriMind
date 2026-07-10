import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.knowledge import router as knowledge_router
from app.api.predictions import router as predictions_router
from app.api.routes import router as core_router
from app.core.config import get_settings
from app.core.database import Base, engine, SessionLocal
from app.core.logging_config import setup_logging

logger = logging.getLogger(__name__)


# ── Daily email scheduler ─────────────────────────────────────────────────────

async def _run_daily_emails() -> None:
    """
    Runs every day at 06:00 server time.
    For every active user with farms+fields, fetches live weather and
    sends irrigation + upcoming-event emails automatically.
    """
    from app.agents.schedule_agent import CropScheduleAgent
    from app.agents.weather_agent import WeatherAgent
    from app.models.entities import User, Farm, Field
    from app.services.email_service import send_irrigation_alert, send_pesticide_alert

    logger.info("Daily email scheduler: starting run")
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active == True).all()
        for user in users:
            farms = db.query(Farm).filter(Farm.owner_id == user.id).all()
            for farm in farms:
                fields = db.query(Field).filter(Field.farm_id == farm.id).all()
                lat = farm.latitude or 13.0827
                lng = farm.longitude or 80.2707
                location = farm.location or "India"

                for field in fields:
                    try:
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
                            current_hour=6,   # always morning context for 6 AM send
                        )
                        advice = schedule["irrigation_advice"]

                        # ① Irrigation email
                        if advice["should_water"]:
                            send_irrigation_alert(
                                to_email=user.email,
                                to_name=user.full_name,
                                crop=field.crop,
                                field_name=field.name,
                                farm_name=farm.name,
                                window_start=advice["window_start"],
                                window_end=advice["window_end"],
                                reason=advice["reason"],
                                temperature_c=weather["temperature_c"],
                                location=location,
                                upcoming_events=schedule.get("upcoming_events", []),
                            )
                        else:
                            logger.info(
                                "Skip irrigation email for %s – rain expected (%s%%)",
                                user.email, weather["forecast_rain_probability"],
                            )

                        # ② Pesticide/fertilizer email for today's events
                        for ev in schedule.get("upcoming_events", []):
                            if ev["days_from_now"] == 0:
                                send_pesticide_alert(
                                    to_email=user.email,
                                    to_name=user.full_name,
                                    crop=field.crop,
                                    field_name=field.name,
                                    product=ev["product"],
                                    reason=ev["reason"],
                                    date_str=ev["date"],
                                )
                    except Exception as exc:
                        logger.error(
                            "Daily email failed for user=%s field=%s: %s",
                            user.email, field.name, exc,
                        )
    finally:
        db.close()
    logger.info("Daily email scheduler: run complete")


async def _scheduler_loop() -> None:
    """
    Loop that fires at 06:00 local time every day.
    Runs in the background as an asyncio task.
    """
    while True:
        now = datetime.now()
        # Seconds until next 06:00
        next_6am = now.replace(hour=6, minute=0, second=0, microsecond=0)
        if now >= next_6am:
            next_6am = next_6am.replace(day=next_6am.day + 1)
        wait_seconds = (next_6am - now).total_seconds()
        logger.info(
            "Daily scheduler: next run at %s (in %.0f minutes)",
            next_6am.strftime("%Y-%m-%d %H:%M"),
            wait_seconds / 60,
        )
        await asyncio.sleep(wait_seconds)
        await _run_daily_emails()


# ── App factory ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    Base.metadata.create_all(bind=engine)
    os.makedirs(get_settings().upload_dir, exist_ok=True)

    # Start daily scheduler as a background task
    scheduler_task = asyncio.create_task(_scheduler_loop())
    logger.info("Daily irrigation email scheduler started")

    yield

    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="AI Multi-Agent Smart Agriculture Platform",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(core_router)
    app.include_router(predictions_router)
    app.include_router(knowledge_router)

    if os.path.isdir(settings.upload_dir):
        app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

    @app.get("/health")
    def health():
        return {"status": "healthy", "version": settings.app_version}

    return app


app = create_app()
