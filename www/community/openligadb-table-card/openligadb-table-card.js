class OpenLigaDBTableCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("You need to define an entity");
    }

    this._config = {
      title: config.title || "Tabelle",
      entity: config.entity,
      showFavorite: config.show_favorite !== false,
      favoriteFullRow: config.favorite_full_row !== false,
      showLeader: config.show_leader !== false,
      showSeason: config.show_season !== false,
      compact: config.compact === true,
      championsLeaguePlaces: this._toPositiveInteger(config.champions_league_places, 4),
      europaLeaguePlaces: this._toPositiveInteger(config.europa_league_places, 2),
      conferenceLeaguePlaces: this._toPositiveInteger(config.conference_league_places, 1),
      favoriteColor: this._toCssColor(config.favorite_color, "#03a9f4"),
      championsLeagueColor: this._toCssColor(config.champions_league_color, "#1f6feb"),
      europaLeagueColor: this._toCssColor(config.europa_league_color, "#f59e0b"),
      conferenceLeagueColor: this._toCssColor(config.conference_league_color, "#7c3aed"),
      relegationPlayoffColor: this._toCssColor(config.relegation_playoff_color, "#f97316"),
      relegationColor: this._toCssColor(config.relegation_color, "#dc2626"),
    };

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return this._config?.compact ? 6 : 8;
  }

  _render() {
    if (!this._config || !this.shadowRoot || !this._hass) {
      return;
    }

    const state = this._hass.states[this._config.entity];
    if (!state) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="empty">
            Entity <code>${this._escapeHtml(this._config.entity)}</code> wurde nicht gefunden.
          </div>
        </ha-card>
      `;
      return;
    }

    const rows = Array.isArray(state.attributes.rows) ? [...state.attributes.rows] : [];
    rows.sort((a, b) => (a.position || 0) - (b.position || 0));

    const competition = state.attributes.competition || "";
    const season = state.attributes.season || "";
    const favoriteTeam = state.attributes.favorite_team || "";
    const leader = rows[0] || null;
    const topRows = this._config.compact ? rows.slice(0, 10) : rows;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --oldb-bg: var(--card-background-color, var(--ha-card-background, #fff));
          --oldb-text: var(--primary-text-color);
          --oldb-secondary: var(--secondary-text-color);
          --oldb-border: var(--divider-color);
          --oldb-favorite: ${this._config.favoriteColor};
          --oldb-gold: #d4af37;
          --oldb-silver: #9aa4b2;
          --oldb-bronze: #cd7f32;
          --oldb-blue: #4b8bff;
          --oldb-gray: #7f8c8d;
        }

        ha-card {
          padding: 16px;
          background: var(--oldb-bg);
          color: var(--oldb-text);
          border-radius: 16px;
          box-shadow: var(--ha-card-box-shadow, none);
        }

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .title {
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .meta {
          margin-top: 4px;
          color: var(--oldb-secondary);
          font-size: 0.85rem;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--primary-color) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-color) 18%, transparent);
          color: var(--oldb-text);
          font-size: 0.8rem;
        }

        .leader {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: var(--oldb-secondary);
        }

        .leader-logo,
        .team-logo {
          width: 20px;
          height: 20px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .leader-logo {
          width: 28px;
          height: 28px;
        }

        .leader-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.15;
        }

        .leader strong {
          display: block;
          color: var(--oldb-text);
          font-size: 1rem;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.92rem;
        }

        thead th {
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--oldb-secondary);
          border-bottom: 1px solid var(--oldb-border);
          padding: 8px 6px;
          white-space: nowrap;
        }

        tbody td {
          padding: 10px 6px;
          border-bottom: 1px solid color-mix(in srgb, var(--oldb-border) 70%, transparent);
          vertical-align: middle;
        }

        tbody tr:hover {
          background: color-mix(in srgb, var(--primary-color) 7%, transparent);
        }

        tbody tr.favorite {
          box-shadow: inset 6px 0 0 var(--oldb-favorite);
        }

        tbody tr.favorite td {
          background: color-mix(in srgb, var(--oldb-favorite) 12%, transparent);
        }

        tbody tr.category-champions {
          box-shadow: inset 4px 0 0 ${this._config.championsLeagueColor};
        }

        tbody tr.category-europa {
          box-shadow: inset 4px 0 0 ${this._config.europaLeagueColor};
        }

        tbody tr.category-conference {
          box-shadow: inset 4px 0 0 ${this._config.conferenceLeagueColor};
        }

        tbody tr.category-relegation {
          box-shadow: inset 4px 0 0 ${this._config.relegationColor};
        }

        .rank {
          width: 52px;
          text-align: center;
          border-radius: 10px;
        }

        .rank-badge {
          display: inline-flex;
          min-width: 34px;
          height: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-weight: 700;
          color: white;
          font-size: 0.9rem;
        }

        .team {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          line-height: 1.15;
          min-height: 20px;
        }

        .team-name {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .muted {
          color: var(--oldb-secondary);
          font-size: 0.84rem;
        }

        .stat {
          white-space: nowrap;
        }

        .empty {
          padding: 16px;
          color: var(--oldb-secondary);
        }

        @media (max-width: 700px) {
          ha-card {
            padding: 12px;
          }

          .header {
            flex-direction: column;
          }

          table {
            font-size: 0.84rem;
          }

          thead th,
          tbody td {
            padding-left: 4px;
            padding-right: 4px;
          }
        }
      </style>
      <ha-card>
        <div class="header">
          <div>
            <div class="title">${this._escapeHtml(this._config.title)}</div>
            <div class="meta">
              ${competition ? `<span class="chip">${this._escapeHtml(competition)}</span>` : ""}
              ${season && this._config.showSeason ? `<span class="chip">Saison ${this._escapeHtml(String(season))}</span>` : ""}
              ${favoriteTeam ? `<span class="chip">Liebling: ${this._escapeHtml(favoriteTeam)}</span>` : ""}
            </div>
          </div>
          ${
            leader && this._config.showLeader
              ? `<div class="leader">
                  ${(leader.team_url || leader.team_icon_url) ? `<img class="leader-logo" src="${this._escapeHtml(leader.team_url || leader.team_icon_url)}" alt="">` : ""}
                  <div class="leader-text">
                    <span>Tabellenfuehrer</span>
                    <strong>${this._escapeHtml(leader.team_name || leader.short_name || "-")}</strong>
                    <span>${this._escapeHtml(String(leader.points ?? 0))} Punkte</span>
                  </div>
                </div>`
              : ""
          }
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="rank">Rang</th>
                <th>Mannschaft</th>
                <th>Pkte</th>
                <th>Sp.</th>
                <th>S-U-N</th>
                <th>Tore</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              ${topRows.map((row) => this._renderRow(row)).join("")}
            </tbody>
          </table>
        </div>
      </ha-card>
    `;
  }

  _renderRow(row) {
    const color = this._placementColor(row.position);
    const favorite = this._config.showFavorite && row.is_favorite;
    const favoriteRow = favorite && this._config.favoriteFullRow;
    const category = this._categoryForPosition(row.position);
    const categoryClass = category ? `category-${category.key}` : "";
    return `
      <tr class="${[favoriteRow ? "favorite" : "", categoryClass].filter(Boolean).join(" ")}">
        <td class="rank">
          <span class="rank-badge" style="background:${color}">${this._escapeHtml(String(row.position ?? "-"))}</span>
        </td>
        <td>
          <div class="team">
            ${(row.team_url || row.team_icon_url) ? `<img class="team-logo" src="${this._escapeHtml(row.team_url || row.team_icon_url)}" alt="">` : ""}
            <span class="team-name">${this._escapeHtml(row.team_name || row.short_name || "-")}</span>
          </div>
          ${row.short_name && row.short_name !== row.team_name ? `<div class="muted">${this._escapeHtml(row.short_name)}</div>` : ""}
        </td>
        <td class="stat">${this._escapeHtml(String(row.points ?? "-"))}</td>
        <td class="stat">${this._escapeHtml(String(row.matches ?? "-"))}</td>
        <td class="stat">${this._escapeHtml([row.won, row.draw, row.lost].map((value) => value ?? 0).join("-"))}</td>
        <td class="stat">${this._escapeHtml(`${row.goals_scored ?? "-"}:${row.goals_conceded ?? "-"}`)}</td>
        <td class="stat">${this._escapeHtml(String(row.goal_diff ?? "-"))}</td>
      </tr>
    `;
  }

  _categoryForPosition(position) {
    if (typeof position !== "number") {
      return null;
    }

    const championsMax = this._config.championsLeaguePlaces || 0;
    const europaMax = championsMax + (this._config.europaLeaguePlaces || 0);
    const conferenceMax = europaMax + (this._config.conferenceLeaguePlaces || 0);

    if (championsMax > 0 && position <= championsMax) {
      return {
        key: "champions",
        color: this._config.championsLeagueColor,
      };
    }

    if (this._config.europaLeaguePlaces > 0 && position <= europaMax) {
      return {
        key: "europa",
        color: this._config.europaLeagueColor,
      };
    }

    if (this._config.conferenceLeaguePlaces > 0 && position <= conferenceMax) {
      return {
        key: "conference",
        color: this._config.conferenceLeagueColor,
      };
    }

    if (position >= 16) {
      if (position === 16) {
        return {
          key: "relegation-playoff",
          color: this._config.relegationPlayoffColor,
        };
      }

      return {
        key: "relegation",
        color: this._config.relegationColor,
      };
    }

    return null;
  }

  _placementColor(position) {
    if (typeof position === "number") {
      const championsMax = this._config.championsLeaguePlaces || 0;
      const europaMax = championsMax + (this._config.europaLeaguePlaces || 0);
      const conferenceMax = europaMax + (this._config.conferenceLeaguePlaces || 0);

      if (championsMax > 0 && position <= championsMax) {
        return this._config.championsLeagueColor;
      }

      if (this._config.europaLeaguePlaces > 0 && position <= europaMax) {
        return this._config.europaLeagueColor;
      }

      if (this._config.conferenceLeaguePlaces > 0 && position <= conferenceMax) {
        return this._config.conferenceLeagueColor;
      }

      if (position === 16) {
        return this._config.relegationPlayoffColor;
      }

      if (position >= 17) {
        return this._config.relegationColor;
      }
    }

    const colors = {
      gray: "var(--oldb-gray)",
    };
    return colors.gray;
  }

  _escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  _toCssColor(value, fallback) {
    if (Array.isArray(value) && value.length === 3) {
      return `rgb(${value[0]}, ${value[1]}, ${value[2]})`;
    }

    if (typeof value === "string" && value.trim()) {
      return value;
    }

    return fallback;
  }

  _toPositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }

    return fallback;
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: {
            entity: {
              domain: "sensor",
            },
          },
        },
        {
          name: "title",
          selector: {
            text: {},
          },
        },
        {
          type: "grid",
          name: "options",
          flatten: true,
          schema: [
            { name: "show_favorite", selector: { boolean: {} } },
            { name: "favorite_full_row", selector: { boolean: {} } },
            { name: "show_leader", selector: { boolean: {} } },
            { name: "show_season", selector: { boolean: {} } },
            { name: "compact", selector: { boolean: {} } },
          ],
        },
        {
          type: "grid",
          name: "placements",
          flatten: true,
          schema: [
            {
              name: "champions_league_places",
              selector: {
                number: {
                  min: 0,
                  max: 10,
                  step: 1,
                  mode: "box",
                },
              },
            },
            {
              name: "europa_league_places",
              selector: {
                number: {
                  min: 0,
                  max: 10,
                  step: 1,
                  mode: "box",
                },
              },
            },
            {
              name: "conference_league_places",
              selector: {
                number: {
                  min: 0,
                  max: 10,
                  step: 1,
                  mode: "box",
                },
              },
            },
          ],
        },
        {
          name: "favorite_color",
          selector: { color_rgb: {} },
        },
        {
          type: "expandable",
          name: "zone_colors",
          flatten: true,
          title: "Farben der Zonen",
          schema: [
            {
              name: "champions_league_color",
              selector: { color_rgb: {} },
            },
            {
              name: "europa_league_color",
              selector: { color_rgb: {} },
            },
            {
              name: "conference_league_color",
              selector: { color_rgb: {} },
            },
            {
              name: "relegation_playoff_color",
              selector: { color_rgb: {} },
            },
            {
              name: "relegation_color",
              selector: { color_rgb: {} },
            },
          ],
        },
      ],
      computeLabel: (schema) => {
        switch (schema.name) {
          case "entity":
            return "Sensor";
          case "title":
            return "Titel";
          case "show_favorite":
            return "Favoriten markieren";
          case "favorite_full_row":
            return "Favorit ueber ganze Zeile";
          case "show_leader":
            return "Tabellenfuehrer anzeigen";
          case "show_season":
            return "Wettbewerbssaison anzeigen";
          case "compact":
            return "Kompakte Ansicht";
          case "champions_league_places":
            return "Plätze Champions League";
          case "europa_league_places":
            return "Plätze Europa League";
          case "conference_league_places":
            return "Plätze Conference League";
          case "favorite_color":
            return "Favoritenfarbe";
          case "champions_league_color":
            return "Champions League-Gruppenphase";
          case "europa_league_color":
            return "Europa League-Gruppenphase";
          case "conference_league_color":
            return "Europa Conference League-Qualifikationsphase";
          case "relegation_playoff_color":
            return "Relegationsplatz 16";
          case "relegation_color":
            return "Abstieg 17/18";
          default:
            return undefined;
        }
      },
      computeHelper: (schema) => {
        if (schema.name === "entity") {
          return "Waehle den Tabellen-Sensor der Integration aus.";
        }
        if (schema.name === "title") {
          return "Wird als Karten-Titel angezeigt.";
        }
        return undefined;
      },
      assertConfig: (config) => {
        if (!config.entity) {
          throw new Error("An entity is required.");
        }
      },
    };
  }

  static getStubConfig() {
    return {
      type: "custom:openligadb-table-card",
      title: "Bundesliga Tabelle",
      entity: "sensor.bundesliga_2026_tabelle",
      show_favorite: true,
      favorite_full_row: true,
      show_leader: true,
      show_season: true,
      compact: false,
      champions_league_places: 4,
      europa_league_places: 2,
      conference_league_places: 1,
      favorite_color: "#03a9f4",
      champions_league_color: "#1f6feb",
      europa_league_color: "#f59e0b",
      conference_league_color: "#7c3aed",
      relegation_playoff_color: "#f97316",
      relegation_color: "#dc2626",
    };
  }

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }
}

if (!window.customCards) {
  window.customCards = [];
}

window.customCards.push({
  type: "openligadb-table-card",
  name: "OpenLigaDB Table Card",
  description: "Shows the OpenLigaDB standings table in a compact Lovelace card.",
  getEntitySuggestion: (hass, entityId) => {
    const state = hass.states[entityId];
    if (!state || state.attributes?.rows === undefined) {
      return null;
    }

    return {
      config: {
        type: "custom:openligadb-table-card",
        entity: entityId,
        title: state.attributes.competition
          ? `${state.attributes.competition} Tabelle`
          : "Tabelle",
      },
    };
  },
});

customElements.define("openligadb-table-card", OpenLigaDBTableCard);


