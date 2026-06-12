"""OpenLigaDB API client."""

from __future__ import annotations

from dataclasses import dataclass, field
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
    result_details: list[dict[str, Any]] = field(default_factory=list)
    top_scorer_name: str | None = None
    top_scorer_goals: int = 0


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

    @staticmethod
    def _result_label(result_name: str) -> str:
        normalized = result_name.strip().lower()
        if "halbzeit" in normalized:
            return "HZ"
        if "endergebnis" in normalized:
            return "FT"
        if "nachspielzeit" in normalized:
            return "n.V."
        if "elfmetersch" in normalized:
            return "i.E."
        return result_name.strip() or result_name

    @staticmethod
    def _build_result_details(match_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        details: list[dict[str, Any]] = []
        for result in sorted(
            match_results,
            key=lambda item: int(item.get("resultOrderID") or 0),
        ):
            result_name = str(result.get("resultName") or "").strip()
            if not result_name:
                continue

            points_team1 = result.get("pointsTeam1")
            points_team2 = result.get("pointsTeam2")
            if points_team1 is None or points_team2 is None:
                continue

            details.append(
                {
                    "label": OpenLigaDBAPI._result_label(result_name),
                    "result_name": result_name,
                    "home_score": points_team1,
                    "away_score": points_team2,
                    "order": int(result.get("resultOrderID") or 0),
                    "description": result.get("resultDescription"),
                }
            )

        return details

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
            result_details = OpenLigaDBAPI._build_result_details(match_results)

            def score_for(label: str) -> tuple[int | None, int | None]:
                for detail in result_details:
                    if detail["label"] == label:
                        return detail["home_score"], detail["away_score"]
                return None, None

            half_time_home_score, half_time_away_score = score_for("HZ")
            full_time_home_score, full_time_away_score = score_for("FT")
            extra_time_home_score, extra_time_away_score = score_for("n.V.")
            penalty_home_score, penalty_away_score = score_for("i.E.")

            summaries.append(
                OpenLigaDBMatchSummary(
                    match_id=match.get("matchID"),
                    home_team=(match.get("team1") or {}).get("teamName", ""),
                    away_team=(match.get("team2") or {}).get("teamName", ""),
                    match_datetime=match.get("matchDateTime", ""),
                    finished=bool(match.get("matchIsFinished")),
                    group_name=(match.get("group") or {}).get("groupName"),
                    home_score=full_time_home_score,
                    away_score=full_time_away_score,
                    result_details=result_details,
                    half_time_home_score=half_time_home_score,
                    half_time_away_score=half_time_away_score,
                    extra_time_home_score=extra_time_home_score,
                    extra_time_away_score=extra_time_away_score,
                    penalty_home_score=penalty_home_score,
                    penalty_away_score=penalty_away_score,
                    top_scorer_name=top_scorer_name,
                    top_scorer_goals=top_scorer_goals,
                )
            )
        return summaries
