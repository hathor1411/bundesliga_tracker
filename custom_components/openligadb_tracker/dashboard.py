"""Helpers to create and remove an optional Lovelace dashboard."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .const import (
    COMPETITIONS,
    CONF_CREATE_DASHBOARD,
    CONF_COMPETITION,
    CONF_FAVORITE_TEAM,
    CONF_SEASON,
)

LOGGER = logging.getLogger(__name__)

STORAGE_DASHBOARDS_FILE = "lovelace_dashboards"
STORAGE_DASHBOARD_PREFIX = "lovelace."
DASHBOARD_ICON = "mdi:soccer"


async def async_sync_dashboard(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: object | None,
) -> None:
    """Create, refresh, or remove the optional dashboard."""
    should_create = bool(
        entry.options.get(CONF_CREATE_DASHBOARD, entry.data.get(CONF_CREATE_DASHBOARD, True))
    )

    try:
        if not should_create:
            await _async_remove_dashboard(hass, entry)
            return

        if coordinator is None:
            await _async_remove_dashboard(hass, entry)
            return

        await _async_upsert_dashboard(hass, entry)
    except Exception:  # pragma: no cover - dashboard setup should never block the entry
        LOGGER.exception("Failed to sync Lovelace dashboard for %s", entry.entry_id)


def _dashboard_id(entry: ConfigEntry) -> str:
    """Return a stable storage id for the dashboard."""
    competition = str(entry.data[CONF_COMPETITION])
    season = int(entry.data[CONF_SEASON])
    return f"openligadb_{competition}_{season}"


def _dashboard_title(entry: ConfigEntry) -> str:
    """Return the display title for the dashboard."""
    competition = COMPETITIONS[str(entry.data[CONF_COMPETITION])]["name"]
    season = int(entry.data[CONF_SEASON])
    return f"{competition} {season}"


def _dashboard_url_path(entry: ConfigEntry) -> str:
    """Return the sidebar URL path for the dashboard."""
    return _slugify(_dashboard_id(entry))


def _slugify(value: str) -> str:
    """Convert a string into a Lovelace-friendly slug."""
    value = value.casefold()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def _storage_dir(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(".storage"))


def _dashboard_item(entry: ConfigEntry) -> dict[str, Any]:
    dashboard_id = _dashboard_id(entry)
    return {
        "id": dashboard_id,
        "show_in_sidebar": True,
        "icon": DASHBOARD_ICON,
        "title": _dashboard_title(entry),
        "require_admin": False,
        "mode": "storage",
        "url_path": _dashboard_url_path(entry),
    }


async def _async_upsert_dashboard(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Create or refresh the dashboard files."""
    entity_ids = await _async_entity_ids_for_entry(hass, entry)
    dashboard_id = _dashboard_id(entry)

    config = _build_dashboard_config(entry, entity_ids)
    dashboard_file = _storage_dir(hass) / f"{STORAGE_DASHBOARD_PREFIX}{dashboard_id}"
    dashboards_file = _storage_dir(hass) / STORAGE_DASHBOARDS_FILE

    await hass.async_add_executor_job(_write_dashboard_file, dashboard_file, dashboard_id, config)
    await hass.async_add_executor_job(_upsert_dashboard_index, dashboards_file, _dashboard_item(entry))


async def _async_remove_dashboard(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove dashboard files created by the integration."""
    dashboard_id = _dashboard_id(entry)
    dashboard_file = _storage_dir(hass) / f"{STORAGE_DASHBOARD_PREFIX}{dashboard_id}"
    dashboards_file = _storage_dir(hass) / STORAGE_DASHBOARDS_FILE

    await hass.async_add_executor_job(_remove_dashboard_file, dashboard_file)
    await hass.async_add_executor_job(_remove_dashboard_index, dashboards_file, dashboard_id)


async def _async_entity_ids_for_entry(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, str]:
    """Map our known sensor suffixes to real entity ids."""
    registry = er.async_get(hass)
    suffix_map = {
        "schedule": None,
        "top_scorer": None,
        "next_match": None,
        "next_match_time": None,
        "match_count": None,
        "table": None,
        "table_position": None,
        "points": None,
        "goals_scored": None,
        "goals_conceded": None,
        "table_leader": None,
        "round_overview": None,
    }

    prefix = f"{entry.entry_id}_"
    for entity in registry.entities.values():
        if entity.config_entry_id != entry.entry_id:
            continue
        if entity.domain != "sensor":
            continue
        if not entity.unique_id or not entity.unique_id.startswith(prefix):
            continue

        suffix = entity.unique_id[len(prefix) :]
        if suffix in suffix_map:
            suffix_map[suffix] = entity.entity_id

    return {key: entity_id for key, entity_id in suffix_map.items() if entity_id}


def _build_dashboard_config(entry: ConfigEntry, entity_ids: dict[str, str]) -> dict[str, Any]:
    """Build a storage dashboard configuration."""
    competition = str(entry.data[CONF_COMPETITION])
    favorite_team = str(
        entry.options.get(CONF_FAVORITE_TEAM, entry.data.get(CONF_FAVORITE_TEAM, ""))
    ).strip()
    views = [
        {
            "path": "uebersicht",
            "title": "Ubersicht",
            "icon": "mdi:view-dashboard",
            "type": "sections",
            "sections": [
                {
                    "type": "grid",
                    "cards": [
                        {
                            "type": "markdown",
                            "content": _overview_markdown(entry, favorite_team),
                        },
                        {
                            "type": "entities",
                            "title": "Wichtige Sensoren",
                            "entities": _entities_for_view(
                                entity_ids,
                                [
                                    "schedule",
                                    "next_match",
                                    "next_match_time",
                                    "top_scorer",
                                    "match_count",
                                ],
                            ),
                        },
                    ],
                }
            ],
        }
    ]

    if competition == "bundesliga":
        views.append(
            {
                "path": "tabelle",
                "title": "Tabelle",
                "icon": "mdi:table",
                "type": "sections",
                "sections": [
                    {
                        "type": "grid",
                        "cards": [
                            {
                                "type": "markdown",
                                "content": (
                                    "## Bundesliga-Tabelle\n"
                                    "Die Rangfarben kommen direkt aus den Sensor-Attributen.\n"
                                    "Damit koennen wir die Tabelle spaeter noch schoener machen."
                                ),
                            },
                            {
                                "type": "entities",
                                "title": "Tabelle",
                                "entities": _entities_for_view(
                                    entity_ids,
                                    [
                                        "table",
                                        "table_leader",
                                        "table_position",
                                        "points",
                                        "goals_scored",
                                        "goals_conceded",
                                    ],
                                ),
                            },
                        ],
                    }
                ],
            }
        )
    else:
        views.append(
            {
                "path": "pokal",
                "title": "DFB-Pokal",
                "icon": "mdi:tournament",
                "type": "sections",
                "sections": [
                    {
                        "type": "grid",
                        "cards": [
                            {
                                "type": "markdown",
                                "content": (
                                    "## DFB-Pokal Runden\n"
                                    "Das ist eine KO-Runde, deshalb zeigen wir hier keine Tabelle,\n"
                                    "sondern die Rundenuebersicht."
                                ),
                            },
                            {
                                "type": "entities",
                                "title": "Rundenuebersicht",
                                "entities": _entities_for_view(
                                    entity_ids,
                                    ["round_overview", "schedule", "next_match"],
                                ),
                            },
                        ],
                    }
                ],
            }
        )

    return {"views": views}


def _overview_markdown(entry: ConfigEntry, favorite_team: str) -> str:
    competition = COMPETITIONS[str(entry.data[CONF_COMPETITION])]["name"]
    season = int(entry.data[CONF_SEASON])
    lines = [
        f"# {competition} {season}",
        "",
        "Dieses Dashboard wird von der Integration automatisch erstellt.",
    ]
    if favorite_team:
        lines.extend(["", f"**Lieblingsmannschaft:** {favorite_team}"])
    lines.extend(
        [
            "",
            "Im ersten Schritt halten wir das bewusst schlicht und bauen es spaeter gemeinsam aus.",
        ]
    )
    return "\n".join(lines)


def _entities_for_view(entity_ids: dict[str, str], keys: list[str]) -> list[str]:
    """Return all existing entity ids for the requested keys."""
    return [entity_ids[key] for key in keys if key in entity_ids]


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_name(f"{path.name}.tmp")
    tmp_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp_path.replace(path)


def _write_dashboard_file(path: Path, dashboard_id: str, config: dict[str, Any]) -> None:
    payload = {
        "version": 1,
        "minor_version": 1,
        "key": f"{STORAGE_DASHBOARD_PREFIX}{dashboard_id}",
        "data": {
            "config": config,
        },
    }
    _write_json(path, payload)


def _upsert_dashboard_index(path: Path, item: dict[str, Any]) -> None:
    payload = _read_json(path)
    data = payload.setdefault("data", {})
    items = data.setdefault("items", [])
    items = [existing for existing in items if existing.get("id") != item["id"]]
    items.append(item)
    data["items"] = items
    payload.setdefault("version", 1)
    payload.setdefault("minor_version", 1)
    payload.setdefault("key", STORAGE_DASHBOARDS_FILE)
    _write_json(path, payload)


def _remove_dashboard_file(path: Path) -> None:
    if path.exists():
        path.unlink()


def _remove_dashboard_index(path: Path, dashboard_id: str) -> None:
    if not path.exists():
        return

    payload = _read_json(path)
    data = payload.get("data") or {}
    items = data.get("items") or []
    filtered = [item for item in items if item.get("id") != dashboard_id]
    if filtered == items:
        return

    data["items"] = filtered
    payload["data"] = data
    _write_json(path, payload)
