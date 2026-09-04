# Zugangsschutz fuer /va/ und /compass/ — HTTP-Basic-Auth (25.08.2026)

> **Seit dem 04.09.2026 abends gilt das nicht mehr fuer va.vishnuartists.com.** Das Team-Cockpit
> haengt an derselben Tuer wie die persoenlichen Subdomains: `site/va/.htaccess` leitet jede
> Anfrage auf `gate.php` (Kopie aus `flow-compass/produkt/gate/`), die Person kommt mit ihrem
> Konto von vishnuartists.com herein (`weiter.php`-Ticket, Tuercookie `vf_gate`, 4 h), und
> `va-app.js` fragt `gate.php?wer=1`, statt ein zweites Mal Name + Team-Passwort zu verlangen.
> Wer darf: `site/va/gate-config.php` (gitignored, legt `publish-cockpit.ps1` an) — Rollen
> `gruender, intern, vertrag, coach, trainer` aus dem CRM. Leser ohne Konto (john-server,
> Datenlauf) schicken den Maschinenschluessel aus derselben Datei im Kopf `X-Vf-Key`
> (User-Umgebungsvariable `VA_GATE_KEY`). Das Team-Passwort in `va-app.js` bleibt nur als
> Rueckfallebene fuer Instanzen ohne Tuer. Der Rest dieser Seite beschreibt den alten Stand
> und gilt weiter fuer `.htpasswd-va` als Rueckweg (`git checkout <commit vor der Tuer> -- site/va/.htaccess`).

## Wenn jemand vor der Tuer steht (04.09.2026 abends, Bene: „bene. laesst mich nicht rein“)

Die Tuer selbst (gate.php auf der Subdomain) entscheidet nichts ueber Anmeldung — sie schickt
zu `vishnuartists.com/weiter.php` und fragt dort per Einmal-Ticket nach, wer da ist. Alles,
was „ich komme nicht rein“ heisst, liegt deshalb im Website-Repo (`f/anmelden.php`,
`f/weiter.php`, `f/passkey.php`) — dort sind am 04.09. abends vier Dinge geradegezogen worden:

| Symptom | Ursache | Seit dem 04.09. abends |
|---|---|---|
| „Der Link ist abgelaufen oder schon benutzt“, obwohl frisch | Der erste **GET** verbrauchte den Einmal-Link — und den macht die Link-Vorschau von Slack/Teams, der Mail-Scanner oder das Vorladen des Browsers, nicht der Mensch | GET zeigt nur „Anmelden als …“ mit Knopf; eingeloest wird erst das **POST** dahinter. Links duerfen wieder ueber Slack gehen |
| „Mit Passkey anmelden“ laeuft ins Leere (Windows Hello findet nichts) | Passkeys vom 03.09. liegen im Geraet nicht als „auffindbar“; der Knopf fragte ohne Benutzernamen | Adresse ins Feld darueber eintragen — dann nennt `passkey.php` die Schluessel dieser Person (`allowCredentials`), und das Geraet bietet auch den alten an |
| Bei Vaikuntha angemeldet, Tuer trotzdem zu | Das Vereins-Token lebt nur im Browser (localStorage); `weiter.php` kennt allein das Cookie `vf_sitz` | `anmelden.php?vaikuntha=1` tauscht das Token gegen eine Vishnu-Sitzung (Knopf im Formular; `vf.js` tut es im Hintergrund, sobald ein Token da ist). Voraussetzung bleibt eine Innenraum-Rolle |
| „Das ist nicht deine Tuer“ fuer die Geschaeftsfuehrung an einer persoenlichen Instanz (`GATE_ROLLEN = gruender`) | `weiter.php` gab nur `person_rolle` zurueck; der CRM-Import kennt fuer das Kern-Team nur `intern`, `gruender` steht im Roster | `weiter.php` antwortet mit `vf_rollen_ermitteln` (CRM **plus** Roster) — dieselbe Antwort wie Backstage, CRM und Portal |

Reihenfolge fuer den Notfall, wenn nichts davon greift: **Adresse + Passwort** (wer eins hat) →
**Anmelde-Link** an die im CRM hinterlegte Adresse, per Knopf einloesen → **Vaikuntha-Konto** →
Einladungslink aus dem CRM durch eine zweite Person mit Rolle `gruender`/`intern`
(`anmelden.php?einladen=<person_id>`). Mail-Zustellung ist der eine Punkt, den der Code nicht
heilen kann — deshalb stehen die drei anderen Wege daneben.

## Warum

`site/va/va-data.json` enthaelt echte Jira-Daten mit Klarnamen. Der Passwort-Check in
`va-app.js` (`VA_PW_HASH`) laeuft nur im Browser — die Datei selbst war bis zum 25.08.
mit HTTP 200 oeffentlich abrufbar. Seit diesem Datum liegt `site/va/.htaccess` im Repo
und schuetzt den **gesamten** Ordner `/va/` per HTTP-Basic-Auth. Der Client-Login bleibt
bestehen, ist aber nur noch die zweite Schicht. `site/robots.txt` (live seit 24.08.)
sperrt `/va/` zusaetzlich fuer Suchmaschinen — als Bitte, nicht als Schutz.

## /compass/ haengt an derselben Datei (VA-13560, 31.08.2026)

Der Ordner `/compass/` — die produktive persoenliche Compass-Instanz — hatte diesen
Schutz zunaechst nicht: `index.html`, `dashboard-data.js`, `rhythmus-data.js` und
`kennzahlen-data.js` lieferten HTTP 200 ohne Anmeldung, mit echten personenbezogenen
Inhalten. Seit dem 31.08. liegt `site/compass/.htaccess` mit demselben Auth-Block im
Repo. Bewusst **dieselbe** `AuthUserFile` und **derselbe** `AuthName` wie bei `/va/`:
gleicher Origin plus gleicher Realm heisst, der Browser schickt die einmal eingegebenen
Zugangsdaten von selbst weiter — ein Login fuer beide, und der Compass laeuft weiter als
iframe im Cockpit (`vaApp.compass.oeffnen`), ohne ein zweites Mal nachzufragen.
Rotation und Ablage aendern sich dadurch nicht; es gibt weiterhin nur die eine Datei.

`/compass-demo/` bleibt oeffentlich — die Demo ist so gewollt.

## Wo das Secret hin muss

Die Passwortdatei gehoert **nicht ins Repo** und **nicht nach `site/va/`**
(`update-va-data.yml` spiegelt den Ordner stuendlich ohne Ausschluesse). Sie liegt im
Webspace-Root des KAS-Kontos w01e7219, eine Ebene ueber dem Domain-Ordner:

    /www/htdocs/w01e7219/.htpasswd-va

Diesen Pfad erwartet `AuthUserFile` in `site/va/.htaccess`. Der Webspace-Root ist
zugleich der Docroot von naturnah-lernen.de — Apache liefert Dateien, die mit `.ht`
beginnen, aber grundsaetzlich nicht aus (Standard-`<FilesMatch "^\.ht">`-Sperre;
nach dem Anlegen mit `curl -I https://naturnah-lernen.de/.htpasswd-va` gegenpruefen,
erwartet wird 403).

## Einrichten — seit 27.08.2026 über den Deploy-Workflow

Das All-Inkl-WebFTP kann keine Punkt-Dateien anlegen oder dahin umbenennen („Es ist ein
Fehler aufgetreten"). Deshalb legt jetzt `deploy.yml` die Datei per FTPS-curl an: Der
Inhalt (die eine `va:{SHA}…`-Zeile) steht im **GitHub-Repo-Secret `VA_HTPASSWD`**; jeder
Deploy-Lauf schreibt ihn nach `/www/htdocs/w01e7219/vishnu-artists.com/.htpasswd-va`.
**Warum der Domain-Ordner statt des Webspace-Roots:** der Deploy-FTP-User darf im Root
nicht schreiben (curl exit 25, STOR denied — Lauf #186 am 27.08.2026); im Domain-Ordner
schuetzt Apaches eingebaute `FilesMatch ^\.ht`-Sperre die Datei vor Abruf (verifiziert:
403). **Rotation = Secret ändern + Workflow laufen lassen** (Push oder „Run workflow").
Ohne Secret wird der Schritt übersprungen. Eingerichtet + verifiziert am 27.08.2026
(401 ohne Login, 200 mit, 403 auf die Datei).

## Einrichten von Hand (Alt-Weg, ca. 10 Minuten — nur falls der Workflow nicht kann)

1. **Hash erzeugen** (lokal in PowerShell, Passwort frei waehlen — nicht das alte
   Team-Passwort, dessen Hash stand oeffentlich in der Demo und gilt als kompromittiert):

       $pw = 'NEUES-PASSWORT'
       $sha = [Convert]::ToBase64String([Security.Cryptography.SHA1]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($pw)))
       "va:{SHA}$sha"

   Die Ausgabezeile (Format `va:{SHA}…=`) ist der Inhalt der Datei — Vorlage:
   `docs/va.htpasswd.example`.
2. **Datei hochladen:** per KAS-WebFTP oder FTP-Programm als
   `/www/htdocs/w01e7219/.htpasswd-va` ablegen (UTF-8/ASCII, eine Zeile, LF).
   **Nicht** den KAS-Verzeichnisschutz auf `/va/` anwenden — der schreibt eine eigene
   `.htaccess` in den Ordner, die der naechste stuendliche Deploy ueberschreibt.
3. **Passwort ans Team** geben (nicht per Mail im Klartext neben dem Link).

## Verhalten, solange die .htpasswd noch fehlt

- Abruf **ohne** Zugangsdaten → **401** (Apache stellt die Challenge, ohne die Datei zu
  lesen). Das Datenleck ist also schon mit der .htaccess allein geschlossen.
- Abruf **mit** Zugangsdaten → **500** (Apache findet die Datei nicht). Erst mit der
  .htpasswd wird aus dem 500 ein 200.

## Pruefen

    curl -s -o /dev/null -w "%{http_code}" https://vishnu-artists.de/va/va-data.json          # 401
    curl -s -o /dev/null -w "%{http_code}" -u va:PASSWORT https://vishnu-artists.de/va/va-data.json  # 200
    curl -s -o /dev/null -w "%{http_code}" https://vishnu-artists.de/va/                      # 401

## Rotation

Passwort wechseln = Hash neu erzeugen (Abschnitt „von Hand", Schritt 1) → Repo-Secret
`VA_HTPASSWD` aktualisieren → Deploy laufen lassen. Die .htaccess bleibt unveraendert.
Mehrere Zugaenge = mehrere Zeilen im Secret (Zeilenumbrueche sind im Secret erlaubt).
