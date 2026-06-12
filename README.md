# Bundesliga Tracker for Home Assistant

OpenLigaDB-basierte Home-Assistant-Integration fuer Fussballdaten mit passenden Lovelace-Cards.

Aktueller Stand der Integration:

- Bundesliga
- DFB-Pokal
- Spielplan, Tabelle, Top Scorer, Form, Heim/Auswaerts und Statistiken als Sensoren
- Favoritenmannschaft pro Konfiguration
- Team-URLs / Logos in den Daten fuer Cards
- Match-Kontext fuer vergangene, aktuelle und kommende Spiele

Aktuelle Version:

- `0.2.0`

## Datenquelle

Die Daten kommen von [OpenLigaDB](https://www.openligadb.de/).

Verwendete API-Beispiele:

- Spielplan / Match-Daten
- Tabelle
- Top Scorer
- Rundenuebersicht fuer K.-o.-Wettbewerbe

## Projektstruktur

- `custom_components/openligadb_tracker/` - Home-Assistant-Integration
- `www/community/openligadb-table-card/` - Lovelace-Card fuer die Tabelle
- `www/community/openligadb-schedule-card/` - Lovelace-Card fuer den Spielplan

## Was die Integration macht

Die Integration holt Daten von OpenLigaDB und stellt sie Home Assistant als Sensoren und Zusatzattribute bereit.

Je nach Wettbewerb werden unterschiedliche Sensoren erzeugt:

### Bundesliga

- `sensor.<competition>_schedule`
- `sensor.<competition>_table`
- `sensor.<competition>_table_position`
- `sensor.<competition>_points`
- `sensor.<competition>_goals_scored`
- `sensor.<competition>_goals_conceded`
- `sensor.<competition>_table_leader`
- `sensor.<competition>_top_scorer`
- `sensor.<competition>_next_match`
- `sensor.<competition>_next_match_time`
- `sensor.<competition>_match_count`

### DFB-Pokal

- `sensor.<competition>_schedule`
- `sensor.<competition>_round_overview`
- `sensor.<competition>_top_scorer`
- `sensor.<competition>_next_match`
- `sensor.<competition>_next_match_time`
- `sensor.<competition>_match_count`

Hinweis:

- Die Integration ist aktuell auf Bundesliga und DFB-Pokal ausgelegt.
- Ein Favoritenteam kann in der Konfiguration gesetzt werden.

## Installation in Home Assistant

### Variante 1: Repository lokal entwickeln

1. Den Ordner `custom_components/openligadb_tracker/` nach `config/custom_components/openligadb_tracker/` kopieren.
2. Den Ordner `www/community/openligadb-table-card/` nach `config/www/community/openligadb-table-card/` kopieren.
3. Den Ordner `www/community/openligadb-schedule-card/` nach `config/www/community/openligadb-schedule-card/` kopieren.
4. Home Assistant neu starten.

### Variante 2: Direkt aus GitHub verwenden

1. Repository auf GitHub klonen.
2. Die Dateien in die Home-Assistant-Instanz uebertragen.
3. Home Assistant neu starten.

## Integration einrichten

1. In Home Assistant zu **Einstellungen** > **Geraete & Dienste** gehen.
2. **Integration hinzufuegen** waehlen.
3. `Bundesliga Tracker` auswaehlen.
4. Wettbewerb waehlen:
   - `Bundesliga`
   - `DFB-Pokal`
5. Saison eintragen.
6. Optional eine Favoritenmannschaft setzen.

### Optionen

In den Optionen kann aktuell nur die Favoritenmannschaft angepasst werden.

## Lovelace-Cards

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

Die Tabellenkarte unterstuetzt unter anderem:

- farbliche Zonen
- Favoritenmarkierung
- Team-Logos
- flexible Platzierungsbereiche

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

## Wie man die Karten in Home Assistant laedt

1. Die JS-Datei in `config/www/community/...` ablegen.
2. In Home Assistant unter **Einstellungen** > **Dashboards** > **Ressourcen** die Datei als Modul eintragen.
3. Die Karte in Lovelace hinzufuegen.

Beispiele:

- Tabellenkarte: `/local/community/openligadb-table-card/openligadb-table-card.js`
- Spielplankarte: `/local/community/openligadb-schedule-card/openligadb-schedule-card.js`

## Entwicklung und Testen

### Lokale Tests

1. Die Integration und Karten in den Home-Assistant-Ordner kopieren.
2. Home Assistant neu starten.
3. Die Integration neu hinzufuegen oder neu laden.
4. Die Sensoren in den Entwicklertools pruefen.
5. Die Lovelace-Karten im Dashboard testen.

### Aenderungen an der Integration testen

Wenn sich nur Python-Code geaendert hat:

1. Dateien in `custom_components/openligadb_tracker/` anpassen.
2. Home Assistant neu laden oder neu starten.
3. Die Sensoren im UI pruefen.

### Aenderungen an den Karten testen

Wenn sich nur die Cards geaendert haben:

1. Die JS-Datei im `www/community/...`-Ordner anpassen.
2. Die Resource in Home Assistant mit Hard-Reload neu laden.
3. Die Karte im Dashboard pruefen.

## Wichtige Hinweise

- Die Schedule- und Table-Cards arbeiten mit den Zusatzattributen der Sensoren.
- Die Favoritenmannschaft wird in den Daten beruecksichtigt und kann in der Darstellung hervorgehoben werden.
- Die Integration ist aktuell bewusst klein gestartet und wird schrittweise erweitert.

## GitHub

Repository:

- [hathor1411/bundesliga_tracker](https://github.com/hathor1411/bundesliga_tracker)

## Status

Der aktuelle Stand ist:

- Integration laeuft
- Bundesliga und DFB-Pokal sind eingebunden
- Tabellenkarte vorhanden
- Spielplankarte vorhanden
- Favoritenlogik und Match-Kontext sind umgesetzt

