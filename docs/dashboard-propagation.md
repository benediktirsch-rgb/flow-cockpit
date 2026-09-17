# Gemeinsames Dashboard und Vishnu

Am 17.09.2026 wurden die visuellen Analysen und die Arbeitsplatz-Bausteine aus dem
Porsche-Cockpit übernommen (Quellcommit `68e0aa0233d7d7494eec7b68fd3f6e129a17b35b`).
`product/dashboard/` ist die gemeinsame, kundenbereinigte Produktquelle im
`flow-cockpit`-Repository. `build-dashboard.mjs` erzeugt daraus `site/va/`;
`build-va.ps1` ruft diesen Schritt automatisch nach dem bisherigen Build auf.
Änderungen an den neuen Seiten immer in der Produktquelle vornehmen.

Der Ursprungseinstieg führt zum Coach-Arbeitsplatz. Explizite `go`-, `compass`-,
Hash- und eingebettete Aufrufe behalten die vorhandenen FL2/FL3-Ansichten.
`index.html?legacy=1` öffnet das bisherige Cockpit.

## Daten und Rechte

- Die Tür `gate.php` bleibt die Zugriffsinstanz; sie wird nicht geändert.
- Nach erfolgreichem `gate.php?wer=1` erhalten Vishnu-Mitglieder die vollständige
  Coach-Darstellung. Das ist eine Anzeigeentscheidung, keine neue Berechtigung.
- Quelle ist das bestehende Kanban-Board **38**, nicht Sprintboard 73.
- `va-data.json` bleibt beim vorhandenen Datenlauf und wird nicht mit Code ausgerollt.
- Der Adapter liest Resolution aus Index 12 und Titel aus Index 13. Index 11 ist
  der Strategie-Link-Indikator. Er normalisiert nur im Arbeitsspeicher.
- Nur `Done` ist als erfolgreiche Resolution im bestätigten Import dokumentiert.
  Abgebrochene, doppelte und unbekannte Abschlüsse zählen nicht als Lieferung.
- Persönliche Zahlen benötigen eine eindeutige vollständige Namensübereinstimmung.
- Alle elf Diagramme sind offen. KMM bleibt Selbstbild und Lernkontext, kein aus
  Kennzahlen oder Punkten abgeleiteter Reifegrad.
- Der vorhandene lokale Mentor Ziff bleibt nutzbar. Die Diagramme haben eigene
  Einführungen, Meeting- und Rhythmushinweise und führen zu Praxis und Experimenten.
  Es wurde kein neuer externer KI-Dienst angebunden.

## Prüfung

`node --test tests/*.test.cjs tests/*.test.mjs`

Die Regressionen prüfen Diagramm-Mathematik, Historie, Monte-Carlo-Quantile,
Reifekontext, VA-Datenformat, nicht erfolgreiche Abschlüsse und Projektgrenzen.
Browserprüfung gegen 725 tatsächliche importierte Tickets: elf Diagramme,
eingeklappte Ticketliste, Arbeitsplatz, Kanban und Praxisbibliothek; keine
JavaScript-Fehler oder fehlenden Dateien. Der Login war dabei lokal simuliert;
der tatsächliche Server-Zugang wird zusätzlich bei der Veröffentlichung geprüft.
