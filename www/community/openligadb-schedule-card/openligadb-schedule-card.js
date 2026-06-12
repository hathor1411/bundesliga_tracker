class OpenLigaDBScheduleCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("You need to define an entity");
    }

    this._config = {
      title: config.title || "Spielplan",
      entity: config.entity,
      pastLimit: this._toPositiveInteger(config.past_limit, 3),
      upcomingLimit: this._toPositiveInteger(config.upcoming_limit, 5),
    };

    if (this._pastOpen === undefined) {
      this._pastOpen = false;
    }

    if (this._upcomingOpen === undefined) {
      this._upcomingOpen = true;
    }

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
    this._startTimer();
  }

  disconnectedCallback() {
    this._stopTimer();
  }

  getCardSize() {
    return 10;
  }

  _startTimer() {
    this._stopTimer();
    this._now = new Date();
    this._timer = window.setInterval(() => {
      this._now = new Date();
      this._render();
    }, 60000);
  }

  _stopTimer() {
    if (this._timer) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
  }

  _render() {
    if (!this._config || !this.shadowRoot || !this._hass) {
      return;
    }

    const state = this._hass.states[this._config.entity];
    if (!state) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="empty">Entity <code>${this._escapeHtml(this._config.entity)}</code> wurde nicht gefunden.</div>
        </ha-card>
      `;
      return;
    }

    const favoriteMatches = state.attributes.favorite_matches || {};
    const featured = favoriteMatches.featured || state.attributes.next_match || null;
    const previousMatches = Array.isArray(favoriteMatches.previous)
      ? favoriteMatches.previous.slice(0, this._config.pastLimit)
      : [];
    const nextMatches = Array.isArray(favoriteMatches.next)
      ? favoriteMatches.next.slice(0, this._config.upcomingLimit)
      : [];
    const pastMatches = previousMatches;
    const competition = state.attributes.competition || "";
    const season = state.attributes.season || "";
    const favoriteTeam = state.attributes.favorite_team || "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--primary-text-color);
        }

        ha-card {
          padding: 0;
          overflow: hidden;
          border-radius: 18px;
          background: var(--card-background-color, var(--ha-card-background, #fff));
          box-shadow: var(--ha-card-box-shadow, none);
        }

        .hero {
          position: relative;
          padding: 24px 20px 20px;
          background: linear-gradient(180deg, #1b1b1b 0%, #101010 100%);
          color: #fff;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          background-repeat: no-repeat;
          background-size: 240px auto;
          opacity: 0.2;
          pointer-events: none;
          filter: saturate(0.9);
        }

        .hero-bg-left {
          background-position: left -12px center;
        }

        .hero-bg-right {
          background-position: right -12px center;
        }

        .hero::before,
        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.08;
          pointer-events: none;
        }

        .hero::before {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
        }

        .hero-header {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          color: rgba(255,255,255,0.7);
          font-size: 0.84rem;
        }

        .chip {
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .hero-match {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 140px minmax(0, 1fr);
          gap: 16px;
          align-items: center;
          min-height: 180px;
        }

        .side {
          display: grid;
          justify-items: center;
          gap: 6px;
          text-align: center;
          min-width: 0;
        }

        .team-logo {
          width: 88px;
          height: 88px;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        }

        .team-name {
          font-size: 1.08rem;
          font-weight: 600;
          line-height: 1.1;
        }

        .team-record {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.72);
        }

        .score {
          display: grid;
          justify-items: center;
          gap: 5px;
          color: #fff;
        }

        .status-line {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--primary-color) 12%, transparent);
          color: var(--secondary-text-color);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        @keyframes liveBlink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0.25;
          }
        }

        .status-line.live {
          background: rgba(0, 200, 83, 0.14);
          color: #2dff7a;
          animation: liveBlink 1s steps(2, start) infinite;
        }

        .status-line.ended {
          background: color-mix(in srgb, var(--divider-color) 18%, transparent);
          color: var(--secondary-text-color);
        }

        .status-line.countdown {
          background: color-mix(in srgb, var(--primary-color) 12%, transparent);
          color: var(--primary-text-color);
        }

        .score-line {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 34px;
          font-size: 3.8rem;
          line-height: 1;
          font-weight: 500;
          letter-spacing: -0.04em;
        }

        .score-meta {
          position: relative;
          z-index: 1;
          margin-top: 8px;
          font-size: 0.92rem;
          color: rgba(255,255,255,0.8);
        }

        .score-submeta {
          margin-top: 4px;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
        }

        .body {
          padding: 16px 18px 18px;
        }

        .section + .section {
          margin-top: 16px;
        }

        .section-title {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .section-title span:last-child {
          color: var(--secondary-text-color);
          font-size: 0.82rem;
          font-weight: 600;
        }

        .accordion {
          margin-top: 16px;
          border: 1px solid color-mix(in srgb, var(--divider-color) 72%, transparent);
          border-radius: 16px;
          overflow: hidden;
          background: color-mix(in srgb, var(--primary-color) 2%, transparent);
        }

        .accordion + .accordion {
          margin-top: 12px;
        }

        .accordion-past {
          border-left: 5px solid color-mix(in srgb, var(--secondary-text-color) 35%, transparent);
        }

        .accordion-upcoming {
          border-left: 5px solid color-mix(in srgb, var(--primary-color) 52%, transparent);
        }

        .accordion summary {
          list-style: none;
          cursor: pointer;
          user-select: none;
          display: block;
          padding: 14px 14px 12px;
          background: color-mix(in srgb, var(--primary-color) 3%, transparent);
          transition: background 0.18s ease;
        }

        .accordion summary:hover {
          background: color-mix(in srgb, var(--primary-color) 5%, transparent);
        }

        .accordion-past summary {
          background: color-mix(in srgb, var(--secondary-background-color) 48%, transparent);
        }

        .accordion-past summary:hover {
          background: color-mix(in srgb, var(--secondary-background-color) 64%, transparent);
        }

        .accordion-upcoming summary {
          background: color-mix(in srgb, var(--primary-color) 4%, transparent);
        }

        .accordion-upcoming summary:hover {
          background: color-mix(in srgb, var(--primary-color) 7%, transparent);
        }

        .accordion summary::-webkit-details-marker {
          display: none;
        }

        .accordion-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          font-weight: 700;
        }

        .accordion-header-left {
          display: grid;
          gap: 4px;
        }

        .accordion-kicker {
          color: var(--secondary-text-color);
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .accordion-title {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 0.98rem;
          letter-spacing: 0.01em;
        }

        .accordion-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          padding: 0 8px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--primary-color) 10%, transparent);
          color: var(--primary-text-color);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .accordion-past .accordion-count {
          background: color-mix(in srgb, var(--secondary-text-color) 12%, transparent);
        }

        .accordion-upcoming .accordion-count {
          background: color-mix(in srgb, var(--primary-color) 14%, transparent);
        }

        .accordion-indicator {
          color: var(--secondary-text-color);
          font-size: 0.82rem;
          font-weight: 700;
          transition: transform 0.18s ease;
        }

        .accordion[open] .accordion-indicator {
          transform: rotate(180deg);
        }

        .accordion-body {
          padding: 0 14px 14px;
        }

        .match-list {
          display: grid;
          gap: 8px;
          padding-top: 2px;
        }

        .match-row {
          display: grid;
          grid-template-columns: 86px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border: 1px solid color-mix(in srgb, var(--divider-color) 70%, transparent);
          border-radius: 14px;
          background: color-mix(in srgb, var(--primary-color) 4%, transparent);
        }

        .match-row.future {
          border-color: color-mix(in srgb, var(--primary-color) 18%, var(--divider-color));
        }

        .match-row.past {
          grid-template-columns: 86px minmax(0, 1fr) 108px;
          background: color-mix(in srgb, var(--secondary-background-color) 68%, transparent);
          opacity: 0.62;
          filter: grayscale(1);
          align-items: center;
        }

        .match-row.past .match-meta {
          color: color-mix(in srgb, var(--secondary-text-color) 90%, #fff);
        }

        .date {
          color: var(--secondary-text-color);
          font-size: 0.82rem;
          line-height: 1.1;
        }

        .date strong {
          display: block;
          color: var(--primary-text-color);
          font-size: 0.95rem;
        }

        .teams {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .team-line {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          line-height: 1.1;
        }

        .team-logo-small {
          width: 18px;
          height: 18px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .team-text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }

        .match-meta {
          text-align: right;
          color: var(--secondary-text-color);
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .season-note {
          padding: 10px 12px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--warning-color) 10%, transparent);
          color: var(--secondary-text-color);
          font-size: 0.86rem;
          line-height: 1.35;
        }

        .match-score {
          text-align: center;
          color: var(--primary-text-color);
          font-size: 1.02rem;
          font-weight: 700;
          line-height: 1.1;
          white-space: nowrap;
          padding-left: 8px;
        }

        .match-score .match-group {
          display: block;
          margin-top: 4px;
          color: var(--secondary-text-color);
          font-size: 0.76rem;
          font-weight: 600;
          white-space: normal;
        }

        .match-row.past .match-score {
          color: var(--secondary-text-color);
          font-size: 1.02rem;
          font-weight: 700;
        }

        .match-row.past .team-text {
          font-weight: 600;
        }

        .empty {
          padding: 16px;
          color: var(--secondary-text-color);
        }

        @media (max-width: 700px) {
          .hero {
            padding: 14px;
          }

          .body {
            padding: 14px;
          }

          .hero-match {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .score-line {
            font-size: 2.1rem;
          }

          .match-row {
            grid-template-columns: 74px minmax(0, 1fr);
          }

          .match-meta {
            grid-column: 1 / -1;
            text-align: left;
          }

          .match-row.past {
            grid-template-columns: 74px minmax(0, 1fr);
          }

          .match-row.past .match-score {
            grid-column: 1 / -1;
            text-align: left;
            padding-left: 0;
          }
        }
      </style>
        <ha-card>
        ${pastMatches.length
          ? `
            <details class="accordion accordion-past" ${this._pastOpen ? "open" : ""}>
              <summary>
                <div class="accordion-header">
                  <span class="accordion-header-left">
                    <span class="accordion-kicker">Rueckblick</span>
                    <span class="accordion-title">
                      <span>Vergangene Spiele</span>
                      <span class="accordion-count">${this._escapeHtml(String(pastMatches.length))}</span>
                    </span>
                  </span>
                  <span class="accordion-indicator">v</span>
                </div>
              </summary>
              <div class="accordion-body">
                <div class="match-list">
                  ${pastMatches.slice().reverse().map((match) => this._renderMatchRow(match, "past")).join("")}
                </div>
              </div>
            </details>
          `
          : ""}

        <div class="hero">
          ${this._renderHeroBackground(featured)}
          <div class="hero-header">
            <div>
              <div class="title">${this._escapeHtml(this._config.title)}</div>
              <div class="meta">
                ${competition ? `<span class="chip">${this._escapeHtml(competition)}</span>` : ""}
                ${season ? `<span class="chip">Saison ${this._escapeHtml(String(season))}</span>` : ""}
                ${favoriteTeam ? `<span class="chip">Liebling: ${this._escapeHtml(favoriteTeam)}</span>` : ""}
              </div>
            </div>
          </div>

          ${
            featured
              ? `
                <div class="hero-match">
                  ${this._renderHeroSide(featured.home_team, featured.home_team_url || featured.home_team_icon_url, featured.home_score, featured.home_team_record)}
                  ${this._renderHeroScore(featured)}
                  ${this._renderHeroSide(featured.away_team, featured.away_team_url || featured.away_team_icon_url, featured.away_score, featured.away_team_record)}
                </div>
                <div class="score-meta">
                  ${this._escapeHtml(this._heroMeta(featured))}
                </div>
              `
              : `<div class="empty">Keine Spiele fuer die Favoritenmannschaft gefunden.</div>`
          }
        </div>

        <div class="body">
          <details class="accordion accordion-upcoming" ${this._upcomingOpen ? "open" : ""}>
            <summary>
              <div class="accordion-header">
                <span class="accordion-header-left">
                  <span class="accordion-kicker">Ausblick</span>
                  <span class="accordion-title">
                    <span>Kommende Spiele</span>
                    <span class="accordion-count">${this._escapeHtml(String(nextMatches.length))}</span>
                  </span>
                </span>
                <span class="accordion-indicator">v</span>
              </div>
            </summary>
            <div class="accordion-body">
              ${
                nextMatches.length
                  ? `<div class="match-list">${nextMatches
                      .map((match) => this._renderMatchRow(match, "future"))
                      .join("")}</div>`
                  : `<div class="season-note">Keine weiteren Spiele fuer diese Saison vorhanden. Bitte die Saison in der Integration wechseln.</div>`
              }
            </div>
          </details>
        </div>
      </ha-card>
    `;

    this._bindAccordionState();
  }

  _bindAccordionState() {
    if (!this.shadowRoot) {
      return;
    }

    const details = this.shadowRoot.querySelector(".accordion");
    if (!details) {
      return;
    }

    if (this._accordionListeners) {
      for (const [node, listener] of this._accordionListeners) {
        node.removeEventListener("toggle", listener);
      }
    }

    this._accordionListeners = [];

    const bindDetails = (node, setter) => {
      const listener = () => {
        setter.call(this, node.open);
      };
      node.addEventListener("toggle", listener);
      this._accordionListeners.push([node, listener]);
    };

    const pastDetails = this.shadowRoot.querySelector('details.accordion');
    if (pastDetails) {
      bindDetails(pastDetails, function (open) {
        this._pastOpen = open;
      });
    }

    const accordionNodes = this.shadowRoot.querySelectorAll('details.accordion');
    if (accordionNodes.length > 1) {
      const upcomingDetails = accordionNodes[1];
      bindDetails(upcomingDetails, function (open) {
        this._upcomingOpen = open;
      });
    }
  }

  _renderHeroBackground(match) {
    if (!match) {
      return "";
    }

    const homeBackground = match.home_team_url || match.home_team_icon_url;
    const awayBackground = match.away_team_url || match.away_team_icon_url;
    if (!homeBackground && !awayBackground) {
      return "";
    }

    return `
      ${homeBackground ? `<div class="hero-bg hero-bg-left" style="background-image:url('${this._escapeHtml(homeBackground)}')"></div>` : ""}
      ${awayBackground ? `<div class="hero-bg hero-bg-right" style="background-image:url('${this._escapeHtml(awayBackground)}')"></div>` : ""}
    `;
  }

  _renderHeroSide(teamName, logoUrl, score, record) {
    return `
      <div class="side">
        ${logoUrl ? `<img class="team-logo" src="${this._escapeHtml(logoUrl)}" alt="">` : ""}
        <div class="team-name">${this._escapeHtml(teamName || "-")}</div>
        ${record ? `<div class="team-record">${this._escapeHtml(record)}</div>` : ""}
      </div>
    `;
  }

  _renderHeroScore(match) {
    const hasScore = match.home_score !== null && match.away_score !== null;
    const homeScore = hasScore ? match.home_score : "-";
    const awayScore = hasScore ? match.away_score : "-";
    const phase = this._matchPhase(match);
    return `
      <div class="score">
        ${this._renderStatusLine(phase, match)}
        <div class="score-line">
          <span>${this._escapeHtml(String(homeScore))}</span>
          <span>:</span>
          <span>${this._escapeHtml(String(awayScore))}</span>
        </div>
        ${this._heroHalfTime(match) ? `<div class="score-submeta">${this._escapeHtml(this._heroHalfTime(match))}</div>` : ""}
      </div>
    `;
  }

  _renderStatusLine(phase, match) {
    if (phase === "live") {
      return `<div class="status-line live">LIVE</div>`;
    }

    if (phase === "ended") {
      return `<div class="status-line ended">Beendet</div>`;
    }

    if (phase === "upcoming") {
      return `<div class="status-line countdown">${this._escapeHtml(this._countdown(match))}</div>`;
    }

    return "";
  }

  _matchPhase(match) {
    const kickoff = match?.kickoff ? new Date(match.kickoff) : null;
    if (!kickoff || Number.isNaN(kickoff.getTime())) {
      return "unknown";
    }

    const now = this._now || new Date();
    const end = new Date(kickoff.getTime() + 105 * 60 * 1000);
    if (now < kickoff) {
      return "upcoming";
    }
    if (now >= kickoff && now < end) {
      return "live";
    }
    return "ended";
  }

  _countdown(match) {
    const kickoff = match?.kickoff ? new Date(match.kickoff) : null;
    if (!kickoff || Number.isNaN(kickoff.getTime())) {
      return "";
    }

    const diff = kickoff.getTime() - (this._now || new Date()).getTime();
    if (diff <= 0) {
      return "LIVE";
    }

    const totalMinutes = Math.floor(diff / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes}m`;
  }

  _heroHalfTime(match) {
    const home = match.half_time_home_score;
    const away = match.half_time_away_score;
    if (home === null || home === undefined || away === null || away === undefined) {
      return "";
    }
    return `HZ ${home}:${away}`;
  }

  _heroMeta(match) {
    const kickoff = match.kickoff ? new Date(match.kickoff) : null;
    if (!kickoff) {
      return "";
    }

    const date = new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(kickoff);

    return `${match.finished ? "FT" : "Anpfiff"} - ${date}`;
  }

  _renderMatchRow(match, kind) {
    const kickoff = match.kickoff ? new Date(match.kickoff) : null;
    const homeUrl = match.home_team_url || match.home_team_icon_url;
    const awayUrl = match.away_team_url || match.away_team_icon_url;
    const hasScore = match.finished && match.home_score !== null && match.away_score !== null;

    if (kind === "past") {
      return `
        <div class="match-row past">
          <div class="date">
            <strong>${this._escapeHtml(kickoff ? this._shortDate(kickoff) : "-")}</strong>
            <span>${this._escapeHtml(kickoff ? this._shortTime(kickoff) : "")}</span>
          </div>
          <div class="teams">
            <div class="team-line">
              ${homeUrl ? `<img class="team-logo-small" src="${this._escapeHtml(homeUrl)}" alt="">` : ""}
              <span class="team-text">${this._escapeHtml(match.home_team || "-")}</span>
            </div>
            <div class="team-line">
              ${awayUrl ? `<img class="team-logo-small" src="${this._escapeHtml(awayUrl)}" alt="">` : ""}
              <span class="team-text">${this._escapeHtml(match.away_team || "-")}</span>
            </div>
          </div>
          <div class="match-score">
            ${hasScore ? `${this._escapeHtml(String(match.home_score))} : ${this._escapeHtml(String(match.away_score))}` : "vs"}
            ${match.group ? `<span class="match-group">${this._escapeHtml(match.group)}</span>` : ""}
          </div>
        </div>
      `;
    }

    return `
      <div class="match-row ${kind}">
        <div class="date">
          <strong>${this._escapeHtml(kickoff ? this._shortDate(kickoff) : "-")}</strong>
          <span>${this._escapeHtml(kickoff ? this._shortTime(kickoff) : "")}</span>
        </div>
        <div class="teams">
          <div class="team-line">
            ${homeUrl ? `<img class="team-logo-small" src="${this._escapeHtml(homeUrl)}" alt="">` : ""}
            <span class="team-text">${this._escapeHtml(match.home_team || "-")}</span>
          </div>
          <div class="team-line">
            ${awayUrl ? `<img class="team-logo-small" src="${this._escapeHtml(awayUrl)}" alt="">` : ""}
            <span class="team-text">${this._escapeHtml(match.away_team || "-")}</span>
          </div>
        </div>
        <div class="match-meta">
          ${match.group ? `<div>${this._escapeHtml(match.group)}</div>` : ""}
          ${hasScore ? `<div>${this._escapeHtml(String(match.home_score))}:${this._escapeHtml(String(match.away_score))}</div>` : "<div>vs</div>"}
        </div>
      </div>
    `;
  }

  _shortDate(date) {
    return new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  }

  _shortTime(date) {
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  _escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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
          name: "past_limit",
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
          name: "upcoming_limit",
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
      computeLabel: (schema) => {
        switch (schema.name) {
          case "entity":
            return "Sensor";
          case "title":
            return "Titel";
          case "past_limit":
            return "Vergangene Spiele anzeigen";
          case "upcoming_limit":
            return "Kommende Spiele anzeigen";
          default:
            return undefined;
        }
      },
      computeHelper: (schema) => {
        if (schema.name === "entity") {
          return "Wahle den Spielplan-Sensor aus.";
        }
        if (schema.name === "title") {
          return "Wird als Karten-Titel angezeigt.";
        }
        if (schema.name === "past_limit") {
          return "Anzahl bereits gespielter Partien oberhalb des aktuellen Spiels.";
        }
        if (schema.name === "upcoming_limit") {
          return "Anzahl noch ausstehender Partien unterhalb des aktuellen Spiels.";
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
      type: "custom:openligadb-schedule-card",
      title: "Spielplan",
      entity: "sensor.bundesliga_2026_schedule",
      past_limit: 3,
      upcoming_limit: 5,
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
  type: "openligadb-schedule-card",
  name: "OpenLigaDB Schedule Card",
  description: "Shows upcoming OpenLigaDB matches for the favorite team.",
  getEntitySuggestion: (hass, entityId) => {
    const state = hass.states[entityId];
    if (!state || state.attributes?.favorite_matches === undefined) {
      return null;
    }

    return {
      config: {
        type: "custom:openligadb-schedule-card",
        entity: entityId,
        title: state.attributes.competition
          ? `${state.attributes.competition} Spielplan`
          : "Spielplan",
      },
    };
  },
});

customElements.define("openligadb-schedule-card", OpenLigaDBScheduleCard);
