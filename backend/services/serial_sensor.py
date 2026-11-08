"""Optional METRO USB serial ingestion. No port is opened unless configured."""
import json
import math
import os
import threading
import time
from datetime import datetime, timezone
from backend.models import SensorReading

_lock = threading.Lock()
_latest = None
_last_monotonic = 0.0
_started = False


def parse_reading(line: bytes) -> SensorReading | None:
    if len(line) > 4096:
        return None
    try:
        data = json.loads(line)
        if data.get('source') != 'metro328':
            return None
        def value(name, low, high):
            v = data.get(name)
            if v is None:
                return None
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not low <= v <= high:
                raise ValueError(name)
            return float(v)
        t = value('air_temperature_c', -40, 85)
        rh = value('air_relative_humidity_pct', 0, 100)
        dist = value('ultrasonic_distance_cm', 2, 450)
        if all(v is None for v in (t, rh, dist)):
            return None
        return SensorReading(source='metro328', data_mode='live', fresh=True,
            received_at_utc=datetime.now(timezone.utc).isoformat(), air_temperature_c=t,
            air_relative_humidity_pct=rh, ultrasonic_distance_cm=dist, canopy_height_proxy_cm=None,
            status='ok', notes='USB serial reading. Distance is not calibrated plant height.')
    except (ValueError, TypeError, UnicodeDecodeError, AttributeError):
        return None


def _run(port):
    global _latest, _last_monotonic
    import serial
    while True:
        try:
            with serial.Serial(port, 115200, timeout=2) as connection:
                while True:
                    line = connection.readline(4097)
                    reading = parse_reading(line)
                    if reading:
                        with _lock:
                            _latest = reading
                            _last_monotonic = time.monotonic()
        except (serial.SerialException, OSError):
            time.sleep(3)


def get_reading() -> SensorReading | None:
    global _started
    port = os.getenv('FOLLAND_SERIAL_PORT', '').strip()
    if not port:
        return None
    with _lock:
        if not _started:
            threading.Thread(target=_run, args=(port,), daemon=True).start()
            _started = True
        if _latest and time.monotonic() - _last_monotonic <= 10:
            return _latest.model_copy(deep=True)
    return SensorReading(source='metro328', data_mode='unavailable', fresh=False,
        air_temperature_c=None, air_relative_humidity_pct=None, ultrasonic_distance_cm=None,
        canopy_height_proxy_cm=None, status='unavailable', notes='No fresh serial sensor reading.')
