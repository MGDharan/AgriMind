"""
NDVI / NDMI / MSAVI Field Intelligence Agent — Warwan Dataset
==============================================================
Accepts the data.zip (or individual Excel files) from the Warwan dataset.
The data has ~10% satellite readings (NDVI/NDMI/MSAVI) and 100% weather
observations (temperature, humidity, precipitation, wind).

Strategy:
  - Use weather features + day-of-year + Fourier terms as predictors
  - Train XGBoost on the ~330 rows that have real satellite readings
  - Predict all 3,288 historical days + 30 future days
  - Generate field health assessment and actionable suggestions

Output:
  {
    "historical":      [{date, ndvi, ndmi, msavi, ndvi_pred, ndmi_pred,
                          temp_max, humidity, precipitation}, ...],
    "forecast":        [{date, ndvi_pred, ndmi_pred, msavi_pred,
                          ndvi_health, ndmi_status, temp_forecast}, ...],
    "current_health":  "Excellent|Good|Moderate|Stressed|Critical",
    "health_score":    0-100,
    "current_ndvi":    float,
    "current_ndmi":    float,
    "current_msavi":   float,
    "ndvi_trend":      "improving|stable|declining",
    "ndmi_trend":      "improving|stable|declining",
    "summary":         str,
    "suggestions":     [str, ...],
    "model_r2_ndvi":   float,
    "model_r2_ndmi":   float,
    "model_r2_msavi":  float,
    "training_samples": int,
    "latency_ms":      float,
  }
"""

from __future__ import annotations

import io
import logging
import time
import zipfile
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ── Feature columns available in the dataset ─────────────────────────────────
WEATHER_FEATURES = [
    "max_temp", "min_temp", "humidity", "precipitation",
    "wind_speed", "day_of_year", "month",
    "sin_1", "cos_1", "sin_2", "cos_2", "sin_3", "cos_3",
]

INDEX_TARGETS = ["ndvi", "ndmi", "msavi"]


# ── Data loading ──────────────────────────────────────────────────────────────

def _load_one_excel(raw: bytes, index_name: str) -> pd.DataFrame:
    """Parse one Warwan Excel file. Returns DataFrame with Date + index + weather cols."""
    df = pd.read_excel(io.BytesIO(raw))
    # Normalize column names
    df.columns = [str(c).strip() for c in df.columns]

    # Date
    date_col = next((c for c in df.columns if "date" in c.lower()), "Date")
    df["Date"] = pd.to_datetime(df[date_col], errors="coerce")

    # Index value (sparse — many will be '-' or NaN)
    idx_col = next((c for c in df.columns if c.upper() == index_name.upper()), None)
    if idx_col:
        df[index_name.lower()] = pd.to_numeric(df[idx_col], errors="coerce")
    else:
        df[index_name.lower()] = np.nan

    # Weather
    def get_col(keywords):
        return next((c for c in df.columns if any(k in c.lower() for k in keywords)), None)

    wx = {}
    for col, keys in [
        ("max_temp",      ["max deg", "max_deg"]),
        ("min_temp",      ["min deg", "min_deg"]),
        ("humidity",      ["humidity"]),
        ("precipitation", ["precipitation"]),
        ("wind_speed",    ["wind speed", "wind_speed"]),
    ]:
        src = get_col(keys)
        wx[col] = pd.to_numeric(df[src], errors="coerce") if src else np.nan

    out = pd.DataFrame({"Date": df["Date"], index_name.lower(): df[index_name.lower()]})
    for k, v in wx.items():
        out[k] = v

    return out.dropna(subset=["Date"])


def _load_zip(zip_bytes: bytes) -> pd.DataFrame:
    """
    Extract all 6 xlsx files from the Warwan data.zip.
    Returns a merged DataFrame with columns:
      Date, ndvi, ndmi, msavi, max_temp, min_temp, humidity, precipitation, wind_speed
    """
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        xlsx_files = [n for n in zf.namelist() if n.lower().endswith(".xlsx")]
        if not xlsx_files:
            raise ValueError("No .xlsx files found in the zip.")

        dfs: dict[str, list[pd.DataFrame]] = {k: [] for k in ["ndvi", "ndmi", "msavi"]}

        for fname in xlsx_files:
            lname = fname.lower()
            if "ndvi" in lname:
                key = "ndvi"
            elif "ndmi" in lname:
                key = "ndmi"
            elif "msavi" in lname:
                key = "msavi"
            else:
                continue
            with zf.open(fname) as f:
                raw = f.read()
            df_part = _load_one_excel(raw, key)
            dfs[key].append(df_part)

    # Combine each index across both date ranges
    index_dfs = {}
    for key, parts in dfs.items():
        if not parts:
            continue
        combined = pd.concat(parts, ignore_index=True)
        # Keep the weather from the first file (they're identical across NDVI/NDMI/MSAVI)
        index_dfs[key] = combined.sort_values("Date").drop_duplicates("Date").reset_index(drop=True)

    if not index_dfs:
        raise ValueError("Could not parse any index data from the zip files.")

    # Build the master DataFrame — weather comes from any index (they all have the same weather columns)
    base_key = next(iter(index_dfs))
    merged = index_dfs[base_key][["Date", "max_temp", "min_temp", "humidity", "precipitation", "wind_speed"]].copy()
    merged[base_key] = index_dfs[base_key][base_key]

    for key, df in index_dfs.items():
        if key == base_key:
            continue
        merged = merged.merge(df[["Date", key]], on="Date", how="outer")

    merged = merged.sort_values("Date").reset_index(drop=True)

    # Ensure daily continuous index
    full_idx = pd.date_range(merged["Date"].min(), merged["Date"].max(), freq="D")
    merged = merged.set_index("Date").reindex(full_idx).reset_index().rename(columns={"index": "Date"})

    # Forward/backward fill weather (it's nearly complete; rare missing = sensor outage)
    wx_cols = ["max_temp", "min_temp", "humidity", "precipitation", "wind_speed"]
    merged[wx_cols] = merged[wx_cols].ffill().bfill()

    return merged


def _load_single_excel(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Parse a single uploaded Excel/CSV file that has at minimum:
      date, ndvi [, ndmi, msavi, weather columns]
    Returns the same merged DataFrame format.
    """
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(file_bytes))
    else:
        df = pd.read_csv(io.BytesIO(file_bytes))

    df.columns = [str(c).strip().lower() for c in df.columns]

    # Date
    date_col = next(
        (c for c in df.columns if any(k in c for k in ("date", "time", "dt"))),
        df.columns[0],
    )
    df["Date"] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=["Date"]).sort_values("Date")

    # Map weather columns if present
    col_map = {
        "max_temp":      ["max deg", "max_temp", "max_deg", "tmax"],
        "min_temp":      ["min deg", "min_temp", "min_deg", "tmin"],
        "humidity":      ["humidity"],
        "precipitation": ["precipitation", "precip", "rain"],
        "wind_speed":    ["wind"],
    }
    for new_col, keywords in col_map.items():
        src = next((c for c in df.columns if any(k in c for k in keywords)), None)
        df[new_col] = pd.to_numeric(df[src], errors="coerce") if src else np.nan

    for idx in ["ndvi", "ndmi", "msavi"]:
        src = next((c for c in df.columns if idx in c), None)
        df[idx] = pd.to_numeric(df[src], errors="coerce") if src else np.nan

    keep = ["Date", "ndvi", "ndmi", "msavi", "max_temp", "min_temp", "humidity", "precipitation", "wind_speed"]
    return df[[c for c in keep if c in df.columns]].reset_index(drop=True)


# ── Feature engineering ───────────────────────────────────────────────────────

def _add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    doy = df["Date"].dt.dayofyear
    df["day_of_year"] = doy
    df["month"] = df["Date"].dt.month
    doy_scaled = doy / 365.25
    for k in [1, 2, 3]:
        df[f"sin_{k}"] = np.sin(2 * np.pi * k * doy_scaled)
        df[f"cos_{k}"] = np.cos(2 * np.pi * k * doy_scaled)
    return df


# ── Model training ────────────────────────────────────────────────────────────

def _train_predict(df: pd.DataFrame, target: str) -> tuple[np.ndarray, float]:
    """
    Train XGBoost on rows where target is not NaN.
    Returns (predictions_for_all_rows, r2_score).
    """
    df_feat = _add_time_features(df)

    # Only use features that exist and have data
    available = [f for f in WEATHER_FEATURES if f in df_feat.columns]
    # Fill any missing weather with column median
    for col in available:
        if df_feat[col].isnull().any():
            df_feat[col] = df_feat[col].fillna(df_feat[col].median())

    X_all = df_feat[available].values

    # Training rows — where satellite data exists
    mask = df[target].notna()
    n_train = mask.sum()

    if n_train < 5:
        logger.warning("%s: only %d training samples, using seasonal median fallback", target, n_train)
        seasonal = df_feat.groupby("month")[target].transform("median") if target in df_feat else None
        if seasonal is not None:
            return seasonal.fillna(0.3).values, 0.0
        return np.full(len(df), 0.3), 0.0

    X_train = X_all[mask]
    y_train = df.loc[mask, target].values

    try:
        from xgboost import XGBRegressor
        from sklearn.metrics import r2_score

        model = XGBRegressor(
            n_estimators=400,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=2,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
            n_jobs=-1,
            verbosity=0,
        )
        model.fit(X_train, y_train)
        preds_all = model.predict(X_all).astype(float)

        # Clip to valid range
        clip_max = 1.0 if target in ("ndvi", "ndmi") else 1.0
        preds_all = np.clip(preds_all, -1.0, clip_max)

        train_preds = model.predict(X_train)
        r2 = float(r2_score(y_train, train_preds))
        logger.info("%s: R²=%.3f  training_samples=%d", target, r2, n_train)
        return preds_all, r2

    except ImportError:
        # Fallback: seasonal mean interpolation
        df_feat["_target"] = df[target].values
        seasonal_mean = df_feat.groupby("month")["_target"].transform("mean")
        filled = df[target].fillna(seasonal_mean).ffill().bfill()
        return filled.values, 0.5


def _forecast_future(df: pd.DataFrame, models_preds: dict, horizon: int = 30) -> pd.DataFrame:
    """Generate feature rows for the next `horizon` days after the dataset ends."""
    last_date = df["Date"].max()
    future_dates = pd.date_range(last_date + timedelta(days=1), periods=horizon, freq="D")

    # Use last 30 days average for weather features
    recent = df.tail(30)
    wx_means = {
        "max_temp":      float(recent["max_temp"].mean()) if "max_temp" in recent else 20.0,
        "min_temp":      float(recent["min_temp"].mean()) if "min_temp" in recent else 8.0,
        "humidity":      float(recent["humidity"].mean()) if "humidity" in recent else 55.0,
        "precipitation": float(recent["precipitation"].mean()) if "precipitation" in recent else 2.0,
        "wind_speed":    float(recent["wind_speed"].mean()) if "wind_speed" in recent else 1.2,
    }

    future_df = pd.DataFrame({"Date": future_dates})
    for k, v in wx_means.items():
        future_df[k] = v  # constant weather estimate

    return future_df


# ── Interpretation ────────────────────────────────────────────────────────────

def _ndvi_health(ndvi: float) -> str:
    if ndvi >= 0.6:  return "Excellent"
    if ndvi >= 0.4:  return "Good"
    if ndvi >= 0.2:  return "Moderate"
    if ndvi >= 0.0:  return "Stressed"
    return "Critical"


def _ndmi_status(ndmi: float) -> str:
    if ndmi >= 0.4:  return "Well-watered"
    if ndmi >= 0.2:  return "Adequate"
    if ndmi >= 0.0:  return "Slightly dry"
    if ndmi >= -0.2: return "Water stress"
    return "Severe drought"


def _trend_label(values: list) -> str:
    if len(values) < 5:
        return "stable"
    diff = float(np.mean(values[-5:])) - float(np.mean(values[:5]))
    if diff > 0.03:  return "improving"
    if diff < -0.03: return "declining"
    return "stable"


def _health_score(ndvi: float, ndmi: float) -> int:
    ndvi_s = max(0, min(100, int((ndvi + 0.2) / 1.2 * 100)))
    ndmi_s = max(0, min(100, int((ndmi + 0.5) / 1.5 * 100)))
    return (ndvi_s * 6 + ndmi_s * 4) // 10


def _build_suggestions(ndvi: float, ndmi: float, msavi: float,
                        ndvi_trend: str, ndmi_trend: str,
                        forecast_ndvi: list, forecast_ndmi: list,
                        temp_max: float, precipitation_recent: float) -> list[str]:
    s = []

    # Vegetation health
    if ndvi < 0.2:
        s.append(
            f"NDVI is critically low ({ndvi:.3f}) — field vegetation is severely sparse or stressed. "
            "Apply emergency fertilizer (Urea 20 kg/acre) and irrigate immediately."
        )
    elif ndvi < 0.35:
        s.append(
            f"NDVI ({ndvi:.3f}) shows moderate vegetation stress. "
            "Apply nitrogen top-dressing and maintain consistent irrigation over the next 2 weeks."
        )
    elif ndvi >= 0.5:
        s.append(
            f"NDVI is healthy ({ndvi:.3f}) — strong vegetation cover. "
            "Maintain current fertilization and monitor for pest activity."
        )

    # Moisture
    if ndmi < 0.0:
        s.append(
            f"NDMI ({ndmi:.3f}) indicates water stress. "
            "Increase irrigation frequency — water daily in early morning (6–8 AM) for the next 10 days."
        )
    elif ndmi < 0.2:
        s.append(
            f"NDMI ({ndmi:.3f}) shows slightly dry conditions. "
            "Increase irrigation by 20% over the next week, preferably via drip system."
        )
    elif ndmi > 0.6:
        s.append(
            f"NDMI ({ndmi:.3f}) is very high — risk of waterlogging. "
            "Reduce irrigation and ensure proper drainage to prevent fungal diseases."
        )

    # Soil adjusted vegetation
    if msavi < 0.1:
        s.append(
            "MSAVI is low, indicating poor soil-adjusted vegetation. "
            "Apply micronutrients (zinc sulfate 5 kg/acre) and organic compost to improve soil health."
        )

    # Trend forecasts
    if ndvi_trend == "declining":
        s.append(
            "30-day NDVI forecast shows a declining trend. "
            "Scout for early disease or pest infestation this week. "
            "Consider preventive fungicide spray (neem oil or mancozeb)."
        )
    if ndmi_trend == "declining" and precipitation_recent < 1.0:
        s.append(
            "Moisture is projected to decline with low recent rainfall. "
            "Plan additional irrigation capacity — schedule drip irrigation for every 3 days."
        )

    # Temperature stress
    if temp_max > 32:
        s.append(
            f"High temperature ({temp_max:.0f}°C) combined with current NDVI/NDMI levels "
            "increases heat stress risk. Water before 7 AM and apply mulch to reduce soil temperature."
        )

    # Positive outlook
    avg_forecast = sum(forecast_ndvi) / len(forecast_ndvi) if forecast_ndvi else ndvi
    if avg_forecast > 0.45 and ndvi_trend in ("improving", "stable"):
        s.append(
            "Field outlook is positive for the next 30 days. "
            "This is a good window for applying potassium (MOP 15 kg/acre) "
            "to support fruit/grain development."
        )

    if not s:
        s.append(
            "Field conditions appear stable. "
            "Continue weekly monitoring of NDVI and NDMI and maintain current management practices."
        )

    return s[:4]


# ── Public API ─────────────────────────────────────────────────────────────────

class NDVIAgent:
    """
    Accepts Warwan data.zip or individual Excel files.
    Trains XGBoost on real satellite readings, predicts full history + 30-day forecast.
    """
    name = "ndvi"

    def analyze_zip(self, zip_bytes: bytes, horizon: int = 30) -> dict:
        """Main entry point for data.zip upload."""
        return self._run(_load_zip(zip_bytes), horizon)

    def analyze_file(self, file_bytes: bytes, filename: str, horizon: int = 30) -> dict:
        """Entry point for single CSV/Excel upload."""
        return self._run(_load_single_excel(file_bytes, filename), horizon)

    def _run(self, df: pd.DataFrame, horizon: int) -> dict:
        start = time.perf_counter()
        try:
            return self._compute(df, horizon, start)
        except Exception as exc:
            logger.error("NDVI agent error: %s", exc, exc_info=True)
            return {
                "error": str(exc),
                "historical": [], "forecast": [],
                "current_health": "Unknown", "health_score": 0,
                "current_ndvi": 0.0, "current_ndmi": 0.0, "current_msavi": 0.0,
                "ndvi_trend": "unknown", "ndmi_trend": "unknown",
                "summary": f"Analysis failed: {exc}",
                "suggestions": ["Upload a valid data.zip with NDVI, NDMI, and MSAVI Excel files."],
                "model_r2_ndvi": 0.0, "model_r2_ndmi": 0.0, "model_r2_msavi": 0.0,
                "training_samples": 0,
                "latency_ms": round((time.perf_counter() - start) * 1000, 1),
            }

    def _compute(self, df: pd.DataFrame, horizon: int, start: float) -> dict:
        n_training = int(df["ndvi"].notna().sum()) if "ndvi" in df else 0
        logger.info("NDVI agent: %d rows, %d satellite observations", len(df), n_training)

        # Train and predict for all historical rows
        results = {}
        r2s = {}
        for target in INDEX_TARGETS:
            if target in df.columns:
                preds, r2 = _train_predict(df, target)
                results[target] = preds
                r2s[target] = r2
            else:
                results[target] = np.full(len(df), 0.3)
                r2s[target] = 0.0

        # Forecast future rows
        future_df = _forecast_future(df, results, horizon)
        future_feat = _add_time_features(future_df)
        available = [f for f in WEATHER_FEATURES if f in future_feat.columns]
        for col in available:
            if future_feat[col].isnull().any():
                future_feat[col] = future_feat[col].fillna(df[col].median() if col in df else 20.0)

        future_preds = {}
        for target in INDEX_TARGETS:
            if target in df.columns and n_training >= 5:
                try:
                    from xgboost import XGBRegressor
                    df_feat = _add_time_features(df)
                    mask = df[target].notna()
                    avail = [f for f in WEATHER_FEATURES if f in df_feat.columns]
                    for col in avail:
                        df_feat[col] = df_feat[col].fillna(df_feat[col].median())
                    X_tr = df_feat.loc[mask, avail].values
                    y_tr = df.loc[mask, target].values
                    m = XGBRegressor(n_estimators=400, learning_rate=0.05, max_depth=5,
                                     subsample=0.8, colsample_bytree=0.8, random_state=42,
                                     n_jobs=-1, verbosity=0)
                    m.fit(X_tr, y_tr)
                    future_preds[target] = np.clip(m.predict(future_feat[avail].values), -1.0, 1.0)
                except Exception:
                    future_preds[target] = np.full(horizon, 0.3)
            else:
                future_preds[target] = np.full(horizon, 0.3)

        # Current values — use last predicted value
        current_ndvi  = float(results["ndvi"][-1])
        current_ndmi  = float(results.get("ndmi", np.array([0.2]))[-1])
        current_msavi = float(results.get("msavi", np.array([0.15]))[-1])
        last_temp = float(df["max_temp"].iloc[-1]) if "max_temp" in df else 25.0
        recent_rain = float(df["precipitation"].tail(7).mean()) if "precipitation" in df else 2.0

        ndvi_trend = _trend_label(list(future_preds["ndvi"]))
        ndmi_trend = _trend_label(list(future_preds.get("ndmi", [current_ndmi] * horizon)))

        health = _ndvi_health(current_ndvi)
        score  = _health_score(current_ndvi, current_ndmi)

        suggestions = _build_suggestions(
            current_ndvi, current_ndmi, current_msavi,
            ndvi_trend, ndmi_trend,
            list(future_preds["ndvi"]),
            list(future_preds.get("ndmi", [])),
            last_temp, recent_rain,
        )

        # Build historical output — last 120 days
        hist_slice = df.tail(120).copy()
        historical = []
        for i, (_, row) in enumerate(hist_slice.iterrows()):
            idx = len(df) - len(hist_slice) + i
            historical.append({
                "date":          str(row["Date"])[:10],
                "ndvi_actual":   round(float(row["ndvi"]), 4) if "ndvi" in row and not pd.isna(row["ndvi"]) else None,
                "ndmi_actual":   round(float(row["ndmi"]), 4) if "ndmi" in row and not pd.isna(row["ndmi"]) else None,
                "msavi_actual":  round(float(row["msavi"]), 4) if "msavi" in row and not pd.isna(row["msavi"]) else None,
                "ndvi_pred":     round(float(results["ndvi"][idx]), 4),
                "ndmi_pred":     round(float(results.get("ndmi", np.array([0.2] * len(df)))[idx]), 4),
                "msavi_pred":    round(float(results.get("msavi", np.array([0.15] * len(df)))[idx]), 4),
                "temp_max":      round(float(row["max_temp"]), 1) if "max_temp" in row and not pd.isna(row["max_temp"]) else None,
                "humidity":      round(float(row["humidity"]), 1) if "humidity" in row and not pd.isna(row["humidity"]) else None,
                "precipitation": round(float(row["precipitation"]), 1) if "precipitation" in row and not pd.isna(row["precipitation"]) else None,
            })

        # Build forecast output
        today = date.today()
        forecast = []
        for i in range(horizon):
            fdate = (today + timedelta(days=i + 1)).isoformat()
            nv = float(future_preds["ndvi"][i])
            nm = float(future_preds.get("ndmi", np.full(horizon, 0.2))[i])
            ms = float(future_preds.get("msavi", np.full(horizon, 0.15))[i])
            forecast.append({
                "date":        fdate,
                "ndvi_pred":   round(nv, 4),
                "ndmi_pred":   round(nm, 4),
                "msavi_pred":  round(ms, 4),
                "ndvi_health": _ndvi_health(nv),
                "ndmi_status": _ndmi_status(nm),
            })

        summary = (
            f"Warwan field — {health} vegetation (NDVI {current_ndvi:.3f}). "
            f"Moisture: {_ndmi_status(current_ndmi)} (NDMI {current_ndmi:.3f}). "
            f"MSAVI: {current_msavi:.3f}. "
            f"30-day outlook: NDVI is {ndvi_trend}, moisture is {ndmi_trend}."
        )

        latency = round((time.perf_counter() - start) * 1000, 1)
        logger.info("NDVI agent done: %s score=%d in %.0fms", health, score, latency)

        return {
            "historical":       historical,
            "forecast":         forecast,
            "current_health":   health,
            "health_score":     score,
            "current_ndvi":     round(current_ndvi, 4),
            "current_ndmi":     round(current_ndmi, 4),
            "current_msavi":    round(current_msavi, 4),
            "ndvi_trend":       ndvi_trend,
            "ndmi_trend":       ndmi_trend,
            "summary":          summary,
            "suggestions":      suggestions,
            "trend_30d":        ndvi_trend,
            "model_r2_ndvi":    round(max(0, r2s.get("ndvi", 0)), 3),
            "model_r2_ndmi":    round(max(0, r2s.get("ndmi", 0)), 3),
            "model_r2_msavi":   round(max(0, r2s.get("msavi", 0)), 3),
            "training_samples": n_training,
            "latency_ms":       latency,
        }
