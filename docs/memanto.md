# memanto — Gedächtnis über Sessions hinweg

Stand 12.09.2026. Anlass: Bene will [memanto](https://github.com/moorcheh-ai/memanto) (MIT, 0.2.x)
als Gedächtnis für Claude-Code-Sessions in diesem Repo nutzen — Desktop und mobil, ohne dass
`CLAUDE.local.md` mitreisen muss. Diese Seite ist die Einrichtung in der Reihenfolge, in der sie
funktioniert, plus das, was bewusst **nicht** ins Repo gehört.

## Was memanto tut (und was nicht)

memanto ist ein CLI (`pip install memanto`), das Erinnerungen typisiert speichert (`fact`,
`decision`, `instruction`, `learning`, …), semantisch wiederfindet (`recall`, `answer`) und
Widersprüche zwischen Sessions meldet (`conflicts`). Für Claude Code installiert es drei Dinge:

| Baustein | Datei | Wirkung |
|---|---|---|
| Anweisungsblock | `CLAUDE.md` zwischen `<!-- MEMANTO-MANAGED-SECTION -->` | sagt der Session, wann sie `remember`/`recall` aufruft |
| Skill | `.claude/skills/memanto/SKILL.md` | Syntax, Typen, Konfidenz, Tagging |
| Hooks | `.claude/settings.json`, `.claude/hooks/session_start.py`, `.claude/hooks/notify.py` | `SessionStart` schreibt `MEMORY.md` frisch, `PreCompact` synchronisiert vor dem Zusammenfassen, `PostToolUse` fasst `memanto`-Aufrufe lesbar zusammen |

Das Speichern selbst passiert **nicht** im Repo: Backend ist entweder die Moorcheh-Cloud
(kostenloser Key, ~100 k Operationen) oder On-Prem (Docker + Ollama, 5–10 min Setup). In
Web-Sessions von Claude Code gibt es keinen Docker-Daemon — dort geht nur Cloud.

**Konsequenz für Regel 1 aus `CLAUDE.md`:** Was du `memanto remember` gibst, liegt beim Backend.
Keine Kundeninhalte, keine Klarnamen, keine Schlüssel. Architekturwissen über *unsere* Repos ist
in Ordnung, alles aus `instanzen/` oder `va-data.json` nicht.

## Einrichtung auf dem Rechner (einmalig)

```bash
# 1. CLI — in ein eigenes venv, weil Debian/Ubuntu-Python ein systemeigenes PyJWT hat, das pip
#    nicht ersetzen darf („Cannot uninstall PyJWT … RECORD file not found“)
python3 -m venv ~/.memanto-venv && ~/.memanto-venv/bin/pip install memanto
ln -s ~/.memanto-venv/bin/memanto ~/.local/bin/memanto        # oder: pipx install memanto

# 2. Backend wählen — fragt interaktiv Cloud/On-Prem, legt ~/.memanto/config.yaml und ~/.memanto/.env an
memanto                                                        # Cloud: Key von console.moorcheh.ai/api-keys

# 3. Agent = Namensraum dieses Repos
memanto agent create flow-cockpit --pattern project --description "Team-Cockpit, site/va, Tür, Deploy"

# 4. Claude Code verbinden — schreibt CLAUDE.md-Block, Skill, Hooks, settings.json, settings.local.json
cd <checkout>/flow-cockpit && memanto connect claude-code --project-dir .
```

Der Verbinder schreibt die Hook-Kommandos mit **absoluten Pfaden** deines Checkouts. Damit sie im
Web-Checkout (`/home/user/flow-cockpit`) und auf anderen Rechnern greifen, danach einmal umstellen:

```bash
sed -i "s#\"$PWD/.claude#\"\$CLAUDE_PROJECT_DIR/.claude#g; s#\"$PWD\"#\"\$CLAUDE_PROJECT_DIR\"#g" .claude/settings.json
```

Dann prüfen: `python3 -c "import json;json.load(open('.claude/settings.json'))"` und
`grep -c CLAUDE_PROJECT_DIR .claude/settings.json` (erwartet: 3).

## Was ins Repo geht — und was nicht

`.gitignore` blendet `.claude/*` aus und lässt nur `skills/` durch. Für memanto sind seit
12.09.2026 zusätzlich `.claude/hooks/` und `.claude/settings.json` freigegeben, weil sonst mobile
Sessions ohne Hooks laufen. Bleibt draußen:

- `.claude/settings.local.json` (Berechtigung `Bash(memanto:*)` — pro Rechner)
- `MEMORY.md` im Repo-Root und `okf/` — generiert von `memanto memory sync`, nie committen
- `~/.memanto/` (Key, Backend, Agent) — liegt außerhalb des Repos

Committen wie immer nur Porcelain: `git add CLAUDE.md .claude/settings.json .claude/hooks
.claude/skills/memanto .gitignore`, dann `commit`, `push`.

## Web-Sessions (claude.ai/code) und mobil

Der Container startet jedes Mal frisch. Damit die Hooks dort greifen:

1. In der Umgebung unter claude.ai/code → Environments das Setup-Skript ergänzen:
   `python3 -m venv /opt/memanto && /opt/memanto/bin/pip install -q memanto && ln -sf /opt/memanto/bin/memanto /usr/local/bin/memanto`
2. Dort `MOORCHEH_API_KEY` als Umgebungsvariable setzen (nicht ins Repo, nicht in `.env` committen).
3. Der Agent muss einmal aktiviert sein: `memanto agent activate flow-cockpit` gehört ebenfalls ins
   Setup-Skript, sonst speichert die Session ins Leere.

Fehlt das CLI, laufen die Hooks leer durch — die Session startet trotzdem, nur ohne Gedächtnis.

## Erstbefüllung für unseren Fall

Die Regeln aus `CLAUDE.md` („Nicht verhandelbar“, Tür, Deploy, Prüfen vor dem Melden) einmal als
Prinzipien ablegen, nicht als Chatverlauf. Muster:

```bash
memanto remember "gate.php in flow-cockpit ist eine Kopie; Quelle ist flow-compass/produkt/gate/, publish-cockpit.ps1 zieht sie nach." \
  --type instruction --tags "flow-cockpit,gate-php,flow-compass" --confidence 1.0 --provenance explicit_statement --source user
memanto remember "Zugangsprobleme an den Subdomains liegen fast immer im Website-Repo (anmelden.php, weiter.php), zuerst scripts/tuer-pruefen.sh laufen lassen." \
  --type learning --tags "flow-cockpit,tuer,support" --confidence 0.95 --provenance validated --source user
```

Mehrere auf einmal: JSON-Array mit `content`, `type`, `tags`, `confidence`, `provenance`, `source`
und `memanto remember --batch datei.json`. Danach `memanto memory sync --project-dir .` — die
Session sieht die Einträge ab dem nächsten Start in `MEMORY.md`.

## Alltag

- Sessionstart: `memanto recall --recent --tool claude-code`
- Vor größeren Änderungen: `memanto recall "Tür weiter.php Ticket" --tool claude-code`
- Entscheidung festhalten: `memanto remember "…" --type decision …`
- Widersprüche zwischen Sessions: `memanto conflicts`
- Abend: `memanto daily-summary` (oder `memanto schedule enable`)

## Rückbau

`memanto connect remove claude-code --project-dir .` entfernt Block, Skill, Hooks und
Berechtigung; `memanto agent delete flow-cockpit` löscht den Namensraum (fragt nach Purge).
