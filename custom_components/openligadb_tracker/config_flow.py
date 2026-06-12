"""Config flow for OpenLigaDB Tracker."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import COMPETITIONS, CONF_COMPETITION, CONF_SEASON, DOMAIN, DEFAULT_SEASON


class OpenLigaDBConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for OpenLigaDB Tracker."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, object] | None = None) -> FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            competition = str(user_input[CONF_COMPETITION])
            season = int(user_input[CONF_SEASON])
            await self.async_set_unique_id(f"{competition}_{season}")
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title=f"{COMPETITIONS[competition]['name']} {season}",
                data={
                    CONF_COMPETITION: competition,
                    CONF_SEASON: season,
                },
            )

        schema = vol.Schema(
            {
                vol.Required(CONF_COMPETITION): vol.In(
                    {
                        key: value["name"]
                        for key, value in COMPETITIONS.items()
                    }
                ),
                vol.Required(CONF_SEASON, default=DEFAULT_SEASON): int,
            }
        )

        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

