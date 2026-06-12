# Bundesliga Tracker for Home Assistant

OpenLigaDB-basierte Home-Assistant-Integration fuer Fussballdaten mit passenden Lovelace-Cards.

Aktuelle Version:

- `0.2.0`

## Was macht die Integration?

Die Integration holt Fussballdaten von OpenLigaDB und stellt sie Home Assistant als Sensoren und Zusatzattribute bereit.

Aktuell unterstuetzt sie:

- Bundesliga
- DFB-Pokal

Je nach Wettbewerb werden unter anderem folgende Daten bereitgestellt:

- Spielplan
- Tabelle
- Top Scorer
- naechstes Spiel
- Spielanzahl
- Favoritenmannschaft
- Team-URLs / Logos
- Match-Kontext mit vergangenen, aktuellen und kommenden Spielen

## Installation ueber HACS

### Integration installieren

1. In HACS das eigene Repository als benutzerdefiniertes Repository hinzufuegen.
2. Das Repository `hathor1411/bundesliga_tracker` eintragen.
3. Als Kategorie `Integration` waehlen.
4. Die Integration installieren.
5. Home Assistant neu starten.
6. In Home Assistant zu **Einstellungen** > **Geraete & Dienste** gehen.
7. **Integration hinzufuegen** waehlen.
8. `Bundesliga Tracker` auswaehlen.
9. Wettbewerb und Saison eintragen.
10. Optional eine Favoritenmannschaft setzen.

## Lovelace-Cards einbinden

Zum Projekt gehoeren zwei Custom Cards:

- Tabellenkarte
- Spielplankarte

Die Dateien liegen im Ordner `www/community/`.

### 1. Tabellenkarte

Datei:

- `www/community/openligadb-table-card/openligadb-table-card.js`

Resource-URL:

- `/local/community/openligadb-table-card/openligadb-table-card.js`

Beispiel:

```yaml
type: custom:openligadb-table-card
entity: sensor.bundesliga_2026_table
title: Bundesliga Tabelle
```

Die Tabellenkarte zeigt die Ligatabelle mit:

- farbigen Zonen
- Favoritenmarkierung
- Team-Logos
- Platzierungsfarben

### 2. Spielplankarte

Datei:

- `www/community/openligadb-schedule-card/openligadb-schedule-card.js`

Resource-URL:

- `/local/community/openligadb-schedule-card/openligadb-schedule-card.js`

Beispiel:

```yaml
type: custom:openligadb-schedule-card
entity: sensor.bundesliga_2026_schedule
title: Spielplan
past_limit: 3
upcoming_limit: 5
```

Die Spielplankarte zeigt:

- vergangene Spiele in einem einklappbaren Bereich
- das aktuelle bzw. naechste relevante Spiel prominent
- kommende Spiele in einem zweiten einklappbaren Bereich
- Live-Badge, Countdown und Halbzeitstand
- Logos und Match-Status

### Karte in Home Assistant einbinden

1. Die JS-Datei in `config/www/community/...` ablegen.
2. In Home Assistant unter **Einstellungen** > **Dashboards** > **Ressourcen** die Datei als Modul eintragen.
3. Die Karte im Dashboard hinzufuegen.

## Datenquelle

Die Daten kommen von [OpenLigaDB](https://www.openligadb.de/).

## Projektstruktur

- `custom_components/openligadb_tracker/` - Home-Assistant-Integration
- `www/community/openligadb-table-card/` - Tabellenkarte
- `www/community/openligadb-schedule-card/` - Spielplankarte

## GitHub

Repository:

- [hathor1411/bundesliga_tracker](https://github.com/hathor1411/bundesliga_tracker)

