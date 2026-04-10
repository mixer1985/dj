"""Hydroponic controller starter for ESP32-S3 style projects.

The module is hardware-agnostic and can run locally with mock sensors/relays.
You can later replace the mock classes with real ESP32 MicroPython drivers.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Protocol
import random
import time


class SensorSuite(Protocol):
    def read_ph(self) -> float: ...
    def read_ec(self) -> float: ...
    def read_temperature_c(self) -> float: ...
    def read_level_percent(self) -> float: ...


class Relay(Protocol):
    def on(self) -> None: ...
    def off(self) -> None: ...


@dataclass
class ControllerConfig:
    ph_low: float = 5.6
    ph_high: float = 6.2
    ec_low: float = 1.1
    ec_high: float = 2.0
    temp_low_c: float = 18.0
    temp_high_c: float = 24.0
    level_low_percent: float = 30.0
    level_target_percent: float = 75.0
    max_pump_seconds: float = 3.0
    min_pump_seconds: float = 0.5
    settle_seconds: int = 15
    sample_seconds: int = 5
    min_minutes_between_doses: int = 10


@dataclass
class Measurements:
    ph: float
    ec: float
    temp_c: float
    level_percent: float


class MockRelay:
    def __init__(self, name: str) -> None:
        self.name = name
        self.state = False

    def on(self) -> None:
        if not self.state:
            self.state = True
            print(f"[{datetime.now().isoformat(timespec='seconds')}] Relay {self.name}: ON")

    def off(self) -> None:
        if self.state:
            self.state = False
            print(f"[{datetime.now().isoformat(timespec='seconds')}] Relay {self.name}: OFF")

    def pulse(self, seconds: float) -> None:
        self.on()
        time.sleep(seconds)
        self.off()


class MockSensors:
    """Simple simulation for local testing."""

    def __init__(self) -> None:
        self._ph = 6.4
        self._ec = 0.95
        self._temp = 22.1
        self._level = 28.0

    def read_ph(self) -> float:
        self._ph += random.uniform(-0.03, 0.03)
        return round(self._ph + random.uniform(-0.01, 0.01), 2)

    def read_ec(self) -> float:
        self._ec += random.uniform(-0.04, 0.04)
        return round(max(0.1, self._ec), 2)

    def read_temperature_c(self) -> float:
        self._temp += random.uniform(-0.15, 0.15)
        return round(self._temp, 2)

    def read_level_percent(self) -> float:
        self._level -= random.uniform(0.2, 0.8)  # evaporation / uptake
        return round(max(0.0, self._level), 2)

    def influence(self, *, ph: float = 0.0, ec: float = 0.0, level: float = 0.0) -> None:
        self._ph += ph
        self._ec += ec
        self._level += level


class HydroController:
    def __init__(
        self,
        sensors: SensorSuite,
        relay_fill: MockRelay,
        relay_ph_up: MockRelay,
        relay_ph_down: MockRelay,
        relay_nutrients: MockRelay,
        relay_chiller_or_heater: MockRelay,
        config: ControllerConfig | None = None,
    ) -> None:
        self.sensors = sensors
        self.relay_fill = relay_fill
        self.relay_ph_up = relay_ph_up
        self.relay_ph_down = relay_ph_down
        self.relay_nutrients = relay_nutrients
        self.relay_chiller_or_heater = relay_chiller_or_heater
        self.config = config or ControllerConfig()
        self._last_dose = {
            "fill": datetime.min,
            "ph_up": datetime.min,
            "ph_down": datetime.min,
            "nutrients": datetime.min,
        }

    def _can_dose(self, channel: str) -> bool:
        return datetime.now() - self._last_dose[channel] >= timedelta(
            minutes=self.config.min_minutes_between_doses
        )

    def _dose(self, channel: str, relay: MockRelay, seconds: float) -> None:
        if not self._can_dose(channel):
            print(f"Skip {channel}: still inside safety interval.")
            return
        relay.pulse(seconds)
        self._last_dose[channel] = datetime.now()

    def _dose_seconds(self, error: float, max_error: float) -> float:
        factor = min(abs(error), max_error) / max_error
        return round(max(self.config.min_pump_seconds, self.config.max_pump_seconds * factor), 2)

    def read_all(self) -> Measurements:
        m = Measurements(
            ph=self.sensors.read_ph(),
            ec=self.sensors.read_ec(),
            temp_c=self.sensors.read_temperature_c(),
            level_percent=self.sensors.read_level_percent(),
        )
        print(
            f"[{datetime.now().isoformat(timespec='seconds')}] "
            f"pH={m.ph} | EC={m.ec} mS/cm | Temp={m.temp_c}°C | Level={m.level_percent}%"
        )
        return m

    def run_cycle(self) -> None:
        m = self.read_all()

        # 1) Level control: top up reservoir with water
        if m.level_percent < self.config.level_low_percent:
            error = self.config.level_target_percent - m.level_percent
            seconds = self._dose_seconds(error, max_error=50.0)
            print(f"Level low ({m.level_percent}%), filling water for {seconds}s")
            self._dose("fill", self.relay_fill, seconds)
            if isinstance(self.sensors, MockSensors):
                self.sensors.influence(level=8.0)

        # 2) pH control
        if m.ph < self.config.ph_low:
            error = self.config.ph_low - m.ph
            seconds = self._dose_seconds(error, max_error=0.6)
            print(f"pH low ({m.ph}), dosing pH+ for {seconds}s")
            self._dose("ph_up", self.relay_ph_up, seconds)
            if isinstance(self.sensors, MockSensors):
                self.sensors.influence(ph=0.07)
        elif m.ph > self.config.ph_high:
            error = m.ph - self.config.ph_high
            seconds = self._dose_seconds(error, max_error=0.6)
            print(f"pH high ({m.ph}), dosing pH- for {seconds}s")
            self._dose("ph_down", self.relay_ph_down, seconds)
            if isinstance(self.sensors, MockSensors):
                self.sensors.influence(ph=-0.07)

        # 3) EC control (add nutrient concentrate if too low)
        if m.ec < self.config.ec_low:
            error = self.config.ec_low - m.ec
            seconds = self._dose_seconds(error, max_error=0.8)
            print(f"EC low ({m.ec}), dosing nutrients for {seconds}s")
            self._dose("nutrients", self.relay_nutrients, seconds)
            if isinstance(self.sensors, MockSensors):
                self.sensors.influence(ec=0.1)
        elif m.ec > self.config.ec_high:
            print(f"EC high ({m.ec}), no nutrient dosing. Consider dilution via water top-up.")

        # 4) Temperature supervision relay (heater/chiller)
        if m.temp_c < self.config.temp_low_c:
            print(f"Temperature low ({m.temp_c}°C): climate relay ON")
            self.relay_chiller_or_heater.on()
        elif m.temp_c > self.config.temp_high_c:
            print(f"Temperature high ({m.temp_c}°C): climate relay ON")
            self.relay_chiller_or_heater.on()
        else:
            self.relay_chiller_or_heater.off()

        print(f"Settling {self.config.settle_seconds}s...\n")
        time.sleep(self.config.settle_seconds)

    def run_forever(self) -> None:
        while True:
            self.run_cycle()
            time.sleep(self.config.sample_seconds)


if __name__ == "__main__":
    print("Starting hydro controller demo (ESP32-ready structure, mock IO)...")

    sensors = MockSensors()
    controller = HydroController(
        sensors=sensors,
        relay_fill=MockRelay("fill_water"),
        relay_ph_up=MockRelay("ph_plus"),
        relay_ph_down=MockRelay("ph_minus"),
        relay_nutrients=MockRelay("nutrients"),
        relay_chiller_or_heater=MockRelay("temperature_control"),
        config=ControllerConfig(
            min_minutes_between_doses=0,
            settle_seconds=2,
            sample_seconds=3,
        ),
    )

    for _ in range(10):
        controller.run_cycle()
        time.sleep(controller.config.sample_seconds)

    print("Demo finished.")
