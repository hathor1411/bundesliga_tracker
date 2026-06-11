"""Sensor platform for OpenLigaDB Tracker."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import COMPETITIONS, CONF_COMPETITION, CONF_SEASON, DOMAIN
from .coordinator import OpenLigaDBCoordinator


@dataclass(slots=True)
class OpenLigaDBSensorDescription:
    key: str
    name: str
    value_fn: Callable[[object], object]
    icon: str


SENSOR_DESCRIPTIONS = (
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
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensors for a config entry."""
    coordinator: OpenLigaDBCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        OpenLigaDBSensor(coordinator, entry, description)
        for description in SENSOR_DESCRIPTIONS
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
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

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
        return {
            "table_rows": len(data.table),
            "match_count": len(data.matches),
            "top_scorer_name": top_scorer[0] if top_scorer else None,
            "top_scorer_goals": top_scorer[1] if top_scorer else None,
            "next_match_datetime": data.next_match.match_datetime if data.next_match else None,
        }
