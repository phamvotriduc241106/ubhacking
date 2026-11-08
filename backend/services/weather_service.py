import httpx
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from backend.models import WeatherSummary

# In-memory cache to avoid excessive external API requests.
# Keys come from user-supplied query values, so the cache must stay bounded:
# expired entries are pruned and the oldest entries are evicted past the cap.
_cache: Dict[str, Any] = {}
_CACHE_TTL_SECONDS = 900  # 15 minutes
_CACHE_MAX_ENTRIES = 256


def _cache_put(key: str, entry: Dict[str, Any], now_ts: float) -> None:
    for k in [k for k, v in _cache.items() if now_ts - v["timestamp"] >= _CACHE_TTL_SECONDS]:
        del _cache[k]
    while len(_cache) >= _CACHE_MAX_ENTRIES:
        del _cache[next(iter(_cache))]  # dicts keep insertion order: drop the oldest
    _cache[key] = entry


class WeatherService:
    DEFAULT_LAT = 42.8864
    DEFAULT_LON = -78.8784
    DEFAULT_NAME = "Buffalo, NY (Demo Location)"

    @classmethod
    async def get_weather(
        cls,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: Optional[str] = None
    ) -> WeatherSummary:
        lat = latitude if latitude is not None else cls.DEFAULT_LAT
        lon = longitude if longitude is not None else cls.DEFAULT_LON
        name = location_name or (cls.DEFAULT_NAME if latitude is None and longitude is None else f"{lat:.4f}, {lon:.4f}")

        cache_key = f"{lat}_{lon}_{name}"
        now = datetime.now(timezone.utc)

        # Check cache
        if cache_key in _cache:
            entry = _cache[cache_key]
            if (now.timestamp() - entry["timestamp"]) < _CACHE_TTL_SECONDS:
                return entry["data"]

        # Call Open-Meteo API
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,weather_code",
            "daily": "precipitation_sum,temperature_2m_max,temperature_2m_min",
            # The first 7 daily values are the 7 completed days before today, so the
            # 7-day total describes observed rain, not forecast rain.
            "past_days": 7,
            "timezone": "auto"
        }

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    current = data.get("current", {})
                    daily = data.get("daily", {})

                    precip_daily = daily.get("precipitation_sum", []) or []
                    past_week = [p for p in precip_daily[:7] if p is not None]
                    rain_7d = round(sum(past_week), 1) if len(precip_daily) >= 7 and past_week else None

                    summary = WeatherSummary(
                        location_name=name,
                        latitude=lat,
                        longitude=lon,
                        temperature_c=current.get("temperature_2m"),
                        relative_humidity_pct=current.get("relative_humidity_2m"),
                        rain_last_24h_mm=None,
                        rain_next_24h_mm=None,
                        precipitation_sum_7d_mm=rain_7d,
                        weather_description=cls._interpret_weather_code(current.get("weather_code")),
                        source="open-meteo",
                        retrieved_at_utc=now.isoformat(),
                        is_fallback=False
                    )

                    _cache_put(cache_key, {"timestamp": now.timestamp(), "data": summary}, now.timestamp())
                    return summary
        except Exception:
            pass

        # Fallback to clearly identified mock weather
        fallback = WeatherSummary(
            location_name=f"{name} (Offline Fallback)",
            latitude=lat,
            longitude=lon,
            temperature_c=19.2,
            relative_humidity_pct=55.0,
            rain_last_24h_mm=None,
            rain_next_24h_mm=None,
            precipitation_sum_7d_mm=5.4,
            weather_description="Partly cloudy (Simulated demo fallback)",
            source="mock_fallback",
            retrieved_at_utc=now.isoformat(),
            is_fallback=True
        )
        return fallback

    @staticmethod
    def _interpret_weather_code(code: Optional[int]) -> str:
        if code is None:
            return "Conditions unavailable"
        mapping = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Slight snow fall",
            73: "Moderate snow fall",
            75: "Heavy snow fall",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            95: "Thunderstorm"
        }
        return mapping.get(code, f"Weather code {code}")
