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
            Entity <code>${this._config.entity}</code> wurde nicht gefunden.
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
              ${season ? `<span class="chip">Saison ${this._escapeHtml(String(season))}</span>` : ""}
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
    return `
      <tr class="${favorite ? "favorite" : ""}">
        <td class="rank">
          <span class="rank-badge" style="background:${color}">${this._escapeHtml(String(row.position ?? "-"))}</span>
        </td>
        <td>
          <div class="team">
            <span>${this._escapeHtml(row.team_name || row.short_name || "-")}</span>
            ${marker ? `<span class="favorite-marker">${this._escapeHtml(marker)}</span>` : ""}
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
    const element = document.createElement("div");
    element.innerHTML = `
      <p>OpenLigaDB Tabellen Card</p>
      <p>Konfiguration aktuell ueber YAML.</p>
    `;
    return element;
  }

  static getStubConfig() {
    return {
      type: "custom:openligadb-table-card",
      title: "Bundesliga Tabelle",
      entity: "sensor.bundesliga_2026_tabelle",
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

customElements.define("openligadb-table-card", OpenLigaDBTableCard);
