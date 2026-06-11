# Bundesliga Tracker for Home Assistant

Custom integration for Home Assistant based on OpenLigaDB.

## Scope

- Bundesliga
- DFB-Pokal

## Project layout

- `custom_components/openligadb_tracker/` - Home Assistant integration
- `tests/components/openligadb_tracker/` - test cases

## Local testing

1. Copy `custom_components/openligadb_tracker/` into your Home Assistant `config/custom_components/` folder.
2. Restart Home Assistant.
3. Add the integration from the UI.
4. Choose whether to install the dashboard.
5. Verify the created entities in Developer Tools.
6. If the dashboard option was enabled, open the new sidebar dashboard and check that the cards render.

## API source

- OpenLigaDB: https://www.openligadb.de/
