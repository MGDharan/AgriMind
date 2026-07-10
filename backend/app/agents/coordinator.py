import logging
import time
import uuid
from typing import Optional

from app.agents.irrigation_agent import IrrigationAgent
from app.agents.market_agent import MarketAgent
from app.agents.rag_agent import RAGAgent
from app.agents.scheme_agent import GovernmentSchemeAgent
from app.agents.soil_agent import SoilAgent
from app.agents.vision_agent import VisionAgent
from app.agents.weather_agent import WeatherAgent
from app.agents.yield_agent import YieldAgent
from app.schemas.api import AgentInsight

logger = logging.getLogger(__name__)


class CoordinatorAgent:
    """Delegates tasks to specialized agents. Never solves problems itself."""

    name = "coordinator"

    def __init__(self):
        self.vision = VisionAgent()
        self.weather = WeatherAgent()
        self.soil = SoilAgent()
        self.irrigation = IrrigationAgent()
        self.yield_agent = YieldAgent()
        self.market = MarketAgent()
        self.scheme = GovernmentSchemeAgent()
        self.rag = RAGAgent()

    async def process_image(
        self,
        image_bytes: bytes,
        crop_hint: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location: str = "India",
    ) -> dict:
        """
        For image scans: run ONLY the vision agent.
        Returns disease detection + treatment recommendation only.
        Other agents (weather, market, etc.) are irrelevant here —
        the farmer just wants to know what's wrong and how to fix it.
        """
        session_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        vision_result = self.vision.analyze(image_bytes, crop_hint)

        crop = vision_result.get("crop") or crop_hint or "Unknown"
        disease = vision_result.get("disease")
        is_healthy = not disease and not vision_result.get("unable_to_identify")
        confidence = vision_result.get("confidence", 0)

        if vision_result.get("unable_to_identify"):
            summary = (
                "Could not identify the disease confidently. "
                "Please retake the photo in good daylight with the affected area clearly visible."
            )
        elif is_healthy:
            summary = f"Your {crop} plant looks healthy. Keep up good monitoring and care."
        else:
            summary = (
                f"Detected {disease} on {crop} "
                f"({confidence:.0f}% confidence). "
                f"Follow the treatment steps below."
            )

        total_ms = round((time.perf_counter() - start) * 1000, 1)

        insight = AgentInsight(
            agent="vision",
            problem=vision_result.get("problem"),
            cause=vision_result.get("cause"),
            recommendation=vision_result.get("treatment", vision_result.get("recommendation", "")),
            confidence=confidence,
            risk=vision_result.get("risk", "Unknown"),
            details=vision_result,
        )

        logger.info(
            "Vision scan session %s: %s on %s (%.1f%%) in %.0fms",
            session_id, disease or "healthy", crop, confidence, total_ms,
        )

        return {
            "session_id": session_id,
            "summary": summary,
            "insights": [insight.model_dump()],
            "total_latency_ms": total_ms,
        }

    async def process_query(self, request: dict) -> dict:
        session_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()
        insights: list[AgentInsight] = []
        crop = request.get("crop", "Tomato")
        lat = request.get("latitude", 13.0827)
        lng = request.get("longitude", 80.2707)
        location = request.get("location", "Tamil Nadu, India")

        if request.get("query"):
            rag_result = self.rag.analyze(request["query"])
            insights.append(AgentInsight(
                agent="rag",
                problem=rag_result.get("problem"),
                cause=None,
                recommendation=rag_result.get("answer", ""),
                confidence=rag_result.get("confidence", 0),
                risk=rag_result.get("risk", "Low"),
                details=rag_result,
            ))

        if all(request.get(k) is not None for k in ("soil_nitrogen", "soil_phosphorus", "soil_potassium", "soil_ph")):
            soil_result = self.soil.analyze(
                request["soil_nitrogen"],
                request["soil_phosphorus"],
                request["soil_potassium"],
                request["soil_ph"],
                crop,
            )
            insights.append(AgentInsight(
                agent="soil",
                problem=soil_result.get("problem"),
                cause=soil_result.get("cause"),
                recommendation=soil_result.get("recommendation", ""),
                confidence=soil_result.get("confidence", 0),
                risk=soil_result.get("risk", "Low"),
                details=soil_result,
            ))

        weather_result = await self.weather.analyze(lat, lng, crop)
        insights.append(AgentInsight(
            agent="weather",
            problem=weather_result.get("problem"),
            cause=weather_result.get("cause"),
            recommendation=weather_result.get("recommendation", ""),
            confidence=weather_result.get("confidence", 0),
            risk=weather_result.get("risk", "Low"),
            details=weather_result,
        ))

        market_result = self.market.analyze(crop)
        insights.append(AgentInsight(
            agent="market",
            problem=market_result.get("problem"),
            cause=market_result.get("cause"),
            recommendation=market_result.get("recommendation", ""),
            confidence=market_result.get("confidence", 0),
            risk=market_result.get("risk", "Low"),
            details=market_result,
        ))

        scheme_result = self.scheme.analyze(location, crop)
        insights.append(AgentInsight(
            agent="government_scheme",
            problem=scheme_result.get("problem"),
            cause=scheme_result.get("cause"),
            recommendation=scheme_result.get("recommendation", ""),
            confidence=scheme_result.get("confidence", 0),
            risk=scheme_result.get("risk", "Low"),
            details=scheme_result,
        ))

        total_ms = (time.perf_counter() - start) * 1000
        summary = f"Analysis complete for {crop}. {len(insights)} agents consulted."

        return {
            "session_id": session_id,
            "summary": summary,
            "insights": [i.model_dump() for i in insights],
            "total_latency_ms": round(total_ms, 1),
        }
