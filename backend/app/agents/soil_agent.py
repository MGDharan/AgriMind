import logging
import time

logger = logging.getLogger(__name__)

FERTILIZER_GUIDE = {
    "tomato": {"n": (40, 80), "p": (30, 60), "k": (40, 80), "ph": (6.0, 6.8)},
    "rice": {"n": (50, 100), "p": (25, 50), "k": (25, 50), "ph": (5.5, 6.5)},
    "wheat": {"n": (40, 70), "p": (20, 40), "k": (20, 40), "ph": (6.0, 7.0)},
    "potato": {"n": (50, 90), "p": (40, 70), "k": (80, 120), "ph": (5.0, 6.0)},
}


class SoilAgent:
    """Analyzes soil nutrients and recommends fertilizer."""

    name = "soil"

    def analyze(self, nitrogen: float, phosphorus: float, potassium: float, ph: float, crop: str) -> dict:
        start = time.perf_counter()
        crop_key = crop.lower().strip()
        guide = FERTILIZER_GUIDE.get(crop_key, FERTILIZER_GUIDE["tomato"])

        deficiencies = []
        if nitrogen < guide["n"][0]:
            deficiencies.append("Nitrogen")
        if phosphorus < guide["p"][0]:
            deficiencies.append("Phosphorus")
        if potassium < guide["k"][0]:
            deficiencies.append("Potassium")
        if ph < guide["ph"][0]:
            deficiencies.append("pH too low (acidic)")
        elif ph > guide["ph"][1]:
            deficiencies.append("pH too high (alkaline)")

        if deficiencies:
            rec_parts = []
            if "Nitrogen" in deficiencies:
                rec_parts.append("Apply Urea (46-0-0) at 25 kg/acre")
            if "Phosphorus" in deficiencies:
                rec_parts.append("Apply DAP (18-46-0) at 20 kg/acre")
            if "Potassium" in deficiencies:
                rec_parts.append("Apply MOP (0-0-60) at 15 kg/acre")
            if any("pH" in d for d in deficiencies):
                rec_parts.append("Apply agricultural lime if acidic, or sulfur if alkaline")
            recommendation = ". ".join(rec_parts) + "."
            risk = "High" if len(deficiencies) >= 3 else "Medium"
            problem = f"Soil nutrient deficiency: {', '.join(deficiencies)}"
        else:
            recommendation = f"Soil nutrients are within optimal range for {crop}. Maintain current fertilization schedule."
            risk = "Low"
            problem = "Soil health is good"

        latency = (time.perf_counter() - start) * 1000
        logger.info("Soil agent: %s in %.0fms", problem, latency)

        return {
            "nitrogen": nitrogen,
            "phosphorus": phosphorus,
            "potassium": potassium,
            "ph": ph,
            "crop": crop,
            "deficiencies": deficiencies,
            "confidence": 88.0,
            "recommendation": recommendation,
            "risk": risk,
            "problem": problem,
            "cause": "Soil test values compared against crop-specific optimal ranges",
            "latency_ms": round(latency, 1),
        }
