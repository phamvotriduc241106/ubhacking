import random
from datetime import datetime, timezone
from typing import Optional
from backend.models import SensorReading

# In-memory sensor state (ready to be replaced by physical serial bridge)
_simulated_base_temp = 24.1
_simulated_base_rh = 61.5
_simulated_base_dist = 33.4
_reference_base_dist = 50.0  # sensor-to-soil baseline distance in cm
_is_connected = True


class SensorService:
    @staticmethod
    def get_latest_reading(simulate_disconnected: bool = False) -> SensorReading:
        """
        Retrieves the latest sensor reading.
        Currently operates in SIMULATED mode for the hackathon MVP.
        When METRO 328 hardware is connected via USB serial, this method will
        read from the serial buffer without modifying frontend or consumer API contracts.
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        if simulate_disconnected or not _is_connected:
            return SensorReading(
                source="metro328_simulated",
                data_mode="unavailable",
                received_at_utc=now_iso,
                fresh=False,
                air_temperature_c=None,
                air_relative_humidity_pct=None,
                ultrasonic_distance_cm=None,
                canopy_height_proxy_cm=None,
                status="disconnected",
                notes="Sensor hardware or simulator feed is disconnected"
            )

        from backend.services.serial_sensor import get_reading
        live = get_reading()
        if live is not None:
            return live

        # Realistic subtle jitter around target ambient conditions
        temp = round(_simulated_base_temp + random.uniform(-0.4, 0.4), 1)
        rh = round(_simulated_base_rh + random.uniform(-1.2, 1.2), 1)
        dist = round(_simulated_base_dist + random.uniform(-0.3, 0.3), 1)
        canopy = round(max(0.0, _reference_base_dist - dist), 1)

        return SensorReading(
            source="metro328_simulated",
            data_mode="simulated",
            received_at_utc=now_iso,
            fresh=True,
            air_temperature_c=temp,
            air_relative_humidity_pct=rh,
            ultrasonic_distance_cm=dist,
            canopy_height_proxy_cm=canopy,
            status="ok",
            notes="Simulated readings matching SHT30 & RCWL-1601 specifications. Not live hardware."
        )

    @staticmethod
    def set_connection_status(connected: bool):
        global _is_connected
        _is_connected = connected
