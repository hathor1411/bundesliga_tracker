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
4. Verify the created entities in Developer Tools.

## API source

- OpenLigaDB: https://www.openligadb.de/

## Lovelace card

This repository also contains a simple Lovelace card at `www/community/openligadb-table-card/openligadb-table-card.js`.

To use it in Home Assistant:

1. Copy the folder to `config/www/community/openligadb-table-card/`.
2. Add a Lovelace resource with URL `/local/community/openligadb-table-card/openligadb-table-card.js` and type `module`.
3. Add the card in Lovelace via the UI editor or use YAML if you prefer.
4. Example YAML:

```yaml
type: custom:openligadb-table-card
entity: sensor.bundesliga_2026_tabelle
title: Bundesliga Tabelle
```
