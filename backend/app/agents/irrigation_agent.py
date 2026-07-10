import logging
import time

logger = logging.getLogger(__name__)


class IrrigationAgent:
    """Calculates water requirements based on crop, soil, and weather."""

    name = "irrigation"

    WATER_NEED = {"tomato": 25, "rice": 50, "wheat": 20, "potato": 30, "corn": 28, "cotton": 35}

    def analyze(
        self,
        crop: str,
        rainfall_mm: float,
        temperature_c: float,
        soil_moisture_pct: float = 50.0,
    ) -> dict:
        start = time.perf_counter()
        crop_key = crop.lower().strip()
        base_need = self.WATER_NEED.get(crop_key, 25)

        temp_factor = 1.0 + max(0, (temperature_c - 25) * 0.03)
        rain_reduction = min(rainfall_mm * 0.5, base_need * 0.8)
        adjusted = max(0, base_need * temp_factor - rain_reduction)

        if soil_moisture_pct < 30:
            adjusted *= 1.3
            risk = "High"
            problem = "Critical soil moisture deficit"
        elif soil_moisture_pct < 50:
            adjusted *= 1.1
            risk = "Medium"
            problem = "Below optimal soil moisture"
        else:
            risk = "Low"
            problem = "Adequate soil moisture"

        recommendation = (
            f"Apply {adjusted:.1f} mm of water to {crop} fields. "
            f"Best time: 5–7 AM to minimize evaporation."
        )

        latency = (time.perf_counter() - start) * 1000
        return {
            "crop": crop,
            "water_requirement_mm": round(adjusted, 1),
            "base_requirement_mm": base_need,
            "confidence": 85.0,
            "recommendation": recommendation,
            "risk": risk,
            "problem": problem,
            "cause": f"Temp {temperature_c}°C, rainfall {rainfall_mm}mm, soil moisture {soil_moisture_pct}%",
            "latency_ms": round(latency, 1),
        }
