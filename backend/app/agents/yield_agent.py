import logging
import time

logger = logging.getLogger(__name__)

YIELD_BASE = {"tomato": 25, "rice": 40, "wheat": 30, "potato": 20, "corn": 35}


class YieldAgent:
    """Predicts expected yield based on multiple factors."""

    name = "yield"

    def analyze(
        self,
        crop: str,
        disease_severity: str | None = None,
        temperature_c: float = 28.0,
        crop_age_days: int = 60,
        soil_health: str = "good",
    ) -> dict:
        start = time.perf_counter()
        crop_key = crop.lower().strip()
        base = YIELD_BASE.get(crop_key, 25)

        factor = 1.0
        if disease_severity == "High":
            factor *= 0.6
        elif disease_severity == "Medium":
            factor *= 0.8
        elif disease_severity == "Low":
            factor *= 0.95

        if temperature_c > 38:
            factor *= 0.85
        elif temperature_c < 10:
            factor *= 0.7

        if soil_health == "poor":
            factor *= 0.75
        elif soil_health == "fair":
            factor *= 0.9

        maturity = min(1.0, crop_age_days / 90)
        predicted = base * factor * (0.5 + 0.5 * maturity)

        if factor < 0.7:
            risk = "High"
            problem = "Significant yield reduction expected"
        elif factor < 0.9:
            risk = "Medium"
            problem = "Moderate yield impact"
        else:
            risk = "Low"
            problem = "Normal yield expected"

        recommendation = (
            f"Expected yield: {predicted:.1f} tonnes/hectare for {crop}. "
            f"{'Treat disease immediately to recover 20-30% yield.' if disease_severity in ('High', 'Medium') else 'Maintain current practices.'}"
        )

        latency = (time.perf_counter() - start) * 1000
        return {
            "crop": crop,
            "predicted_yield_tonnes_per_hectare": round(predicted, 1),
            "base_yield": base,
            "yield_factor": round(factor, 2),
            "confidence": 78.0,
            "recommendation": recommendation,
            "risk": risk,
            "problem": problem,
            "cause": f"Disease: {disease_severity or 'None'}, temp: {temperature_c}°C, age: {crop_age_days} days",
            "latency_ms": round(latency, 1),
        }
