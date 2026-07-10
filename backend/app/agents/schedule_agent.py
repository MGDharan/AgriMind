"""
Crop Schedule Agent
===================
Analyses a field (crop + age + location) and produces:
  - Full growth stage plan with key dates
  - Real-time-aware irrigation window (adjusts based on current time of day)
  - Pesticide / fertiliser events
  - Predicted harvest date

All crop data is from ICAR / FAO agronomic guidelines.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)


# ── Crop knowledge base ───────────────────────────────────────────────────────

CROP_DATA: dict[str, dict] = {
    "tomato": {
        "total_days": 90,
        "water_per_week_mm": 25,
        "stages": [
            {"name": "Germination",      "start_day": 0,  "end_day": 7,  "water_need": "low",    "notes": "Keep soil moist; avoid waterlogging."},
            {"name": "Seedling",         "start_day": 8,  "end_day": 20, "water_need": "medium", "notes": "Water daily in small amounts; ensure good drainage."},
            {"name": "Vegetative",       "start_day": 21, "end_day": 45, "water_need": "high",   "notes": "Increase watering; start NPK fertilizer (19-19-19)."},
            {"name": "Flowering",        "start_day": 46, "end_day": 65, "water_need": "high",   "notes": "Consistent moisture critical; avoid stress. Apply potassium boost."},
            {"name": "Fruit Development","start_day": 66, "end_day": 80, "water_need": "high",   "notes": "Maintain even moisture to prevent blossom end rot."},
            {"name": "Ripening",         "start_day": 81, "end_day": 90, "water_need": "medium", "notes": "Reduce water slightly to improve fruit quality and sugar content."},
        ],
        "pesticide_events": [
            {"day": 20, "product": "Neem oil spray",              "reason": "Preventive against aphids and whitefly"},
            {"day": 35, "product": "Chlorothalonil fungicide",     "reason": "Preventive against early blight"},
            {"day": 50, "product": "Copper fungicide",            "reason": "Preventive against bacterial spot and late blight"},
            {"day": 65, "product": "Neem oil or insecticidal soap","reason": "Spider mite control during fruiting"},
        ],
        "fertilizer_events": [
            {"day": 1,  "product": "DAP (18-46-0) 20 kg/acre",    "stage": "Basal dose at planting"},
            {"day": 25, "product": "Urea 10 kg/acre",              "stage": "Top dress at vegetative stage"},
            {"day": 50, "product": "MOP (0-0-60) 15 kg/acre",     "stage": "Potassium boost at flowering"},
        ],
    },
    "rice": {
        "total_days": 120,
        "water_per_week_mm": 50,
        "stages": [
            {"name": "Nursery",          "start_day": 0,  "end_day": 25,  "water_need": "medium", "notes": "Keep nursery bed moist; transplant when seedlings are 20-25 days old."},
            {"name": "Transplanting",    "start_day": 26, "end_day": 35,  "water_need": "high",   "notes": "Maintain 2-5 cm standing water after transplanting."},
            {"name": "Tillering",        "start_day": 36, "end_day": 65,  "water_need": "high",   "notes": "Maintain standing water; apply nitrogen fertiliser."},
            {"name": "Panicle Initiation","start_day": 66, "end_day": 85, "water_need": "high",   "notes": "Critical stage — never let field dry. Apply potassium."},
            {"name": "Heading",          "start_day": 86, "end_day": 100, "water_need": "high",   "notes": "Maintain standing water; monitor for blast disease."},
            {"name": "Ripening",         "start_day": 101,"end_day": 120, "water_need": "low",    "notes": "Drain field 2 weeks before harvest for easy harvesting."},
        ],
        "pesticide_events": [
            {"day": 40, "product": "Carbendazim fungicide",        "reason": "Brown spot prevention during tillering"},
            {"day": 70, "product": "Tricyclazole fungicide",       "reason": "Blast prevention at panicle initiation"},
            {"day": 90, "product": "Chlorpyrifos insecticide",     "reason": "Stem borer and leaf folder control"},
        ],
        "fertilizer_events": [
            {"day": 1,  "product": "DAP 25 kg/acre + Urea 15 kg/acre", "stage": "Basal dose at transplanting"},
            {"day": 40, "product": "Urea 20 kg/acre",                  "stage": "Top dress at tillering"},
            {"day": 70, "product": "MOP 20 kg/acre",                   "stage": "Top dress at panicle initiation"},
        ],
    },
    "wheat": {
        "total_days": 110,
        "water_per_week_mm": 20,
        "stages": [
            {"name": "Germination",      "start_day": 0,  "end_day": 10, "water_need": "low",    "notes": "Crown root irrigation immediately after sowing."},
            {"name": "Seedling",         "start_day": 11, "end_day": 25, "water_need": "low",    "notes": "First irrigation (CRI) at 20-25 DAS is critical."},
            {"name": "Tillering",        "start_day": 26, "end_day": 45, "water_need": "medium", "notes": "Second irrigation at tillering; apply urea top dressing."},
            {"name": "Jointing",         "start_day": 46, "end_day": 65, "water_need": "high",   "notes": "Third irrigation; most critical water-sensitive stage."},
            {"name": "Heading/Flowering","start_day": 66, "end_day": 85, "water_need": "high",   "notes": "Fourth irrigation; apply potassium if deficient."},
            {"name": "Grain Filling",    "start_day": 86, "end_day": 110,"water_need": "medium", "notes": "Fifth irrigation; reduce water 2 weeks before harvest."},
        ],
        "pesticide_events": [
            {"day": 30, "product": "Isoproturon herbicide",         "reason": "Weed control at tillering"},
            {"day": 55, "product": "Propiconazole fungicide",       "reason": "Rust prevention at jointing"},
            {"day": 75, "product": "Mancozeb fungicide",            "reason": "Yellow rust and powdery mildew control"},
        ],
        "fertilizer_events": [
            {"day": 1,  "product": "DAP 20 kg/acre + Urea 20 kg/acre", "stage": "Basal dose at sowing"},
            {"day": 30, "product": "Urea 25 kg/acre",                  "stage": "Top dress at tillering"},
        ],
    },
    "potato": {
        "total_days": 100,
        "water_per_week_mm": 30,
        "stages": [
            {"name": "Emergence",        "start_day": 0,  "end_day": 15, "water_need": "low",    "notes": "First irrigation before planting; second at emergence."},
            {"name": "Vegetative",       "start_day": 16, "end_day": 35, "water_need": "medium", "notes": "Regular irrigation every 8-10 days; hilling operation."},
            {"name": "Tuber Initiation", "start_day": 36, "end_day": 55, "water_need": "high",   "notes": "Critical stage — consistent moisture essential. Avoid water stress."},
            {"name": "Tuber Bulking",    "start_day": 56, "end_day": 80, "water_need": "high",   "notes": "Heaviest water demand; irrigate every 7 days."},
            {"name": "Maturation",       "start_day": 81, "end_day": 100,"water_need": "low",    "notes": "Stop irrigation 2 weeks before harvest to allow skin set."},
        ],
        "pesticide_events": [
            {"day": 25, "product": "Mancozeb fungicide",            "reason": "Early blight prevention"},
            {"day": 45, "product": "Cymoxanil + mancozeb",          "reason": "Late blight prevention at tuber initiation"},
            {"day": 60, "product": "Chlorpyrifos insecticide",      "reason": "Aphid and wireworm control"},
        ],
        "fertilizer_events": [
            {"day": 1,  "product": "DAP 30 kg/acre + MOP 20 kg/acre", "stage": "Basal dose at planting"},
            {"day": 25, "product": "Urea 15 kg/acre",                  "stage": "Side dress at vegetative stage"},
            {"day": 45, "product": "MOP 10 kg/acre",                   "stage": "Top dress at tuber initiation"},
        ],
    },
    "corn": {
        "total_days": 95,
        "water_per_week_mm": 28,
        "stages": [
            {"name": "Germination",      "start_day": 0,  "end_day": 10, "water_need": "low",    "notes": "Sow at 2-3 cm depth; first irrigation right after sowing."},
            {"name": "Seedling (V1-V6)", "start_day": 11, "end_day": 30, "water_need": "medium", "notes": "Irrigate every 10 days; apply starter fertilizer."},
            {"name": "Rapid Growth",     "start_day": 31, "end_day": 55, "water_need": "high",   "notes": "Heaviest nitrogen demand; irrigate every 7 days."},
            {"name": "Tasseling/Silking","start_day": 56, "end_day": 70, "water_need": "high",   "notes": "Most critical period — water stress reduces yield by 50%."},
            {"name": "Grain Filling",    "start_day": 71, "end_day": 85, "water_need": "high",   "notes": "Maintain moisture for starch accumulation."},
            {"name": "Dough/Dent",       "start_day": 86, "end_day": 95, "water_need": "low",    "notes": "Reduce irrigation; prepare for harvest."},
        ],
        "pesticide_events": [
            {"day": 20, "product": "Atrazine herbicide",            "reason": "Broad-leaf weed control"},
            {"day": 40, "product": "Chlorpyrifos insecticide",      "reason": "Fall armyworm prevention"},
            {"day": 58, "product": "Propiconazole fungicide",       "reason": "Gray leaf spot prevention at silking"},
        ],
        "fertilizer_events": [
            {"day": 1,  "product": "DAP 25 kg/acre",               "stage": "Basal dose at planting"},
            {"day": 30, "product": "Urea 30 kg/acre",              "stage": "Side dress at V6 stage"},
            {"day": 55, "product": "Urea 15 kg/acre + MOP 10 kg/acre", "stage": "Top dress before silking"},
        ],
    },
    "cotton": {
        "total_days": 160,
        "water_per_week_mm": 22,
        "stages": [
            {"name": "Germination",      "start_day": 0,  "end_day": 10, "water_need": "low",    "notes": "Pre-sowing irrigation; first irrigation at 3 DAS."},
            {"name": "Seedling",         "start_day": 11, "end_day": 30, "water_need": "low",    "notes": "Thin to one plant per hill; weed early."},
            {"name": "Squaring",         "start_day": 31, "end_day": 60, "water_need": "medium", "notes": "Monitor for bollworm; irrigate every 12-15 days."},
            {"name": "Flowering/Boll Set","start_day": 61,"end_day": 100,"water_need": "high",   "notes": "Peak water demand; irrigate every 10 days."},
            {"name": "Boll Development", "start_day": 101,"end_day": 130,"water_need": "medium", "notes": "Reduce irrigation; monitor for boll weevil."},
            {"name": "Boll Opening",     "start_day": 131,"end_day": 160,"water_need": "low",    "notes": "Stop irrigation 3 weeks before harvest."},
        ],
        "pesticide_events": [
            {"day": 35, "product": "Imidacloprid insecticide",     "reason": "Aphid and jassid control"},
            {"day": 65, "product": "Cypermethrin insecticide",     "reason": "Bollworm control at flowering"},
            {"day": 90, "product": "Triazophos insecticide",       "reason": "Pink bollworm at boll development"},
        ],
        "fertilizer_events": [
            {"day": 1,  "product": "DAP 20 kg/acre + MOP 15 kg/acre", "stage": "Basal dose at sowing"},
            {"day": 40, "product": "Urea 20 kg/acre",                  "stage": "Side dress at squaring"},
            {"day": 70, "product": "Urea 15 kg/acre",                  "stage": "Top dress at boll set"},
        ],
    },
}

# Default for unknown crops
_DEFAULT_CROP = CROP_DATA["tomato"]


def _get_crop(crop: str) -> dict:
    return CROP_DATA.get(crop.lower().strip(), _DEFAULT_CROP)


# ── Watering time recommendation (real-time-aware) ───────────────────────────

def _window_to_minutes(t: str) -> int:
    """Convert "HH:MM" to minutes since midnight."""
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def best_watering_window(
    temp_c: float,
    humidity: float,
    rain_prob: float,
    crop: str,
    location: str,
    current_hour: Optional[int] = None,   # local hour 0-23, None = use server UTC
) -> dict:
    """
    Return the best irrigation window considering:
      1. Weather (temperature, rain probability)
      2. Current time of day — if the optimal window is already past,
         suggest the next-best window or tomorrow's morning slot.

    Returns a dict with:
      window_start, window_end  e.g. "06:00", "08:00" (or None if skip)
      should_water: bool
      is_past: bool             True when today's window has already passed
      target_day: "today" | "tomorrow"
      reason: str
      email_message: str
    """
    if rain_prob >= 70:
        return {
            "should_water": False,
            "window_start": None,
            "window_end": None,
            "is_past": False,
            "target_day": "today",
            "reason": (
                f"Rain probability is {rain_prob:.0f}% — skip irrigation today. "
                "Natural rainfall will provide sufficient moisture."
            ),
            "email_message": (
                f"Hi, rain is forecast ({rain_prob:.0f}% probability) for your {crop} field "
                f"in {location} today. Skip irrigation — the rain will handle it."
            ),
        }

    # Determine the scientifically optimal window based on temperature
    if temp_c >= 35:
        opt_start, opt_end = "05:30", "07:00"
        reason_core = (
            f"Temperature is very high ({temp_c}°C). "
            "Water before sunrise (5:30–7:00 AM) to prevent evaporation losses and heat stress."
        )
    elif temp_c >= 30:
        opt_start, opt_end = "06:00", "08:00"
        reason_core = (
            f"Temperature is {temp_c}°C. "
            "Early morning (6–8 AM) reduces evaporation by up to 40% and prevents fungal disease."
        )
    elif temp_c >= 22:
        opt_start, opt_end = "07:00", "09:00"
        reason_core = (
            f"Temperature is {temp_c}°C — mild conditions. "
            "Morning irrigation (7–9 AM) is optimal."
        )
    else:
        opt_start, opt_end = "09:00", "11:00"
        reason_core = (
            f"Temperature is cool ({temp_c}°C). "
            "Water between 9–11 AM when the soil has warmed slightly."
        )

    # Use provided hour or fall back to current UTC hour as approximation
    now_hour = current_hour if current_hour is not None else datetime.now().hour
    now_minutes = now_hour * 60

    window_end_minutes = _window_to_minutes(opt_end)

    # If the window has fully passed (end time is in the past)
    if now_minutes >= window_end_minutes:
        # Evening / afternoon visit — suggest tomorrow morning same window
        return {
            "should_water": True,
            "window_start": opt_start,
            "window_end": opt_end,
            "is_past": True,
            "target_day": "tomorrow",
            "reason": (
                f"Today's optimal window ({opt_start}–{opt_end}) has already passed "
                f"(you are viewing this at {now_hour:02d}:00). "
                f"Plan to water tomorrow morning at {opt_start}. "
                + reason_core
            ),
            "email_message": (
                f"Hi, your {crop} field in {location} needs irrigation tomorrow morning "
                f"between {opt_start} and {opt_end}. {reason_core}"
            ),
        }

    # Window is still upcoming or in progress today
    window_start_minutes = _window_to_minutes(opt_start)
    if now_minutes >= window_start_minutes:
        # Currently inside the window
        status = f"You are currently in the irrigation window ({opt_start}–{opt_end}). Water now!"
    else:
        mins_until = window_start_minutes - now_minutes
        h, m = divmod(mins_until, 60)
        status = (
            f"Irrigation window opens in "
            + (f"{h}h {m}m" if h else f"{m} minutes")
            + f" ({opt_start}–{opt_end} local time)."
        )

    return {
        "should_water": True,
        "window_start": opt_start,
        "window_end": opt_end,
        "is_past": False,
        "target_day": "today",
        "reason": f"{status} {reason_core}",
        "email_message": (
            f"Hi, your {crop} field in {location} needs irrigation today between "
            f"{opt_start} and {opt_end}. {reason_core}"
        ),
    }


# ── Schedule builder ──────────────────────────────────────────────────────────

class CropScheduleAgent:
    """
    Generates a complete crop management schedule for a field.
    Input:  crop name, current age in days, planting date, farm location
    Output: stages, events, harvest date, today's irrigation advice
    """

    name = "schedule"

    def analyze(
        self,
        crop: str,
        crop_age_days: int,
        planting_date: Optional[date] = None,
        location: str = "India",
        temperature_c: float = 28.0,
        humidity: float = 65.0,
        rain_prob: float = 30.0,
        current_hour: Optional[int] = None,
    ) -> dict:
        data = _get_crop(crop)
        total_days = data["total_days"]
        remaining_days = max(0, total_days - crop_age_days)

        # Compute dates
        today = date.today()
        if planting_date is None:
            planting_date = today - timedelta(days=crop_age_days)
        harvest_date = planting_date + timedelta(days=total_days)
        days_to_harvest = (harvest_date - today).days

        # Find current stage
        current_stage = data["stages"][-1]
        for stage in data["stages"]:
            if stage["start_day"] <= crop_age_days <= stage["end_day"]:
                current_stage = stage
                break

        # Stage progress
        stage_len = current_stage["end_day"] - current_stage["start_day"]
        stage_day = crop_age_days - current_stage["start_day"]
        stage_progress = min(100, int((stage_day / max(stage_len, 1)) * 100))

        # Upcoming events in next 30 days
        upcoming_events: list[dict] = []
        for ev in data["pesticide_events"]:
            days_until = ev["day"] - crop_age_days
            if 0 <= days_until <= 30:
                event_date = today + timedelta(days=days_until)
                upcoming_events.append({
                    "type": "pesticide",
                    "day": ev["day"],
                    "days_from_now": days_until,
                    "date": event_date.isoformat(),
                    "product": ev["product"],
                    "reason": ev["reason"],
                })
        for ev in data["fertilizer_events"]:
            days_until = ev["day"] - crop_age_days
            if 0 <= days_until <= 30:
                event_date = today + timedelta(days=days_until)
                upcoming_events.append({
                    "type": "fertilizer",
                    "day": ev["day"],
                    "days_from_now": days_until,
                    "date": event_date.isoformat(),
                    "product": ev["product"],
                    "reason": ev.get("stage", ""),
                })
        upcoming_events.sort(key=lambda x: x["days_from_now"])

        # Today's irrigation (time-aware)
        irrigation_advice = best_watering_window(
            temp_c=temperature_c,
            humidity=humidity,
            rain_prob=rain_prob,
            crop=crop,
            location=location,
            current_hour=current_hour,
        )

        # All stages with dates
        stages_with_dates = []
        for s in data["stages"]:
            s_start = planting_date + timedelta(days=s["start_day"])
            s_end = planting_date + timedelta(days=s["end_day"])
            is_current = s["name"] == current_stage["name"]
            is_past = s["end_day"] < crop_age_days
            stages_with_dates.append({
                **s,
                "start_date": s_start.isoformat(),
                "end_date": s_end.isoformat(),
                "is_current": is_current,
                "is_past": is_past,
                "progress": stage_progress if is_current else (100 if is_past else 0),
            })

        # Overall plan progress
        overall_progress = min(100, int((crop_age_days / total_days) * 100))

        return {
            "crop": crop.capitalize(),
            "crop_age_days": crop_age_days,
            "total_days": total_days,
            "remaining_days": remaining_days,
            "overall_progress": overall_progress,
            "planting_date": planting_date.isoformat(),
            "harvest_date": harvest_date.isoformat(),
            "days_to_harvest": max(0, days_to_harvest),
            "current_stage": current_stage["name"],
            "stage_progress": stage_progress,
            "stage_notes": current_stage["notes"],
            "water_need": current_stage["water_need"],
            "irrigation_advice": irrigation_advice,
            "stages": stages_with_dates,
            "upcoming_events": upcoming_events,
            "all_pesticide_events": data["pesticide_events"],
            "all_fertilizer_events": data["fertilizer_events"],
            "location": location,
        }
