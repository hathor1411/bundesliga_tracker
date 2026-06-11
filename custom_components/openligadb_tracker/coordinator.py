"""Data update coordinator for OpenLigaDB Tracker."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import OpenLigaDBAPI, OpenLigaDBMatchSummary
from .const import COMPETITIONS, CONF_COMPETITION, CONF_SEASON, DOMAIN

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class OpenLigaDBData:
    """Combined data fetched from OpenLigaDB."""

    table: list[dict[str, Any]]
    matches: list[dict[str, Any]]
    match_summaries: list[OpenLigaDBMatchSummary]

    @property
    def table_leader(self) -> dict[str, Any] | None:
        return self.table[0] if self.table else None

    @property
    def next_match(self) -> OpenLigaDBMatchSummary | None:
        upcoming = [match for match in self.match_summaries if not match.finished]
        upcoming.sort(key=lambda match: match.match_datetime)
        return upcoming[0] if upcoming else None

    @property
    def top_scorer(self) -> tuple[str, int] | None:
        scorer_counts: dict[str, int] = {}
        for match in self.matches:
            for goal in match.get("goals") or []:
                scorer = goal.get("goalGetterName")
                if not scorer or goal.get("isOwnGoal"):
                    continue
                scorer_counts[scorer] = scorer_counts.get(scorer, 0) + 1
        if not scorer_counts:
            return None
        return max(scorer_counts.items(), key=lambda item: item[1])


class OpenLigaDBCoordinator(DataUpdateCoordinator[OpenLigaDBData]):
    """Fetch OpenLigaDB data for one configured competition."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.entry = entry
        self.competition = str(entry.data[CONF_COMPETITION])
        self.season = int(entry.data[CONF_SEASON])
        self.shortcut = COMPETITIONS[self.competition]["shortcut"]
        self.api = OpenLigaDBAPI(async_get_clientsession(hass))

        super().__init__(
            hass,
            LOGGER,
            name=f"{DOMAIN}_{self.competition}_{self.season}",
            update_interval=timedelta(minutes=30),
            config_entry=entry,
        )

    async def _async_update_data(self) -> OpenLigaDBData:
        """Fetch table and match data."""
        try:
            table, matches = await asyncio.gather(
                self.api.async_get_table(self.shortcut, self.season),
                self.api.async_get_matches(self.shortcut, self.season),
            )
        except Exception as err:  # pragma: no cover - network errors are expected
            raise UpdateFailed(str(err)) from err

        return OpenLigaDBData(
            table=table,
            matches=matches,
            match_summaries=self.api.build_match_summaries(matches),
        )
