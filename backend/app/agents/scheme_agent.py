import logging
import time

logger = logging.getLogger(__name__)

SCHEMES_DB = [
    {
        "name": "PM-KISAN",
        "description": "₹6,000/year direct income support in 3 installments",
        "eligibility": "All landholding farmer families",
        "benefit": "₹6,000/year",
        "link": "https://pmkisan.gov.in",
    },
    {
        "name": "PMFBY (Crop Insurance)",
        "description": "Comprehensive crop insurance against natural calamities",
        "eligibility": "All farmers growing notified crops",
        "benefit": "Up to full sum insured",
        "link": "https://pmfby.gov.in",
    },
    {
        "name": "KCC (Kisan Credit Card)",
        "description": "Timely credit for cultivation and farm maintenance",
        "eligibility": "Farmers with cultivable land",
        "benefit": "Credit up to ₹3 lakh at subsidized rates",
        "link": "https://www.nabard.org",
    },
    {
        "name": "Soil Health Card Scheme",
        "description": "Free soil testing and nutrient recommendations",
        "eligibility": "All farmers",
        "benefit": "Free soil analysis every 2 years",
        "link": "https://soilhealth.dac.gov.in",
    },
    {
        "name": "National Mission on Sustainable Agriculture",
        "description": "Support for organic farming and climate-resilient practices",
        "eligibility": "Farmers adopting sustainable practices",
        "benefit": "Subsidies on organic inputs and equipment",
        "link": "https://nmsa.dac.gov.in",
    },
]


class GovernmentSchemeAgent:
    """Recommends government subsidies and schemes."""

    name = "government_scheme"

    def analyze(self, location: str, crop: str) -> dict:
        start = time.perf_counter()
        schemes = SCHEMES_DB.copy()

        if crop.lower() in ("rice", "wheat"):
            schemes.insert(0, {
                "name": "MSP Procurement",
                "description": f"Minimum Support Price guarantee for {crop}",
                "eligibility": f"Farmers growing {crop} in notified areas",
                "benefit": "Guaranteed minimum price at APMC",
                "link": "https://agricoop.gov.in",
            })

        recommendation = (
            f"Based on your location ({location}) and crop ({crop}), "
            f"we recommend enrolling in PM-KISAN for income support and PMFBY for crop insurance. "
            f"Get a free Soil Health Card to optimize fertilizer use."
        )

        latency = (time.perf_counter() - start) * 1000
        return {
            "schemes": schemes[:4],
            "recommendation": recommendation,
            "confidence": 90.0,
            "problem": "Available government support programs",
            "cause": f"Location: {location}, Crop: {crop}",
            "risk": "Low",
            "latency_ms": round(latency, 1),
        }
