# Flow Cockpit

Kanban-Analytics-Cockpit für Teams (Flight Level 1–3): Flow-Kennzahlen, Team-Boards, Programm-Board,
Meeting-Masken je Flight Level. Verkauft wird eine **eingerichtete Instanz inkl. Coaching**, keine
Lizenz — Preise und Ablauf stehen im Compass-Repo unter `docs/compass-onboarding.md`.

Dieses Repo enthält den **Produktanteil** des Cockpits:

| Pfad | Inhalt |
|---|---|
| `build-starter.ps1` (+ `-part2`, `-part3`) | baut `site/flow-cockpit-starter.html` (kostenlose Starter-Demo) und `site/flow-cockpit-hilfe.html` aus der Cockpit-Quelle |
| `build-va.ps1` | baut daraus die Vishnu-Instanz `site/va/index.html` (Team-Login, Startansicht, FL2/FL3-Tab) |
| `site/va/` | Vishnu-Instanz: `va-app.js`, `va-fl.js`, VA-Fork von `pb-ui.js`, `.htaccess` (Zugangsschutz). `va-data.json` ist generiert und nicht im Repo |
| `scripts/fetch-va-data.mjs` | zieht die Board-Daten aus Jira (läuft stündlich im Workflow `update-va-data.yml`) |
| `docs/` | Zugangsschutz (`va-zugangsschutz.md`), Git-Regeln (`git-workflow.md`) |
| `instanzen/` | Kundeninstanzen — gitignored |

## Build-Quelle

Die Cockpit-Quelle (`cockpit.html`, `hilfe.html`, `pb-*.js`) lebt im Schwester-Checkout
`../cs-carsales-flow-cockpit` (Kundenrepo, nicht Teil dieses Repos). `build-starter.ps1` liest sie
von dort, anonymisiert sie und bricht ab, wenn ein Anker fehlt oder Kundeninhalte in einer
Ausgabedatei stehen bleiben. Reihenfolge:

```
powershell -NoProfile -ExecutionPolicy Bypass -File build-starter.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File build-va.ps1
```

Erst bauen, wenn die Quelle committet und ≥ 15 Minuten ruhig ist.

## Deploy

`git push origin main` → `.github/workflows/deploy.yml` spielt `site/` in den Domain-Root von
vishnu-artists.de und `site/va/` nach `/va/` (FTPS, je eigener Sync-State). Der Workflow
`update-va-data.yml` holt stündlich die Jira-Daten und lädt `va-data.json` hoch.

Secrets im Repo: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` (KAS), `JIRA_EMAIL`, `JIRA_TOKEN`,
`VA_HTPASSWD` (Zugangsdatei für `/va/`, siehe `docs/va-zugangsschutz.md`).

Live: https://vishnu-artists.de/flow-cockpit-starter.html (Demo) · https://vishnu-artists.de/va/
(Vishnu-Instanz, Zugangsschutz).

## Lokal ansehen

`site/` mit einem statischen Server ausliefern (z. B. `serve.ps1 -Root site -Port 18779`) —
`site/va/` braucht zusätzlich eine `va-data.json` (Workflow einmal von Hand starten oder das
Skript lokal mit `JIRA_EMAIL`/`JIRA_TOKEN` laufen lassen).

## Git-Regeln

Nur Porcelain (`pull --ff-only` → `add <datei>` → `commit` → `push`), kein `add -A`, keine
generierten Daten committen. Einmalig je Klon:

```
git config core.autocrlf false && git config core.hooksPath .githooks
```

Der Hook `.githooks/pre-commit` stoppt ungewollte Löschungen, generierte Daten und CRLF/BOM.
Hintergrund: [docs/git-workflow.md](docs/git-workflow.md).

Schwester-Repo: **flow-compass** (persönliches Cockpit, Flight Level 1). Beide verlinken sich
gegenseitig — das Cockpit nimmt `?compass=<URL>`, der Compass `?cockpit=<URL>`.
