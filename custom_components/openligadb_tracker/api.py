"""OpenLigaDB API client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from aiohttp import ClientSession
from homeassistant.exceptions import HomeAssistantError

BASE_URL = "https://api.openligadb.de"


@dataclass(slots=True)
class OpenLigaDBMatchSummary:
    """Flattened match data used by sensors."""

    match_id: int
    home_team: str
    away_team: str
    home_team_icon_url: str | None
    away_team_icon_url: str | None
    match_datetime: str
    finished: bool
    group_name: str | None
    home_score: int | None
    away_score: int | None
    half_time_home_score: int | None = None
    half_time_away_score: int | None = None
    extra_time_home_score: int | None = None
    extra_time_away_score: int | None = None
    penalty_home_score: int | None = None
    penalty_away_score: int | None = None
    top_scorer_name: str | None = None
    top_scorer_goals: int = 0


@dataclass(slots=True)
class OpenLigaDBGoalGetter:
    """Single entry from the OpenLigaDB top scorer list."""

    goal_getter_id: int
    goal_getter_name: str
    goal_count: int


class OpenLigaDBAPI:
    """Small helper around the public OpenLigaDB endpoints."""

    def __init__(self, session: ClientSession) -> None:
        self._session = session

    async def _async_get_json(self, path: str) -> Any:
        url = f"{BASE_URL}{path}"
        async with self._session.get(url, timeout=30) as response:
            if response.status != 200:
                text = await response.text()
                raise HomeAssistantError(
                    f"OpenLigaDB request failed ({response.status}): {text}"
                )
            return await response.json()

    async def async_get_table(self, league_shortcut: str, season: int) -> list[dict[str, Any]]:
        """Get the table for a league."""
        data = await self._async_get_json(f"/getbltable/{league_shortcut}/{season}")
        return data if isinstance(data, list) else []

    async def async_get_matches(
        self, league_shortcut: str, season: int, group_id: int | None = None
    ) -> list[dict[str, Any]]:
        """Get matches for a league and optionally a specific group."""
        path = f"/getmatchdata/{league_shortcut}/{season}"
        if group_id is not None:
            path = f"{path}/{group_id}"
        data = await self._async_get_json(path)
        return data if isinstance(data, list) else []

    async def async_get_goal_getters(
        self, league_shortcut: str, season: int
    ) -> list[OpenLigaDBGoalGetter]:
        """Get the competition top scorers."""
        data = await self._async_get_json(f"/getgoalgetters/{league_shortcut}/{season}")
        if not isinstance(data, list):
            return []

        goal_getters: list[OpenLigaDBGoalGetter] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            goal_getters.append(
                OpenLigaDBGoalGetter(
                    goal_getter_id=int(item.get("goalGetterId") or 0),
                    goal_getter_name=str(item.get("goalGetterName") or ""),
                    goal_count=int(item.get("goalCount") or 0),
                )
            )
        return goal_getters

    @staticmethod
    def build_match_summaries(matches: list[dict[str, Any]]) -> list[OpenLigaDBMatchSummary]:
        """Convert raw OpenLigaDB match JSON into a simpler structure."""
        summaries: list[OpenLigaDBMatchSummary] = []
        for match in matches:
            goals = match.get("goals") or []
            scorer_counts: dict[str, int] = {}
            for goal in goals:
                scorer = goal.get("goalGetterName")
                if scorer:
                    scorer_counts[scorer] = scorer_counts.get(scorer, 0) + 1

            top_scorer_name = None
            top_scorer_goals = 0
            if scorer_counts:
                top_scorer_name, top_scorer_goals = max(
                    scorer_counts.items(), key=lambda item: item[1]
                )

            match_results = match.get("matchResults") or []

            def _result_by_kind(kind: str) -> dict[str, Any] | None:
                return next(
                    (
                        result
                        for result in match_results
                        if result.get("resultTypeKind") == kind
                    ),
                    None,
                )

            half_time = _result_by_kind("HalfTime")
            full_time = _result_by_kind("After90Minutes")
            extra_time = _result_by_kind("AfterExtraTime")
            penalty = _result_by_kind("AfterPenalties")

            # The actual match outcome is decided in extra time if played;
            # "After90Minutes" alone is misleading for cup matches that went on.
            final_result = extra_time or full_time

            summaries.append(
                OpenLigaDBMatchSummary(
                    match_id=match.get("matchID"),
                    home_team=(match.get("team1") or {}).get("teamName", ""),
                    away_team=(match.get("team2") or {}).get("teamName", ""),
                    home_team_icon_url=(match.get("team1") or {}).get("teamIconUrl"),
                    away_team_icon_url=(match.get("team2") or {}).get("teamIconUrl"),
                    match_datetime=match.get("matchDateTime", ""),
                    finished=bool(match.get("matchIsFinished")),
                    group_name=(match.get("group") or {}).get("groupName"),
                    half_time_home_score=half_time.get("pointsTeam1") if half_time else None,
                    half_time_away_score=half_time.get("pointsTeam2") if half_time else None,
                    extra_time_home_score=extra_time.get("pointsTeam1") if extra_time else None,
                    extra_time_away_score=extra_time.get("pointsTeam2") if extra_time else None,
                    penalty_home_score=penalty.get("pointsTeam1") if penalty else None,
                    penalty_away_score=penalty.get("pointsTeam2") if penalty else None,
                    home_score=final_result.get("pointsTeam1") if final_result else None,
                    away_score=final_result.get("pointsTeam2") if final_result else None,
                    top_scorer_name=top_scorer_name,
                    top_scorer_goals=top_scorer_goals,
                )
            )
        return summaries
