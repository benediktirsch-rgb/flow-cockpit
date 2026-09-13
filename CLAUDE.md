# Flow Cockpit — Regeln für Sessions in diesem Repo

Dieses Repo ist der **Produktanteil des Team-Cockpits** (Kanban-Analytics, Flight Level 1–3) und
die Vishnu-Instanz `site/va/` (va.vishnuartists.com). Persönliche Arbeitsnotizen des Betreibers
liegen in `CLAUDE.local.md` (nicht im Repo) — was hier steht, muss für **jede** Session reichen,
auch mobil ohne den Desktop-Checkout. Details: `README.md`, `docs/`.

<!-- MEMANTO-MANAGED-SECTION -->
<!-- memanto-template-version: 1.0.0 -->
## MEMANTO - Your Active Memory Companion

> **CRITICAL DIRECTIVE**: You are an agent equipped with Memanto. Without it, you are amnesiac. You have zero memory between chat sessions. Your ability to learn and adapt depends ENTIRELY on you actively writing to Memanto.

Every memory operation in this session goes through MEMANTO. There is no exception. All memanto commands are **shell commands**. Always run them using the Bash tool. Never simulate, describe, or "pretend to call" them.
> **Note**: The `memanto-memory` skill contains reference guidelines only (best practices, confidence levels, tagging). It is NOT executable — always use Bash for memanto commands.

### 1. ENVIRONMENT-AWARE EXECUTION PROTOCOL
Before you write any code or provide a final answer, you MUST evaluate if the current context contains new memory triggers.

You must actively evaluate:
1. PREFERENCE: Did the user state a [USER PREFERENCE / RULE]? (e.g., code formatting style, choice of library, or tool preference)
2. GOAL: Did we establish or reach a [GOAL / MILESTONE]? (e.g., target feature completion, roadmap deliverable, or sprint objective)
3. FAILURE: Did we learn a [CORRECTION / FAILURE LESSON] from an error, tool, or test? (e.g., a bug fix workaround, error post-mortem, or test failure insight)
4. SYSTEM: Did we uncover a [DOMAIN INVARIANT / SYSTEM QUIRK]? (e.g., a technical constraint, API quirk, or dependency behavior)
5. ENVIRONMENT: Was a key [ENVIRONMENT FACT] verified? (e.g., OS behavior, path layout, or tool version requirement)

**How to Execute the Evaluation:**
- **If you are operating in Native CLI & Integrated IDE Environments (Claude Code, Cursor, Windsurf, Gemini CLI, Cline, Roo, Continue, OpenCode, Codex, Aider, or Anthropic Web UI):**
  You MUST perform this evaluation inside a `<thinking>` block at the very start of your turn.
- **If you are operating in VS Code Agent Environments (VS Code Copilot or VS Code Extension Agent Mode):**
  [CRITICAL SEQUENCE]: You MUST execute the following three steps in exact order ONCE at the very beginning of your turn (immediately after the user's prompt). Do NOT repeat this check before subsequent tool calls in the same turn.
  - **Step 1:** You MUST invoke the terminal tool with the dummy command `echo "memory check"`. You will use this tool call's `explanation` parameter to silently write out your step-by-step evaluation WRAPPED inside a `<thinking>` XML tag.
  - **Step 2:** If your evaluation in Step 1 found a matching trigger, your next immediate tool call MUST be `memanto remember`.
  - **Step 3:** Only AFTER Step 1 (and Step 2 if applicable) are complete, you may proceed to execute productive tools or output normal chat text.
### 2. THE ABSTRACTION RULE (HOW TO THINK ABOUT MEMORY)
Users speak naturally and implicitly. When you store a memory, **ELEVATE IT TO A PRINCIPLE**.
- **WRONG (Activity Log)**: "User told me to use functional components."
- **RIGHT (Universal Principle)**: "Exclusively use functional components for React UI."
Do not record the conversation. Record the universal rule.

### 3. THE DURABILITY TEST (WHAT NOT TO STORE)
Before storing, ask yourself: *"Will this generalized principle fundamentally change how I generate code for this user 3 months from now?"*
- **DO NOT STORE**: Step-by-step progress, routine bug fixes, UI tweaks, temporary code snippets, or literal chat summaries.

### 4. RECALL TRIGGER MATRIX (WHEN TO SEARCH MEMORY)
Do not guess or write code blindly. Run `memanto recall` (or `memanto answer`) using the Bash tool before acting if any of the following occur. Always pass `--tool claude-code` on these reads: they carry no `--source`, and that flag is how Memanto identifies you as the calling agent.
- **[TASK INITIATION]** Before starting a complex feature, refactor, or multi-file architecture task, search for relevant stack constraints, rules, and prior decisions.
- **[AMBIGUOUS REPAIR / ERROR]** When facing a cryptic build failure, test failure, or environment bug, search memory for past workarounds and error post-mortems.
- **[UNSTATED PREFERENCE]** When about to choose a library, pattern, or naming convention that isn't specified in the prompt, search memory to see if a preference was established in an earlier session.
- **[EXPLICIT USER QUESTION]** When the user asks "What did we decide about X?", "Check memory", or "Recall context", run `memanto recall` (or `memanto answer`) immediately.
- **[FRESH SESSION / CONTEXT REFRESH]** At session start or after switching tasks, run `memanto recall --recent --tool claude-code` to retrieve active task state and recent commitments.

### 5. HOW TO EXECUTE
For all command syntax, required flags, memory types, tagging best practices, and CLI options, refer to the `memanto-memory` SKILL.md. You MUST read this skill before running any memory operations if you do not know the exact command schema.

<!-- /MEMANTO-MANAGED-SECTION -->

<!-- MEMANTO-DYNAMIC-MEMORIES -->
<!-- /MEMANTO-DYNAMIC-MEMORIES -->

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

## Gedächtnis über Sessions (memanto, seit 12.09.2026)
Was eine Session über dieses Repo lernt (Entscheidungen, Workarounds, Regeln), gehört nicht in den
Chat, sondern per `memanto remember` in den Agent `flow-cockpit`; vor größeren Änderungen
`memanto recall … --tool claude-code`. Einrichtung, Hooks und die Grenze zu Regel 1 (nichts aus
`instanzen/` oder `va-data.json` ins Backend): `docs/memanto.md`. Fehlt das CLI, arbeitet die
Session ohne Gedächtnis weiter — dann steht die Einrichtung dort an erster Stelle.
