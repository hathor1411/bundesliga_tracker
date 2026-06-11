"""Sensor platform for OpenLigaDB Tracker."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import COMPETITIONS, CONF_COMPETITION, CONF_SEASON, DOMAIN
from .coordinator import OpenLigaDBCoordinator


@dataclass(slots=True, frozen=True, kw_only=True)
class OpenLigaDBSensorDescription(SensorEntityDescription):
    """Describe one OpenLigaDB sensor."""

    value_fn: Callable[[object], Any] = field(compare=False)


SENSOR_DESCRIPTIONS = (
    OpenLigaDBSensorDescription(
        key="schedule",
        name="Spielplan",
        value_fn=lambda data: len(data.upcoming_matches),
        icon="mdi:calendar-month",
    ),
    OpenLigaDBSensorDescription(
        key="table_position",
        name="Table Position",
        value_fn=lambda data: 1 if data.table_leader else None,
        icon="mdi:trophy-outline",
    ),
    OpenLigaDBSensorDescription(
        key="points",
        name="Points",
        value_fn=lambda data: data.table_leader.get("points") if data.table_leader else None,
        icon="mdi:counter",
        native_unit_of_measurement="pts",
    ),
    OpenLigaDBSensorDescription(
        key="goals_scored",
        name="Goals Scored",
        value_fn=lambda data: data.table_leader.get("goals") if data.table_leader else None,
        icon="mdi:soccer",
        native_unit_of_measurement="goals",
    ),
    OpenLigaDBSensorDescription(
        key="goals_conceded",
        name="Goals Conceded",
        value_fn=lambda data: data.table_leader.get("opponentGoals") if data.table_leader else None,
        icon="mdi:soccer-field",
        native_unit_of_measurement="goals",
    ),
    OpenLigaDBSensorDescription(
        key="table_leader",
        name="Table Leader",
        value_fn=lambda data: data.table_leader["teamName"] if data.table_leader else None,
        icon="mdi:trophy",
    ),
    OpenLigaDBSensorDescription(
        key="top_scorer",
        name="Top Scorer",
        value_fn=lambda data: data.top_scorer[0] if data.top_scorer else None,
        icon="mdi:soccer",
    ),
    OpenLigaDBSensorDescription(
        key="next_match",
        name="Next Match",
        value_fn=lambda data: (
            f"{data.next_match.home_team} vs {data.next_match.away_team}"
            if data.next_match
            else None
        ),
        icon="mdi:calendar",
    ),
    OpenLigaDBSensorDescription(
        key="next_match_time",
        name="Next Match Time",
        value_fn=lambda data: _local_match_time_dt(data.next_match.match_datetime)
        if data.next_match and data.next_match.match_datetime
        else None,
        icon="mdi:clock-outline",
        device_class=SensorDeviceClass.TIMESTAMP,
    ),
    OpenLigaDBSensorDescription(
        key="match_count",
        name="Match Count",
        value_fn=lambda data: len(data.matches),
        icon="mdi:calendar-multiple",
        native_unit_of_measurement="matches",
    ),
)


def _local_match_time_dt(match_datetime: str) -> datetime:
    """Convert OpenLigaDB timestamps into a timezone-aware local datetime."""
    parsed = datetime.fromisoformat(match_datetime)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=ZoneInfo("UTC"))
    return parsed.astimezone(ZoneInfo("Europe/Berlin"))


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensors for a config entry."""
    coordinator: OpenLigaDBCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        [
            OpenLigaDBSensor(coordinator, entry, description)
            for description in SENSOR_DESCRIPTIONS
        ]
    )


class OpenLigaDBSensor(CoordinatorEntity[OpenLigaDBCoordinator], SensorEntity):
    """Sensor backed by OpenLigaDB data."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: OpenLigaDBCoordinator,
        entry: ConfigEntry,
        description: OpenLigaDBSensorDescription,
    ) -> None:
        super().__init__(coordinator)
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._attr_name = description.name
        competition = COMPETITIONS[str(entry.data[CONF_COMPETITION])]["name"]
        season = int(entry.data[CONF_SEASON])
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=f"{competition} {season}",
            manufacturer="OpenLigaDB",
            model="Football competition tracker",
        )
        self._attr_icon = description.icon
        self._attr_native_unit_of_measurement = description.native_unit_of_measurement

    @property
    def native_value(self):
        """Return the sensor value."""
        if not self.coordinator.data:
            return None
        return self.entity_description.value_fn(self.coordinator.data)

    @property
    def extra_state_attributes(self):
        """Return extra details for debugging and later expansion."""
        if not self.coordinator.data:
            return {}

        data = self.coordinator.data
        top_scorer = data.top_scorer
        if self.entity_description.key == "schedule":
            return {
                "next_match": data.next_match_payload,
                "upcoming_matches": data.upcoming_matches_payload(limit=10),
                "competition": COMPETITIONS[str(self.coordinator.entry.data[CONF_COMPETITION])]["name"],
                "season": self.coordinator.season,
            }

        return {
            "table_rows": len(data.table),
            "match_count": len(data.matches),
            "top_scorer_name": top_scorer[0] if top_scorer else None,
            "top_scorer_goals": top_scorer[1] if top_scorer else None,
            "next_match_datetime": data.next_match.match_datetime if data.next_match else None,
        }
