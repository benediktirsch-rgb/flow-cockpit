# Flow Cockpit — Regeln für Sessions in diesem Repo

Dieses Repo ist der **Produktanteil des Team-Cockpits** (Kanban-Analytics, Flight Level 1–3) und
die Vishnu-Instanz `site/va/` (va.vishnuartists.com). Persönliche Arbeitsnotizen des Betreibers
liegen in `CLAUDE.local.md` (nicht im Repo) — was hier steht, muss für **jede** Session reichen,
auch mobil ohne den Desktop-Checkout. Details: `README.md`, `docs/`.

## Die drei Repos, eine Kette
| Repo | Inhalt | Live |
|---|---|---|
| `flow-cockpit` (dieses) | Team-Cockpit, `site/va/` mit `gate.php` (Kopie aus flow-compass), Datenlauf aus Jira | va.vishnuartists.com, demo.vishnuartists.com/cockpit |
| `flow-compass` | persönlicher Compass (FL 1), **Quelle** der Tür `produkt/gate/gate.php`, `publish-compass.ps1` | `<vorname>.vishnuartists.com`, demo.vishnuartists.com |
| `vishnuartists-website-redesign` | Website + Backend: **Anmeldung** `f/anmelden.php`, Ticketstelle `f/weiter.php`, Passkeys, CRM | vishnuartists.com |

Alle unter github.com/benediktirsch-rgb. Die Cockpit-**Quelle** (`cockpit.html`, `pb-*.js`) lebt im
Kundenrepo `../cs-carsales-flow-cockpit` (nicht hier); `build-starter.ps1` und `build-va.ps1`
anonymisieren daraus `site/` — beides nur auf Benes Rechner (PowerShell).

## Zugang — wie die Tür funktioniert (seit 04.09.2026 abends)
`site/va/.htaccess` leitet jede Anfrage auf `gate.php`. Die Tür entscheidet **nichts** über
Anmeldung: sie schickt zu `vishnuartists.com/weiter.php?zu=…`, bekommt ein Einmal-Ticket (`?vf_t=`,
90 s), löst es Server-zu-Server ein (`weiter.php?tun=pruefen`) und setzt `vf_gate` (HMAC, 4 h).
Wer darf, steht in `site/va/gate-config.php` (gitignored; `GATE_MAIL`, `GATE_ROLLEN`, `GATE_KEY`).
`va-app.js` fragt `gate.php?wer=1` und sucht den Jira-Namen zum Vornamen — das alte Team-Passwort
(`VA_PW_HASH`) ist nur noch Rückfallebene für Instanzen ohne Tür.

„Ich komme nicht rein“ liegt fast immer im Website-Repo (Anmeldung), nicht hier. Symptomtabelle und
Notfall-Reihenfolge: `docs/va-zugangsschutz.md` › „Wenn jemand vor der Tür steht“. Der Einstieg
nach dem Login heißt **Helikopter** (`vishnuartists.com/helikopter.php` → eigene Subdomain).

Schnellprüfung von überall:
```
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://va.vishnuartists.com/          # 302 → weiter.php
curl -s -o /dev/null -w "%{http_code}\n" "https://va.vishnuartists.com/?vf_t=$(printf '0%.0s' {1..32})"  # 302 = Prüfung läuft, 503 = weiter.php unerreichbar
curl -s https://va.vishnuartists.com/gate.php?wer=1                                                 # {"ok":false} ohne Cookie
```

## Deploy
`git push origin main` → `.github/workflows/deploy.yml`: `site/` (ohne `va/`) nach
demo.vishnuartists.com/cockpit, `site/va/` nach va.vishnuartists.com (ohne `va-data.json`).
`update-va-data.yml` holt stündlich Jira-Daten. Zweiter Weg vom Rechner: `publish-cockpit.ps1`.
Secrets: `FTP_*`, `JIRA_EMAIL`, `JIRA_TOKEN`, `VA_HTPASSWD` (Altweg). **Nie eine `site/.htaccess`
ins Repo** — die im Domain-Root pflegt Bene im KAS.

## Nicht verhandelbar
1. **Keine Kundeninhalte, keine Klarnamen-Daten** im Repo: `va-data.json`, `instanzen/`,
   `gate-config.php`, `gate-secret.php` sind gitignored und bleiben es.
2. **Git nur Porcelain**: `pull --ff-only` → `add <datei>` → `commit` → `push`, kein `add -A`,
   kein Force-Push. Einmalig je Klon: `git config core.autocrlf false && git config core.hooksPath .githooks`
   (Hook blockt Löschungen, generierte Daten, CRLF/BOM). Hintergrund: `docs/git-workflow.md`.
3. **Encoding** UTF-8 ohne BOM, LF; `.ps1` mit BOM. Deutsche Anführungszeichen „…“, Du-Form,
   Kommentare mit Datum und Anlass („warum“, nicht „was“).
4. **gate.php hier nicht eigenständig ändern** — Quelle ist `flow-compass/produkt/gate/`,
   `publish-cockpit.ps1` zieht sie nach. Änderungen dort machen, dann hier übernehmen.

## Prüfen vor dem Melden
`node -e "new Function(require('fs').readFileSync('site/va/va-app.js','utf8'))"` für JS,
`php -l site/va/gate.php` für die Tür, Live-Endpunkte mit curl wie oben.
