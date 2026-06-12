"""Data update coordinator for OpenLigaDB Tracker."""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import OpenLigaDBAPI, OpenLigaDBGoalGetter, OpenLigaDBMatchSummary
from .const import COMPETITIONS, CONF_COMPETITION, CONF_FAVORITE_TEAM, CONF_SEASON, DOMAIN

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class OpenLigaDBData:
    """Combined data fetched from OpenLigaDB."""

    favorite_team: str | None
    team_icons: dict[str, str]
    table: list[dict[str, Any]]
    matches: list[dict[str, Any]]
    match_summaries: list[OpenLigaDBMatchSummary]
    goal_getters: list[OpenLigaDBGoalGetter]

    def _is_favorite_team(self, *names: str | None) -> bool:
        """Return whether any provided team name matches the favorite team."""
        if not self.favorite_team:
            return False
        favorite = _normalize_team_name(self.favorite_team)
        return any(_normalize_team_name(name) == favorite for name in names if name)

    def _match_team_side(self, match: OpenLigaDBMatchSummary) -> str | None:
        """Return which side the favorite team plays on in a match."""
        if self._is_favorite_team(match.home_team):
            return "home"
        if self._is_favorite_team(match.away_team):
            return "away"
        return None

    def _match_payload(self, match: OpenLigaDBMatchSummary) -> dict[str, Any]:
        """Convert a match summary into a UI-friendly payload."""
        favorite_side = self._match_team_side(match)
        has_favorite_team = favorite_side is not None
        opponent = None
        if favorite_side == "home":
            opponent = match.away_team
        elif favorite_side == "away":
            opponent = match.home_team

        return {
            "match_id": match.match_id,
            "kickoff": _to_local_iso(match.match_datetime),
            "group": match.group_name,
            "home_team": match.home_team,
            "away_team": match.away_team,
            "home_team_url": match.home_team_icon_url,
            "home_team_icon_url": match.home_team_icon_url,
            "away_team_url": match.away_team_icon_url,
            "away_team_icon_url": match.away_team_icon_url,
            "finished": match.finished,
            "half_time_home_score": match.half_time_home_score,
            "half_time_away_score": match.half_time_away_score,
            "home_score": match.home_score,
            "away_score": match.away_score,
            "is_favorite_match": has_favorite_team,
            "favorite_team_side": favorite_side,
            "favorite_marker": "★" if has_favorite_team else "",
            "opponent": opponent,
        }

    @property
    def table_leader(self) -> dict[str, Any] | None:
        return self.table[0] if self.table else None

    def table_payload(self) -> list[dict[str, Any]]:
        """Return a UI-friendly representation of the full standings table."""
        payload: list[dict[str, Any]] = []
        for index, row in enumerate(self.table, start=1):
            team_name = row.get("teamName")
            short_name = row.get("shortName")
            is_favorite = self._is_favorite_team(team_name, short_name)
            payload.append(
                {
                    "position": index,
                    "rank_color": _rank_color(index),
                    "rank_label": _rank_label(index),
                    "is_favorite": is_favorite,
                    "favorite_marker": "★" if is_favorite else "",
                    "team_name": team_name,
                    "short_name": short_name,
                    "team_url": self.team_icon_url(team_name, short_name),
                    "team_icon_url": self.team_icon_url(team_name, short_name),
                    "points": row.get("points"),
                    "matches": row.get("matches"),
                    "won": row.get("won"),
                    "draw": row.get("draw"),
                    "lost": row.get("lost"),
                    "goals_scored": row.get("goals"),
                    "goals_conceded": row.get("opponentGoals"),
                    "goal_diff": row.get("goalDiff"),
                }
            )
        return payload

    def team_icon_url(self, *names: str | None) -> str | None:
        """Return a known team icon URL for one of the provided names."""
        for name in names:
            if not name:
                continue
            normalized = _normalize_team_name(name)
            if normalized in self.team_icons:
                return self.team_icons[normalized]
        return None

    def rounds_payload(self) -> list[dict[str, Any]]:
        """Return a grouped round overview for knockout competitions."""
        rounds: dict[str, list[OpenLigaDBMatchSummary]] = {}
        for match in self.match_summaries:
            round_name = match.group_name or "Unbekannte Runde"
            rounds.setdefault(round_name, []).append(match)

        payload: list[dict[str, Any]] = []
        for round_name in sorted(rounds.keys()):
            round_matches = sorted(rounds[round_name], key=lambda match: match.match_datetime)
            payload.append(
                {
                    "round_name": round_name,
                    "match_count": len(round_matches),
                    "finished_count": sum(1 for match in round_matches if match.finished),
                    "matches": [self._match_payload(match) for match in round_matches],
                }
            )
        return payload

    @property
    def next_match(self) -> OpenLigaDBMatchSummary | None:
        upcoming = [match for match in self.match_summaries if not match.finished]
        upcoming.sort(key=lambda match: match.match_datetime)
        return upcoming[0] if upcoming else None

    @property
    def top_scorer(self) -> tuple[str, int] | None:
        if self.goal_getters:
            top_goal_getter = max(self.goal_getters, key=lambda item: item.goal_count)
            if top_goal_getter.goal_getter_name:
                return top_goal_getter.goal_getter_name, top_goal_getter.goal_count

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

    @property
    def upcoming_matches(self) -> list[OpenLigaDBMatchSummary]:
        """Return not-yet-finished matches ordered by kickoff time."""
        upcoming = [match for match in self.match_summaries if not match.finished]
        upcoming.sort(key=lambda match: match.match_datetime)
        return upcoming

    def upcoming_matches_payload(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return a UI-friendly list of upcoming matches."""
        return [self._match_payload(match) for match in self.upcoming_matches[:limit]]

    def favorite_matches(self) -> list[OpenLigaDBMatchSummary]:
        """Return all matches that involve the favorite team."""
        if not self.favorite_team:
            return []

        favorite_matches = [
            match for match in self.match_summaries if self._match_team_side(match) is not None
        ]
        favorite_matches.sort(key=lambda match: match.match_datetime)
        return favorite_matches

    def favorite_matches_payload(self, limit: int = 3) -> dict[str, Any]:
        """Return past and upcoming matches around the favorite team."""
        favorite_matches = self.favorite_matches()
        if not favorite_matches:
            return {
                "featured": None,
                "previous": [],
                "next": [],
                "all_count": 0,
            }

        now = datetime.now(ZoneInfo("Europe/Berlin"))
        live_match = next((match for match in favorite_matches if _is_match_live(match, now)), None)
        future_matches = [match for match in favorite_matches if _match_datetime_local(match) > now]
        latest_finished_match = next(
            (match for match in reversed(favorite_matches) if _match_datetime_local(match) <= now),
            None,
        )

        if live_match is not None:
            featured_match = live_match
        elif latest_finished_match is not None and now < _next_monday_0001(_match_datetime_local(latest_finished_match)):
            featured_match = latest_finished_match
        elif future_matches:
            featured_match = future_matches[0]
        else:
            featured_match = latest_finished_match or favorite_matches[-1]

        featured_index = favorite_matches.index(featured_match)
        previous_matches = favorite_matches[:featured_index]
        next_matches = favorite_matches[featured_index + 1 :]

        return {
            "featured": self._match_payload(featured_match) if featured_match else None,
            "previous": [self._match_payload(match) for match in previous_matches[-limit:]][::-1],
            "next": [self._match_payload(match) for match in next_matches[:limit]],
            "all_count": len(favorite_matches),
        }

    def favorite_match_context_payload(self) -> dict[str, Any] | None:
        """Return previous/current/next matches around the next favorite match."""
        if not self.favorite_team:
            return None

        favorite_matches = [
            match for match in self.match_summaries if self._match_team_side(match) is not None
        ]
        if not favorite_matches:
            return None

        favorite_matches.sort(key=lambda match: match.match_datetime)
        current_index = next(
            (index for index, match in enumerate(favorite_matches) if not match.finished),
            len(favorite_matches) - 1,
        )

        previous_match = favorite_matches[current_index - 1] if current_index > 0 else None
        current_match = favorite_matches[current_index]
        next_match = (
            favorite_matches[current_index + 1]
            if current_index + 1 < len(favorite_matches)
            else None
        )

        return {
            "favorite_team": self.favorite_team,
            "previous": self._match_payload(previous_match) if previous_match else None,
            "current": self._match_payload(current_match),
            "next": self._match_payload(next_match) if next_match else None,
            "total_favorite_matches": len(favorite_matches),
        }

    @property
    def next_match_payload(self) -> dict[str, Any] | None:
        """Return a UI-friendly payload for the next match."""
        next_match = self.next_match
        if next_match is None:
            return None
        return self._match_payload(next_match)


def _to_local_iso(match_datetime: str) -> str:
    """Convert an OpenLigaDB timestamp to local ISO format."""
    parsed = datetime.fromisoformat(match_datetime)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=ZoneInfo("UTC"))
    return parsed.astimezone(ZoneInfo("Europe/Berlin")).isoformat()


def _match_datetime_local(match: OpenLigaDBMatchSummary) -> datetime:
    """Parse a match datetime as local time."""
    parsed = datetime.fromisoformat(match.match_datetime)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=ZoneInfo("UTC"))
    return parsed.astimezone(ZoneInfo("Europe/Berlin"))


def _is_match_live(match: OpenLigaDBMatchSummary, now: datetime) -> bool:
    """Return whether a match should be considered live in the UI."""
    start = _match_datetime_local(match)
    end = start + timedelta(minutes=105)
    return start <= now < end and not match.finished


def _next_monday_0001(reference: datetime) -> datetime:
    """Return the next Monday at 00:01 after the given reference."""
    start_of_day = reference.replace(hour=0, minute=0, second=0, microsecond=0)
    days_ahead = (7 - start_of_day.weekday()) % 7
    monday = start_of_day + timedelta(days=days_ahead)
    if monday <= reference:
        monday += timedelta(days=7)
    return monday.replace(hour=0, minute=1)


def _normalize_team_name(value: str | None) -> str:
    """Normalize team names for comparison."""
    return re.sub(r"\s+", " ", (value or "").strip()).casefold()


def _build_team_icon_map(matches: list[dict[str, Any]]) -> dict[str, str]:
    """Build a lookup of normalized team names to team icon URLs."""
    team_icons: dict[str, str] = {}
    for match in matches:
        for side in ("team1", "team2"):
            team = match.get(side) or {}
            team_icon_url = team.get("teamIconUrl")
            if not team_icon_url:
                continue

            for name in (team.get("teamName"), team.get("shortName")):
                normalized = _normalize_team_name(name)
                if normalized and normalized not in team_icons:
                    team_icons[normalized] = team_icon_url
    return team_icons


def _rank_color(position: int) -> str:
    """Return a simple color label for a table rank."""
    if position == 1:
        return "gold"
    if position == 2:
        return "silver"
    if position == 3:
        return "bronze"
    if position <= 6:
        return "blue"
    return "gray"


def _rank_label(position: int) -> str:
    """Return a short human-friendly label for a rank."""
    if position == 1:
        return "1. Platz"
    if position == 2:
        return "2. Platz"
    if position == 3:
        return "3. Platz"
    return f"{position}. Platz"


class OpenLigaDBCoordinator(DataUpdateCoordinator[OpenLigaDBData]):
    """Fetch OpenLigaDB data for one configured competition."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.entry = entry
        self.competition = str(entry.data[CONF_COMPETITION])
        self.season = int(entry.data[CONF_SEASON])
        self.favorite_team = (
            str(entry.options.get(CONF_FAVORITE_TEAM, "")).strip()
            or str(entry.data.get(CONF_FAVORITE_TEAM, "")).strip()
            or None
        )
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
            table, matches, goal_getters = await asyncio.gather(
                self.api.async_get_table(self.shortcut, self.season),
                self.api.async_get_matches(self.shortcut, self.season),
                self.api.async_get_goal_getters(self.shortcut, self.season),
            )
        except Exception as err:  # pragma: no cover - network errors are expected
            raise UpdateFailed(str(err)) from err

        return OpenLigaDBData(
            favorite_team=self.favorite_team,
            team_icons=_build_team_icon_map(matches),
            table=table,
            matches=matches,
            match_summaries=self.api.build_match_summaries(matches),
            goal_getters=goal_getters,
        )
