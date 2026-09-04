#!/usr/bin/env bash
# Tür der Produkt-Subdomains von außen prüfen (04.09.2026 abends, Anlass: „bene. lässt mich nicht rein“).
# Ohne Konto messbar: leitet die Tür richtig weiter, läuft die Server-zu-Server-Prüfung, antwortet weiter.php?
#   bash scripts/tuer-pruefen.sh            # alle bekannten Subdomains
#   bash scripts/tuer-pruefen.sh bene jan   # nur diese
set -u
SUBS=("$@"); [ ${#SUBS[@]} -eq 0 ] && SUBS=(va bene jan philipp marwan florian)
NULL=$(printf '0%.0s' {1..32})
zeile() { printf '  %-42s %s\n' "$1" "$2"; }
echo "weiter.php (Ticketstelle):"
zeile "tun=pruefen mit ungültigem Ticket" "$(curl -sS -m 20 "https://vishnuartists.com/weiter.php?tun=pruefen&t=$NULL" || echo FEHLER)"
zeile "anmelden.php?ziel=weiter" "$(curl -sS -m 20 -o /dev/null -w '%{http_code}' https://vishnuartists.com/anmelden.php?ziel=weiter || echo FEHLER)"
for s in "${SUBS[@]}"; do
  h="$s.vishnuartists.com"
  if ! getent hosts "$h" >/dev/null 2>&1; then echo "$h: kein DNS"; continue; fi
  echo "$h:"
  zeile "GET /            (soll 302 → weiter.php)" "$(curl -sS -m 20 -o /dev/null -w '%{http_code} %{redirect_url}' "https://$h/" || echo FEHLER)"
  zeile "GET /?vf_t=…     (302 = Prüfung lief, 503 = Prüfung scheitert)" "$(curl -sS -m 25 -o /dev/null -w '%{http_code} %{redirect_url}' "https://$h/?vf_t=$NULL" || echo FEHLER)"
  zeile "GET /gate.php?wer=1 (soll {\"ok\":false})" "$(curl -sS -m 20 "https://$h/gate.php?wer=1" || echo FEHLER)"
done
