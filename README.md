# Bundesliga Tracker for Home Assistant

OpenLigaDB-basierte Home-Assistant-Integration fuer Fussballdaten.

Aktuelle Version:

- `0.9.0`

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

1. In HACS das Repository als **Custom Repository** hinzufuegen.
2. Das Repository `hathor1411/bundesliga_tracker` als Typ **Integration** eintragen.
3. Die Integration installieren.
4. Home Assistant neu starten.
5. In Home Assistant zu **Einstellungen** > **Geraete & Dienste** gehen.
6. **Integration hinzufuegen** waehlen.
7. `Bundesliga Tracker` auswaehlen.
8. Wettbewerb und Saison eintragen.
9. Optional eine Favoritenmannschaft setzen.

## Lovelace-Cards

Die Karten liegen in einem separaten HACS-Repository:

- [Bundesliga Tracker Cards](https://github.com/hathor1411/bundesliga_tracker_cards)

Dieses Karten-Repository enthaelt:

- Tabellenkarte
- Spielplankarte

Nach der Installation ueber HACS stehen die Dateien ueber `/hacsfiles/` zur Verfuegung.

### Tabellenkarte

Beispiel-Resource:

```text
/hacsfiles/bundesliga_tracker_cards/dist/openligadb-table-card.js
```

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

### Spielplankarte

Beispiel-Resource:

```text
/hacsfiles/bundesliga_tracker_cards/dist/openligadb-schedule-card.js
```

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

## Datenquelle

Die Daten kommen von [OpenLigaDB](https://www.openligadb.de/).

## GitHub

- [hathor1411/bundesliga_tracker](https://github.com/hathor1411/bundesliga_tracker)
- [hathor1411/bundesliga_tracker_cards](https://github.com/hathor1411/bundesliga_tracker_cards)
