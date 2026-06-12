class OpenLigaDBTableCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      entity: "",
      title: "Tabelle",
      show_favorite: true,
      show_leader: true,
      show_season: true,
      compact: false,
      champions_league_color: "#1f6feb",
      europa_league_color: "#f59e0b",
      conference_league_color: "#7c3aed",
      relegation_color: "#dc2626",
      ...config,
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

  connectedCallback() {
    this._render();
  }

  _render() {
    if (!this.shadowRoot || !this._config) {
      return;
    }

    const c = this._config;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--primary-text-color);
        }

        .wrap {
          display: grid;
          gap: 14px;
          padding: 16px;
          border: 1px solid var(--divider-color);
          border-radius: 16px;
          background: var(--card-background-color, var(--ha-card-background, #fff));
        }

        .row {
          display: grid;
          gap: 10px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .label {
          font-size: 0.82rem;
          color: var(--secondary-text-color);
        }

        ha-entity-picker,
        ha-textfield,
        input[type="text"] {
          width: 100%;
        }

        .checks {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 16px;
        }

        .check {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.92rem;
        }

        input[type="color"] {
          width: 100%;
          min-height: 42px;
          border: 1px solid var(--divider-color);
          border-radius: 12px;
          background: transparent;
          padding: 0;
        }

        .hint {
          color: var(--secondary-text-color);
          font-size: 0.84rem;
          line-height: 1.4;
        }

        @media (max-width: 800px) {
          .grid-2,
          .grid-4,
          .checks {
            grid-template-columns: 1fr;
          }
        }
      </style>
      <div class="wrap">
        <div class="row">
          <div class="field">
            <div class="label">Sensor</div>
            <ha-entity-picker
              .hass=${this._hass}
              .value=${c.entity || ""}
              .label=${"Sensor"}
              .includeDomains=${["sensor"]}
            ></ha-entity-picker>
          </div>
          <div class="field">
            <div class="label">Titel</div>
            <ha-textfield .value=${c.title || ""} label="Titel"></ha-textfield>
          </div>
          <div class="checks">
            <label class="check">
              <input type="checkbox" data-key="show_favorite" ?checked=${c.show_favorite} />
              Favoriten markieren
            </label>
            <label class="check">
              <input type="checkbox" data-key="show_leader" ?checked=${c.show_leader} />
              Tabellenfuehrer anzeigen
            </label>
            <label class="check">
              <input type="checkbox" data-key="show_season" ?checked=${c.show_season} />
              Wettbewerbssaison anzeigen
            </label>
            <label class="check">
              <input type="checkbox" data-key="compact" ?checked=${c.compact} />
              Kompakte Ansicht
            </label>
          </div>
        </div>

        <div class="row">
          <div class="label">Farben der Zonen</div>
          <div class="grid-2">
            ${this._colorField("champions_league_color", "Champions League-Gruppenphase", c.champions_league_color)}
            ${this._colorField("europa_league_color", "Europa League-Gruppenphase", c.europa_league_color)}
            ${this._colorField(
              "conference_league_color",
              "Europa Conference League-Qualifikationsphase",
              c.conference_league_color
            )}
            ${this._colorField("relegation_color", "Abstieg", c.relegation_color)}
          </div>
        </div>

        <div class="hint">
          Die Card zeigt die Tabelle als echte Lovelace-Karte an. Diese Einstellungen werden direkt im UI gespeichert.
        </div>
      </div>
    `;

    this._bindInputs();
  }

  _colorField(key, label, value) {
    return `
      <div class="field">
        <div class="label">${label}</div>
        <input type="color" data-key="${key}" value="${value}" />
      </div>
    `;
  }

  _bindInputs() {
    const emitChange = () => {
      const config = { ...this._config };
      const entityPicker = this.shadowRoot.querySelector("ha-entity-picker");
      const titleField = this.shadowRoot.querySelector('ha-textfield[label="Titel"]');

      config.entity = entityPicker?.value || "";
      config.title = titleField?.value || "";

      this.shadowRoot.querySelectorAll('input[type="checkbox"][data-key]').forEach((input) => {
        config[input.dataset.key] = input.checked;
      });
      this.shadowRoot.querySelectorAll('input[type="color"][data-key]').forEach((input) => {
        config[input.dataset.key] = input.value;
      });

      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    };

    const entityPicker = this.shadowRoot.querySelector("ha-entity-picker");
    const titleField = this.shadowRoot.querySelector('ha-textfield[label="Titel"]');

    if (entityPicker) {
      entityPicker.addEventListener("value-changed", emitChange);
    }
    if (titleField) {
      titleField.addEventListener("change", emitChange);
      titleField.addEventListener("input", emitChange);
    }

    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-key]').forEach((input) => {
      input.addEventListener("change", emitChange);
    });
    this.shadowRoot.querySelectorAll('input[type="color"][data-key]').forEach((input) => {
      input.addEventListener("input", emitChange);
      input.addEventListener("change", emitChange);
    });
  }
}

class OpenLigaDBTableCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("You need to define an entity");
    }

    this._config = {
      title: config.title || "Tabelle",
      entity: config.entity,
      showFavorite: config.show_favorite !== false,
      showLeader: config.show_leader !== false,
      showSeason: config.show_season !== false,
      compact: config.compact === true,
      championsLeagueColor: config.champions_league_color || "#1f6feb",
      europaLeagueColor: config.europa_league_color || "#f59e0b",
      conferenceLeagueColor: config.conference_league_color || "#7c3aed",
      relegationColor: config.relegation_color || "#dc2626",
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
          --oldb-favorite: var(--accent-color, #03a9f4);
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
          text-align: right;
          font-size: 0.88rem;
          color: var(--oldb-secondary);
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
          gap: 8px;
          font-weight: 600;
        }

        .favorite-marker {
          color: var(--oldb-favorite);
          font-size: 1rem;
        }

        .zone {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          color: white;
          margin-top: 4px;
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
                  <span>Tabellenfuehrer</span>
                  <strong>${this._escapeHtml(leader.team_name || leader.short_name || "-")}</strong>
                  <span>${this._escapeHtml(String(leader.points ?? 0))} Punkte</span>
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
    const color = this._rankColor(row.rank_color);
    const favorite = this._config.showFavorite && row.is_favorite;
    const marker = row.favorite_marker || (favorite ? "★" : "");
    const category = this._categoryForPosition(row.position);
    const categoryClass = category ? `category-${category.key}` : "";
    const zoneLabel = category ? category.label : "";
    const zoneColor = category ? category.color : "";
    return `
      <tr class="${[favorite ? "favorite" : "", categoryClass].filter(Boolean).join(" ")}">
        <td class="rank">
          <span class="rank-badge" style="background:${color}">${this._escapeHtml(String(row.position ?? "-"))}</span>
        </td>
        <td>
          <div class="team">
            <span>${this._escapeHtml(row.team_name || row.short_name || "-")}</span>
            ${marker ? `<span class="favorite-marker">${this._escapeHtml(marker)}</span>` : ""}
          </div>
          ${zoneLabel ? `<div class="zone" style="background:${zoneColor}">${this._escapeHtml(zoneLabel)}</div>` : ""}
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

    if (position <= 4) {
      return {
        key: "champions",
        label: "Champions League",
        color: this._config.championsLeagueColor,
      };
    }

    if (position <= 6) {
      return {
        key: "europa",
        label: "Europa League",
        color: this._config.europaLeagueColor,
      };
    }

    if (position === 7) {
      return {
        key: "conference",
        label: "Conference League",
        color: this._config.conferenceLeagueColor,
      };
    }

    if (position >= 16) {
      return {
        key: "relegation",
        label: "Abstieg",
        color: this._config.relegationColor,
      };
    }

    return null;
  }

  _rankColor(rankColor) {
    const colors = {
      gold: "var(--oldb-gold)",
      silver: "var(--oldb-silver)",
      bronze: "var(--oldb-bronze)",
      blue: "var(--oldb-blue)",
      gray: "var(--oldb-gray)",
    };
    return colors[rankColor] || colors.gray;
  }

  _escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  static getConfigElement() {
    return document.createElement("openligadb-table-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:openligadb-table-card",
      title: "Bundesliga Tabelle",
      entity: "sensor.bundesliga_2026_tabelle",
      show_favorite: true,
      show_leader: true,
      show_season: true,
      compact: false,
      champions_league_color: "#1f6feb",
      europa_league_color: "#f59e0b",
      conference_league_color: "#7c3aed",
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
});

customElements.define("openligadb-table-card-editor", OpenLigaDBTableCardEditor);
customElements.define("openligadb-table-card", OpenLigaDBTableCard);
