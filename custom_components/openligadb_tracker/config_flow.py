"""Config flow for OpenLigaDB Tracker."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import (
    COMPETITIONS,
    CONF_COMPETITION,
    CONF_CREATE_DASHBOARD,
    CONF_FAVORITE_TEAM,
    CONF_SEASON,
    DEFAULT_SEASON,
    DOMAIN,
)


def _base_schema(defaults: dict[str, object] | None = None) -> vol.Schema:
    """Build the common schema for config and options flows."""
    defaults = defaults or {}
    return vol.Schema(
        {
            vol.Required(
                CONF_COMPETITION, default=defaults.get(CONF_COMPETITION, "bundesliga")
            ): vol.In({key: value["name"] for key, value in COMPETITIONS.items()}),
            vol.Required(CONF_SEASON, default=defaults.get(CONF_SEASON, DEFAULT_SEASON)): int,
            vol.Optional(
                CONF_FAVORITE_TEAM,
                default=defaults.get(CONF_FAVORITE_TEAM, ""),
            ): str,
            vol.Required(
                CONF_CREATE_DASHBOARD,
                default=defaults.get(CONF_CREATE_DASHBOARD, True),
            ): bool,
        }
    )


def _favorite_team_schema(defaults: dict[str, object] | None = None) -> vol.Schema:
    """Build the options schema for the favorite team only."""
    defaults = defaults or {}
    return vol.Schema(
        {
            vol.Optional(
                CONF_FAVORITE_TEAM,
                default=defaults.get(CONF_FAVORITE_TEAM, ""),
            ): str,
            vol.Required(
                CONF_CREATE_DASHBOARD,
                default=defaults.get(CONF_CREATE_DASHBOARD, True),
            ): bool,
        }
    )


class OpenLigaDBConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for OpenLigaDB Tracker."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, object] | None = None) -> FlowResult:
        """Handle the initial step."""
        if user_input is not None:
            competition = str(user_input[CONF_COMPETITION])
            season = int(user_input[CONF_SEASON])
            favorite_team = str(user_input.get(CONF_FAVORITE_TEAM, "")).strip()
            create_dashboard = bool(user_input.get(CONF_CREATE_DASHBOARD, True))
            await self.async_set_unique_id(f"{competition}_{season}")
            self._abort_if_unique_id_configured()

            data = {
                CONF_COMPETITION: competition,
                CONF_SEASON: season,
                CONF_CREATE_DASHBOARD: create_dashboard,
            }
            if favorite_team:
                data[CONF_FAVORITE_TEAM] = favorite_team

            return self.async_create_entry(
                title=f"{COMPETITIONS[competition]['name']} {season}",
                data=data,
            )

        return self.async_show_form(step_id="user", data_schema=_base_schema())


class OpenLigaDBOptionsFlow(config_entries.OptionsFlowWithReload):
    """Handle options for the integration."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, object] | None = None
    ) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            favorite_team = str(user_input.get(CONF_FAVORITE_TEAM, "")).strip()
            create_dashboard = bool(user_input.get(CONF_CREATE_DASHBOARD, True))
            options = dict(self.config_entry.options)
            if favorite_team:
                options[CONF_FAVORITE_TEAM] = favorite_team
            else:
                options.pop(CONF_FAVORITE_TEAM, None)
            options[CONF_CREATE_DASHBOARD] = create_dashboard
            return self.async_create_entry(title="", data=options)

        defaults = {
            CONF_FAVORITE_TEAM: self.config_entry.options.get(
                CONF_FAVORITE_TEAM,
                self.config_entry.data.get(CONF_FAVORITE_TEAM, ""),
            ),
            CONF_CREATE_DASHBOARD: self.config_entry.options.get(
                CONF_CREATE_DASHBOARD,
                self.config_entry.data.get(CONF_CREATE_DASHBOARD, True),
            ),
        }
        return self.async_show_form(
            step_id="init",
            data_schema=_favorite_team_schema(defaults),
        )


async def async_get_options_flow(
    config_entry: config_entries.ConfigEntry,
) -> OpenLigaDBOptionsFlow:
    """Return the options flow."""
    return OpenLigaDBOptionsFlow(config_entry)
