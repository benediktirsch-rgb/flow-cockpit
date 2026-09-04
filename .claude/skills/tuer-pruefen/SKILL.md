---
name: tuer-pruefen
description: Prüft die Tür der Produkt-Subdomains (va., bene., jan.…) von außen — gate.php → weiter.php → anmelden.php — und ordnet „ich komme nicht rein“ der richtigen Stelle zu. Nutzen, wenn jemand vor einer Subdomain steht, ein Ticket nicht greift, oder nach einem Deploy der Tür.
---

# Tür prüfen (Zugang zu va./bene./… .vishnuartists.com)

Die Tür entscheidet nichts über Anmeldung. Sie leitet zu `vishnuartists.com/weiter.php`, holt ein
Einmal-Ticket und löst es Server-zu-Server ein. „Ich komme nicht rein“ liegt deshalb fast immer im
Website-Repo `vishnuartists-website-redesign` (`f/anmelden.php`, `f/weiter.php`, `f/passkey.php`).

## 1. Von außen messen (ohne Konto möglich)
```
bash scripts/tuer-pruefen.sh              # alle Subdomains
bash scripts/tuer-pruefen.sh bene         # eine
```
Erwartet je Subdomain:
| Prüfung | Soll | Wenn nicht |
|---|---|---|
| `GET /` | `302` → `weiter.php?zu=…` | `401` = alte Basic-Auth-.htaccess liegt noch; `500` = gate.php fehlt oder PHP-Fehler |
| `GET /?vf_t=<32 Nullen>` | `302` → `weiter.php` (Ticket ungültig, Prüfung lief) | `503 „Anmeldung nicht erreichbar“` = `file_get_contents` zu weiter.php scheitert; `503 „Tür noch nicht eingerichtet“` = `gate-secret.php`/`gate-config.php` fehlt → `publish-compass.ps1`/`publish-cockpit.ps1` |
| `GET /gate.php?wer=1` | `{"ok":false}` | anderes = gate.php nicht die Fassung aus flow-compass |
| `weiter.php?tun=pruefen&t=<32 Nullen>` | `{"ok":false,"grund":"ticket"}` | HTML/500 = Website-Backend kaputt, DB weg |

## 2. Symptom der Person zuordnen
Tabelle in `docs/va-zugangsschutz.md` › „Wenn jemand vor der Tür steht“. Kurzfassung:
- **Link „abgelaufen“** → Link wurde per Vorschau (Slack, Mail-Scanner) verbraucht; seit 04.09. abends
  löst erst der Klick „Jetzt anmelden“ ein. Ist das noch nicht live, PR im Website-Repo mergen.
- **Passkey findet nichts** → Adresse ins Feld eintragen, dann fragt der Knopf gezielt nach.
- **Vaikuntha angemeldet, Tür zu** → „Mit Vaikuntha anmelden“ auf anmelden.php (tauscht in Sitzung).
- **„Das ist nicht deine Tür“** → `gate-config.php` (GATE_MAIL/GATE_ROLLEN) auf der Subdomain gegen
  die Rollen aus dem CRM+Roster halten; weiter.php liefert seit 04.09. abends beide.

## 3. Was du hier NICHT tust
`site/va/gate.php` eigenständig ändern (Quelle: `flow-compass/produkt/gate/`), `.htaccess` im
Domain-Root anfassen, Zugangsdaten oder `gate-config.php` committen.
