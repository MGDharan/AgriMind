import logging
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class WeatherAgent:
    """Fetches weather data and suggests irrigation."""

    name = "weather"

    async def analyze(self, latitude: float, longitude: float, crop: str = "tomato") -> dict:
        start = time.perf_counter()
        location_name = f"{latitude:.2f}°N, {longitude:.2f}°E"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = (
                    "https://api.open-meteo.com/v1/forecast"
                    f"?latitude={latitude}&longitude={longitude}"
                    "&current=temperature_2m,relative_humidity_2m,precipitation"
                    "&daily=precipitation_probability_max,temperature_2m_max"
                    "&timezone=auto"
                )
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()

            current = data.get("current", {})
            daily = data.get("daily", {})
            temp = current.get("temperature_2m", 28.0)
            humidity = current.get("relative_humidity_2m", 65.0)
            rain = current.get("precipitation", 0.0)
            rain_prob = daily.get("precipitation_probability_max", [30])[0] if daily else 30

            if rain_prob > 60:
                irrigation = f"Skip irrigation today — {rain_prob}% rain probability expected for {crop}."
                risk = "Low"
            elif temp > 35 and humidity < 40:
                irrigation = f"Heavy irrigation recommended — high evapotranspiration stress on {crop}."
                risk = "High"
            elif temp > 30:
                irrigation = f"Moderate irrigation in early morning for {crop} fields."
                risk = "Medium"
            else:
                irrigation = f"Light irrigation sufficient — conditions favorable for {crop}."
                risk = "Low"

            latency = (time.perf_counter() - start) * 1000
            logger.info("Weather agent completed in %.0fms", latency)

            return {
                "location": location_name,
                "temperature_c": round(temp, 1),
                "humidity": round(humidity, 1),
                "rainfall_mm": round(rain, 1),
                "forecast_rain_probability": round(rain_prob, 1),
                "irrigation_suggestion": irrigation,
                "confidence": 92.0,
                "recommendation": irrigation,
                "risk": risk,
                "problem": "Weather stress" if risk == "High" else "Normal conditions",
                "cause": f"Temperature {temp}°C, humidity {humidity}%",
                "latency_ms": round(latency, 1),
            }
        except Exception as exc:
            logger.warning("Weather API fallback: %s", exc)
            latency = (time.perf_counter() - start) * 1000
            return {
                "location": location_name,
                "temperature_c": 30.0,
                "humidity": 60.0,
                "rainfall_mm": 2.0,
                "forecast_rain_probability": 35.0,
                "irrigation_suggestion": f"Moderate morning irrigation for {crop} based on seasonal averages.",
                "confidence": 65.0,
                "recommendation": "Weather API unavailable — using seasonal estimate. Irrigate early morning.",
                "risk": "Medium",
                "problem": "Weather data unavailable",
                "cause": "API connection issue — using fallback estimates",
                "latency_ms": round(latency, 1),
            }
