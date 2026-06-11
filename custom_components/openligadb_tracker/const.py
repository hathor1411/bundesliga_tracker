"""Constants for OpenLigaDB Tracker."""

DOMAIN = "openligadb_tracker"

CONF_COMPETITION = "competition"
CONF_SEASON = "season"
CONF_FAVORITE_TEAM = "favorite_team"
CONF_CREATE_DASHBOARD = "create_dashboard"

COMPETITIONS: dict[str, dict[str, str]] = {
    "bundesliga": {
        "name": "Bundesliga",
        "shortcut": "bl1",
    },
    "dfb_pokal": {
        "name": "DFB-Pokal",
        "shortcut": "dfb",
    },
}

DEFAULT_SEASON = 2025
