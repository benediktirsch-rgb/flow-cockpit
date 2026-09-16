/* pb-flowwissen.js — Flow-Wissen für den Assistenten und die Cockpit-Kacheln (seit 16.09.2026).
   Marken- und personenfrei: die Starter- und VA-Builds im Schwester-Repo kopieren sie
   unverändert (Neutralitätsprüfung in build-starter-part3.ps1 — hier keine Namen eintragen).

   Herkunft: 125 Fachmails eines Kanban-Analytics-Newsletters (07/2024–09/2026), nach Themen
   geclustert und in eigenen Worten zusammengefasst — keine Zitate, keine Kundennamen.
   Werbung, Konto-Mails und Dubletten sind raus.

   Drei Einsatzorte:
   1. match(text)      — Fallback im Chat, wenn die eigene Wissensbasis nichts findet oder die KI
                         nicht erreichbar ist. Liefert ein Objekt im KB-Format {a,q,c}.
   2. forChart(id,s)   — der Impuls zur Kachel, abhängig von Ampel s (red/yellow/green/grey).
                         Wechselt täglich, damit dieselbe Karte nicht immer dasselbe sagt.
   3. situation(AS)    — der Impuls zur schlechtesten Kachel (für „Impuls"/„Tipp" im Chat und
                         als Kontext für die KI).
   Neue Einträge ans Ende eines Clusters; die Reihenfolge der Cluster ist die Match-Priorität. */
(function(){
  'use strict';
  const T=(de,en)=>({de,en});

  const CLUSTER=[
    {id:'einstieg', name:T('Einstieg: Flow messen','Getting started: measuring flow'),
     k:['wo anfangen metrik','welche metrik','flow messen','kennzahlen anfangen','measure flow','which metric','getting started metrics','flow metrics','flussmetrik','flow-metrik'],
     items:[
      {t:T('Mit einer Zahl anfangen','Start with one number'),
       a:T('Wer mit Flow-Metriken beginnt, ertrinkt schnell: Durchlaufzeit, Lead Time, Durchsatz, Flow Efficiency, CFD, Termintreue … Fangt mit <b>einer</b> an — der Durchlaufzeit je Ticket — und lernt, sie im Team zu lesen. Die anderen erschließen sich daraus.',
           'Starting with flow metrics is overwhelming: cycle time, lead time, throughput, flow efficiency, CFD, due-date performance … Start with <b>one</b> — cycle time per item — and learn to read it as a team. The others follow from there.'),
       q:T('Welche eine Zahl würdet ihr ab morgen in jedem Standup anschauen?','Which single number would you look at in every standup from tomorrow?')},
      {t:T('Machen schlägt Studieren','Doing beats studying'),
       a:T('„Erst noch mehr lesen" ist eine bequeme Falle. Zehn Minuten, eine Handlung: eine Policy aufschreiben, ein Limit setzen, ein altes Ticket anschauen. Man lernt Flow wie Radfahren — auf dem Rad.',
           '"Read a bit more first" is a comfortable trap. Ten minutes, one action: write down a policy, set a limit, look at an old item. You learn flow like riding a bike — on the bike.'),
       q:T('Was ist die kleinste Änderung, die ihr diese Woche wirklich ausprobiert?','What is the smallest change you will actually try this week?')},
      {t:T('Rechenregeln entscheiden über die Wahrheit','Calculation rules decide the truth'),
       a:T('Ein Sprachmodell an Jira zu hängen geht in Tagen. Ob die Antworten stimmen, entscheiden die Regeln dahinter: Welcher Status zählt als gestartet? Ist ein wiedereröffnetes Ticket eins oder zwei? Zählt Wartezeit mit? Durchschnitt oder Perzentil? Prüft das einmal bewusst an eurer Datenquelle.',
           'Wiring a language model to Jira takes days. Whether its answers are right depends on the rules behind them: which status counts as started? Is a reopened item one or two? Does waiting time count? Average or percentile? Check that once, deliberately, against your data source.'),
       q:T('Wisst ihr, ab welchem Status eure Durchlaufzeit zu zählen beginnt?','Do you know at which status your cycle time starts counting?')}
     ]},

    {id:'durchlaufzeit', name:T('Durchlaufzeit & Perzentile','Cycle time & percentiles'),
     k:['perzentil','percentile','p85','p95','85 %','85%','durchschnitt','average','cycle time','zykluszeit','lead time vs','benchmark','branchenschnitt','industry standard','wie schnell sind wir'],
     items:[
      {t:T('Perzentil statt Durchschnitt','Percentile, not average'),
       a:T('Durchlaufzeiten sind schief verteilt — der Durchschnitt verspricht oft nur eine Trefferquote um 20 bis 50 %. Das 85. Perzentil sagt: „85 von 100 Tickets waren nach X Tagen fertig." Das ist eine Zusage, die man halten kann.',
           'Cycle times are skewed — an average often only gives you a 20 to 50% hit rate. The 85th percentile says: "85 of 100 items were done within X days." That is a commitment you can keep.'),
       q:T('Welche Zahl nennt ihr heute, wenn jemand fragt „wie lange dauert so etwas"?','Which number do you give today when someone asks "how long does something like this take"?')},
      {t:T('Es gibt keinen Branchen-Benchmark','There is no industry benchmark'),
       a:T('„Wie stehen wir im Branchenvergleich?" — für die Durchlaufzeit gibt es keinen sinnvollen Vergleichswert: Schnitt, Startpunkt und Arbeit sind überall anders. Bringt stattdessen zwei eigene Zahlen mit: euer Perzentil und wie stabil es über die Zeit ist.',
           '"How do we compare to the industry?" — for cycle time there is no meaningful reference: slicing, start point and work differ everywhere. Bring two numbers of your own instead: your percentile and how stable it is over time.'),
       q:T('Wie hat sich euer 85-%-Wert in den letzten drei Monaten bewegt?','How did your 85% value move over the last three months?')},
      {t:T('Lead Time ≠ Cycle Time','Lead time ≠ cycle time'),
       a:T('Lead Time misst ab Anfrage, Cycle Time ab Start der Arbeit. Die Lücke dazwischen ist Wartezeit vor dem Commitment — genau dort entstehen vorschnelle Zusagen. Trennt beide Zahlen, sonst diskutiert ihr aneinander vorbei.',
           'Lead time counts from the request, cycle time from the start of work. The gap is waiting before commitment — exactly where rushed promises happen. Keep both numbers apart or you will talk past each other.'),
       q:T('Wo beginnt bei euch die Uhr — bei der Anfrage oder beim Start?','Where does your clock start — at the request or at the start of work?')},
      {t:T('Die älteste Karte zuerst','Oldest item first'),
       a:T('Ein Team zog nach jedem Abschluss das, was sich leicht bewegen ließ — komplexe Arbeit alterte. Neue Regel: <b>das älteste Ticket geht zuerst weiter</b>. Ergebnis in zwei Monaten: 95.-Perzentil von 76 auf 13 Tage. Keine Umorganisation, nur eine Pull-Regel.',
           'A team always pulled whatever was easy to move — complex work kept aging. New rule: <b>the oldest item moves first</b>. Result within two months: 95th percentile down from 76 to 13 days. No reorganisation, just a pull rule.'),
       q:T('Was nimmt sich bei euch jemand, der gerade frei wird?','What does someone on your team pick up when they become free?')},
      {t:T('Nicht für die Statistik schneiden','Don\'t slice for the statistics'),
       a:T('Stories so zu zerlegen, dass jede in einem Tag fertig ist, lässt die Zahlen gut aussehen — und zerstört den Kundenwert. Schneidet nach Wert, nicht nach Kennzahl.',
           'Splitting stories so each fits into a day makes the numbers look good — and destroys customer value. Slice by value, not by metric.'),
       q:T('Liefert jede eurer Karten für sich etwas, das ein Kunde bemerken würde?','Does each of your items deliver something a customer would notice?')}
     ]},

    {id:'variation', name:T('Normale Schwankung oder Signal?','Normal variation or signal?'),
     k:['schwankung','variation','ausreißer','ausreisser','outlier','spike','prozessgrenze','process limit','signal','rauschen','noise','stabil','stable','schlechter geworden','woche vergleich'],
     items:[
      {t:T('Keine Panik bei einem Ausschlag','Don\'t panic at one spike'),
       a:T('Diese Woche länger, weniger Durchsatz als letzte? Einzelne Wochen nebeneinander zu legen führt fast immer zu Fehlalarmen. Jeder Prozess schwankt — die Frage ist, ob der Ausschlag <b>außerhalb</b> des Üblichen liegt.',
           'Longer this week, lower throughput than last? Comparing single weeks side by side almost always creates false alarms. Every process varies — the question is whether the spike is <b>outside</b> the usual range.'),
       q:T('Worauf hättet ihr bei der letzten „schlechten Woche" reagiert — auf ein Signal oder auf Rauschen?','What did you react to in your last "bad week" — a signal or noise?')},
      {t:T('Natürliche Prozessgrenzen setzen','Set natural process limits'),
       a:T('Grenzen um die eigenen Daten zeigen, was normal ist. Als Basis reichen <b>10 bis 20 Datenpunkte</b> — weniger erzeugt Fehlalarme, deutlich mehr verschleiert Veränderungen. Nach einem echten Signal (neue Policy, neues Team-Setup) die Grenzen neu berechnen: die alten Daten beschreiben dann eine andere Realität.',
           'Limits around your own data show what is normal. <b>10 to 20 data points</b> are enough as a baseline — fewer cause false alarms, far more hide change. After a real signal (new policy, new team setup) recalculate: the old data describes a different reality.'),
       q:T('Wann hat sich bei euch zuletzt etwas am System geändert — und rechnet ihr seitdem mit alten Daten?','When did your system last change — and are you still calculating with the old data?')},
      {t:T('Vier Erkennungsregeln','Four detection rules'),
       a:T('Stärkstes Signal: ein Punkt außerhalb der Grenzen. Leisere Signale: mehrere Punkte nahe einer Grenze, eine längere Serie auf einer Seite des Mittelwerts, ein stetiger Trend. Wer die leisen liest, reagiert, bevor es brennt.',
           'Strongest signal: one point outside the limits. Quieter signals: several points near a limit, a long run on one side of the mean, a steady trend. Reading the quiet ones lets you act before it burns.'),
       q:T('Seht ihr gerade eine Serie auf einer Seite des Mittelwerts?','Do you see a run on one side of the mean right now?')},
      {t:T('Durchsatz-Signale lesen','Read throughput signals'),
       a:T('Durchsatz unter der unteren Grenze: Ursache suchen (Blocker, Urlaub, Störungen). Über der oberen: verstehen, was anders war — und ob es wiederholbar ist oder nur ein Stapel, der gleichzeitig fertig wurde.',
           'Throughput below the lower limit: look for the cause (blockers, holidays, interruptions). Above the upper: understand what was different — and whether it is repeatable or just a batch that finished at once.'),
       q:T('War eure letzte Spitze echter Fluss oder ein Stapel?','Was your last peak real flow or a batch?')}
     ]},

    {id:'wip', name:T('WIP begrenzen','Limiting WIP'),
     k:['wip','begrenz','wip-limit','wip limit','limits setzen','erstes limit','stop starting','start finishing','little','auslastung','utilization','100 %','100%','ausgelastet','multitask','kontextwechsel','context switch','push','pull-prinzip','pull system','ziehen statt'],
     items:[
      {t:T('Aufhören anzufangen, anfangen fertigzumachen','Stop starting, start finishing'),
       a:T('WIP-Limits von oben durchzudrücken erzeugt Widerstand. Besser: erst das Verhalten („erst fertig, dann neu"), dann schrittweise Limits, und jeden Schritt an den Daten messen.',
           'Forcing WIP limits from above creates resistance. Better: first the behaviour ("finish before you start"), then limits step by step, measuring each step in the data.'),
       q:T('Was würde passieren, wenn heute niemand etwas Neues anfängt, bis eine Karte fertig ist?','What would happen if nobody started anything new today until one item is done?')},
      {t:T('Das erste Limit','The first limit'),
       a:T('Eine exakte Formel gibt es nicht. Startet etwas unter dem heutigen WIP je Spalte, beobachtet zwei, drei Wochen und justiert. Limits je Spalte sind nur eine Variante — ein Limit fürs ganze Board oder je Person ist oft einfacher.',
           'There is no exact formula. Start slightly below today\'s WIP per column, observe for two or three weeks and adjust. Per-column limits are only one option — a board-wide or per-person limit is often simpler.'),
       q:T('Wie viel habt ihr heute pro Spalte offen — und wo würdet ihr zuerst eins wegnehmen?','How much is open per column today — and where would you take one away first?')},
      {t:T('Die Wirkung zeigt sich zuerst am Alter','The effect shows in age first'),
       a:T('Kurz nach Einführung von Limits bewegt sich die Durchlaufzeit noch kaum — fertig werden ja zuerst die alten Karten. Schaut stattdessen auf das <b>Alter der laufenden Arbeit</b>: sinkt es, wirkt das Limit.',
           'Right after introducing limits cycle time barely moves — the old items finish first. Look at the <b>age of work in progress</b> instead: if it drops, the limit works.'),
       q:T('Ist das Durchschnittsalter eurer offenen Karten seit dem letzten Limit gesunken?','Has the average age of your open items dropped since the last limit?')},
      {t:T('Little\'s Law','Little\'s Law'),
       a:T('WIP = Durchsatz × Durchlaufzeit (im Mittel, bei stabilem System). Wer eine Größe ändert, bewegt mindestens eine andere. Mehr parallel starten heißt bei gleichem Durchsatz zwangsläufig: alles dauert länger. Daraus folgen Policies — nicht aus Appellen.',
           'WIP = throughput × cycle time (on average, in a stable system). Change one and at least one other moves. Starting more in parallel at the same throughput means everything takes longer. Policies follow from that — not from appeals.'),
       q:T('Welche Policy würde bei euch den WIP dauerhaft senken?','Which policy would lower your WIP for good?')},
      {t:T('Das 100-%-Auslastungs-Paradox','The 100% utilisation paradox'),
       a:T('Jede Person voll auszulasten macht den <b>Fluss</b> langsamer: Warteschlangen wachsen, Kontextwechsel fressen bis zu ein Drittel des Tages. Freiraum ist keine Verschwendung, sondern die Voraussetzung für Geschwindigkeit — und für Ideen.',
           'Keeping everyone fully busy slows the <b>flow</b>: queues grow, context switches eat up to a third of the day. Slack is not waste but the precondition for speed — and for ideas.'),
       q:T('Was wäre, wenn ihr bewusst 20 % Luft einplant?','What if you deliberately planned 20% slack?')},
      {t:T('Ziehen statt schieben','Pull, don\'t push'),
       a:T('Arbeit wird gezogen, wenn Kapazität frei ist — nicht hineingeschoben, wenn sie ankommt. Das beendet Multitasking, hält den Fokus und senkt die Durchlaufzeit meist schneller als jede andere Maßnahme.',
           'Work is pulled when capacity is free — not pushed in when it arrives. That ends multitasking, keeps focus and usually lowers cycle time faster than anything else.'),
       q:T('Wer entscheidet bei euch, wann neue Arbeit startet — das Team oder der Absender?','Who decides when new work starts — the team or the sender?')}
     ]},

    {id:'alter', name:T('Arbeitsalter & Flow-Schuld','Work item age & flow debt'),
     k:['alter','aging','wip age','hängt seit','liegt seit','flow debt','flow-schuld','flowschuld','expedite','dringend','standup','daily'],
     items:[
      {t:T('Das Standup beginnt bei den alten Karten','The standup starts with the old items'),
       a:T('Fragt im Daily zuerst: Welche Karte ist älter als 85 % unserer bisherigen Tickets? Statt Neues anzufangen, bringt ihr genau die voran. Das hält die Durchlaufzeit stabil und macht Risiken sichtbar, bevor sie Termine reißen.',
           'In the daily, ask first: which item is older than 85% of our past items? Instead of starting new work, move exactly that one. It keeps cycle time stable and shows risks before they break dates.'),
       q:T('Welche Karte hat heute die höchste Uhr — und wer hilft ihr weiter?','Which item has the highest clock today — and who helps it along?')},
      {t:T('Flow-Schuld: Expedites kosten später','Flow debt: expedites cost later'),
       a:T('Ein Expedite kommt pünktlich an und wirkt gratis. Bezahlt wird später: alles andere wartet, und drei Wochen danach rutscht der Forecast. Der Test: <b>Durchschnittsalter der laufenden Arbeit</b> gegen die übliche Durchlaufzeit halten — liegt das Alter deutlich darüber, baut sich Schuld auf.',
           'An expedite arrives on time and looks free. The bill comes later: everything else waits, and three weeks on the forecast slips. The test: compare the <b>average age of work in progress</b> with your usual cycle time — if age is clearly higher, debt is building.'),
       q:T('Wie viele Expedites hattet ihr im letzten Monat — und wer hat dafür gewartet?','How many expedites did you have last month — and who waited for them?')},
      {t:T('Schwere Karten nicht liegen lassen','Don\'t leave the hard items lying'),
       a:T('Wer frei wird, greift gern zum leicht Beweglichen. Das Alte, Komplexe altert weiter — und genau das reißt später die Perzentile. Macht die Reihenfolge zur expliziten Policy.',
           'People who become free like to grab what moves easily. The old, complex item keeps aging — and that is exactly what later tears up the percentiles. Make the order an explicit policy.'),
       q:T('Steht bei euch irgendwo geschrieben, was als Nächstes gezogen wird?','Is it written down anywhere what gets pulled next?')}
     ]},

    {id:'blocker', name:T('Blocker','Blockers'),
     k:['blocker','blockiert','blocked','hindernis','impediment','blocked column','5 why','root cause','ursache'],
     items:[
      {t:T('Blockiert ist nicht „außerhalb unserer Kontrolle"','Blocked is not "out of our control"'),
       a:T('Unklare Anforderungen, fehlendes Know-how, Dritte, ausstehendes Feedback — Blocker sind oft der größte Einzelgrund für Verzögerungen. Die Haltung „da kann man nichts machen" ist das eigentliche Problem. Blocker gehören täglich auf den Tisch.',
           'Unclear requirements, missing skills, third parties, pending feedback — blockers are often the biggest single cause of delay. The attitude "nothing we can do" is the real problem. Blockers belong on the table every day.'),
       q:T('Welcher Blocker liegt bei euch am längsten — und wer hat ihn zuletzt angefasst?','Which blocker has been sitting longest — and who touched it last?')},
      {t:T('Keine Blocker-Spalte','No blocked column'),
       a:T('Eine eigene Spalte für Blockiertes lässt das Board „fließen" — tatsächlich steigt der WIP unsichtbar, der Durchsatz sinkt, Arbeit wird ständig angehalten und neu gestartet. Blockierte Arbeit <b>bleibt WIP</b>: markieren, an Ort und Stelle lassen, im Limit mitzählen.',
           'A dedicated blocked column lets the board "flow" — in reality WIP rises invisibly, throughput drops, work is constantly stopped and restarted. Blocked work <b>stays WIP</b>: mark it, leave it in place, count it against the limit.'),
       q:T('Zählen eure blockierten Karten gegen das WIP-Limit?','Do your blocked items count against the WIP limit?')},
      {t:T('Blocker clustern','Cluster your blockers'),
       a:T('Blocker mit Grund erfassen, nach Ursache gruppieren und die verlorenen Tage je Gruppe summieren. Die größte Gruppe zuerst angehen, mit „5 × Warum" zur Ursache — aus Einzelfällen werden Verbesserungen.',
           'Record blockers with a reason, group them by cause and sum the lost days per group. Tackle the biggest group first and use "5 whys" to reach the root cause — single incidents turn into improvements.'),
       q:T('Welche drei Blocker-Ursachen kosten euch die meisten Tage?','Which three blocker causes cost you the most days?')}
     ]},

    {id:'kapazitaet', name:T('Durchsatz, Kapazität & ungeplante Arbeit','Throughput, capacity & unplanned work'),
     k:['durchsatz','throughput','kapazität','capacity','überplan','overcommit','zu viel zugesagt','ungeplant','unplanned','wartung','maintenance','technische schuld','tech debt','bugs','failure demand','rework','nacharbeit','replenish','wie viel ziehen','nachfüllen','allocation'],
     items:[
      {t:T('Mindest-Zusage aus dem Histogramm','Minimum commitment from the histogram'),
       a:T('Das Durchsatz-Histogramm zeigt, wie viele Tickets ihr pro Zeitraum schafft — und wie oft. Die Zahl, die ihr in 85 % der Zeiträume erreicht, ist eine ehrliche Mindest-Zusage. Alles darüber ist Hoffnung.',
           'The throughput histogram shows how many items you finish per period — and how often. The number you reach in 85% of periods is an honest minimum commitment. Anything above is hope.'),
       q:T('Wie viele Tickets schafft ihr in 85 % eurer Wochen mindestens?','How many items do you finish at least in 85% of your weeks?')},
      {t:T('Kapazität verteilen, nicht Personen','Allocate capacity, not people'),
       a:T('Ressourcenplanung fragt „wer macht was", Kapazitätsplanung „wie viel passt". Reserviert aus euren Daten feste Anteile je Arbeitsart (Feature, Wartung, Ungeplantes) — dann verdrängt das eine nicht dauerhaft das andere.',
           'Resource planning asks "who does what", capacity planning "how much fits". Reserve fixed shares per work type (feature, maintenance, unplanned) based on your data — so one doesn\'t permanently crowd out the other.'),
       q:T('Welcher Anteil eurer Arbeit war im letzten Quartal wirklich ungeplant?','What share of your work last quarter was actually unplanned?')},
      {t:T('Ungeplantes in drei Schritten','Unplanned work in three steps'),
       a:T('1. Ungeplante Tickets markieren, sobald sie auftauchen. 2. Aus der Historie Kapazität dafür reservieren. 3. Eine eigene Swimlane mit Limit — dann stört es den Fluss nicht mehr, sondern hat seinen Platz.',
           '1. Tag unplanned items as they appear. 2. Reserve capacity for them from history. 3. Give them their own swimlane with a limit — then they stop disrupting the flow and have their place.'),
       q:T('Könnt ihr heute auf dem Board sehen, was ungeplant reinkam?','Can you see on the board today what came in unplanned?')},
      {t:T('Failure Demand','Failure demand'),
       a:T('Bugs und Nacharbeit gehören dazu — werden sie zur Normalität, liefert das Produkt keinen Wert mehr, sondern räumt hinter sich auf. Messt den Anteil und verfolgt die Ursachen: weniger Failure Demand ist oft der kürzeste Weg zu mehr Kundennutzen.',
           'Bugs and rework are part of the job — when they become the norm, the product stops delivering value and just cleans up after itself. Measure the share and trace causes: less failure demand is often the shortest path to more customer value.'),
       q:T('Wie viel eures Durchsatzes war im letzten Monat Nacharbeit?','How much of your throughput last month was rework?')}
     ]},

    {id:'cfd', name:T('Cumulative Flow & Nachfrage','Cumulative flow & demand'),
     k:['cfd','cumulative','kumulativ','bänder','bands','parallel','ankunft','arrival','nachfrage','demand','erstellt vs','created vs','backlog wächst','staut sich'],
     items:[
      {t:T('Laufen die Linien nicht parallel?','Lines not running parallel?'),
       a:T('Wird das Band zwischen „gestartet" und „fertig" breiter, kommt mehr Arbeit herein als hinaus — ihr startet schneller, als ihr fertig werdet. WIP ist eine Verbindlichkeit; zum Wert wird sie erst beim Kunden.',
           'If the band between "started" and "done" widens, more work enters than leaves — you start faster than you finish. WIP is a liability; it only becomes value at the customer.'),
       q:T('An welcher Stelle wird euer CFD-Band gerade breiter?','Where is your CFD band widening right now?')},
      {t:T('Was füllt die Lücke?','What fills the gap?'),
       a:T('Dass Ankünfte den Durchsatz übersteigen, sagt das CFD. <b>Welche</b> Arbeit sich staut, sagt es nicht. Zerlegt Ankünfte und Abschlüsse nach Arbeitsart oder Label — die Gesamtzahl versteckt die Antwort.',
           'The CFD tells you arrivals exceed throughput. It doesn\'t tell you <b>which</b> work piles up. Break arrivals and completions down by work type or label — the total hides the answer.'),
       q:T('Welche Arbeitsart kommt schneller herein, als sie fertig wird?','Which work type arrives faster than it finishes?')},
      {t:T('Konkret statt „WIP scheint hoch"','Specific, not "WIP seems high"'),
       a:T('„WIP scheint hoch" erzeugt Nicken. Überzeugend ist: so viele Karten in dieser Stufe, dieser Anteil am Gesamt-WIP, so viele Ankünfte gegen so viele Abgänge pro Tag, diese Wartezeit gegen das 95. Perzentil — und je Problem eine konkrete Maßnahme.',
           '"WIP seems high" gets nods. What convinces: this many items in this stage, this share of total WIP, this many arrivals versus departures per day, this wait versus the 95th percentile — and one concrete action per problem.'),
       q:T('Welche drei Zahlen würden euer Engpass-Problem in einem Satz belegen?','Which three numbers would prove your bottleneck in one sentence?')}
     ]},

    {id:'effizienz', name:T('Flow Efficiency & Wartezeit','Flow efficiency & waiting'),
     k:['flow efficiency','flusseffizienz','flow-effizienz','effizienz','wartezeit','waiting','liegezeit','engpass','bottleneck','freigabe','approval','abnahme','breakdown','wo geht die zeit','ki beschleunigt','ai coding'],
     items:[
      {t:T('Die Zeit steckt im Warten','Time hides in waiting'),
       a:T('Typisches Bild: zwei Tage Arbeit, zwölf Tage bis zum Kunden — zehn Tage hat niemand daran gearbeitet, obwohl alle beschäftigt waren. Die Frage ist nicht „welches Team muss schneller werden", sondern „wo wartet die Arbeit?"',
           'Typical picture: two days of work, twelve days to the customer — nobody worked on it for ten days although everyone was busy. The question is not "which team must speed up" but "where does the work wait?"'),
       q:T('In welcher Spalte liegen eure Karten am längsten, ohne dass jemand daran arbeitet?','In which column do your items sit longest without anyone working on them?')},
      {t:T('Eine Freigabe, 40 % der Zeit','One approval, 40% of the time'),
       a:T('Ein einzelner Freigabeschritt kann einen großen Teil der Durchlaufzeit fressen — Arbeit kommt an und wartet auf die eine Person. Eine Entscheidung (Delegation, Kriterien, Zeitfenster) kann die Durchlaufzeit drastisch senken, ohne dass irgendwer schneller arbeitet.',
           'A single approval step can eat a large part of cycle time — work arrives and waits for the one person. One decision (delegation, criteria, time slots) can cut cycle time drastically without anyone working faster.'),
       q:T('Gibt es bei euch einen Schritt, an dem alles auf eine Person wartet?','Is there a step where everything waits for one person?')},
      {t:T('Schneller coden, gleich spät liefern','Faster coding, same late delivery'),
       a:T('KI beschleunigt das Bauen — aber Bauen war selten der langsame Teil. Freigaben, Abhängigkeiten, Deploy-Fenster bleiben; die fertige Arbeit stapelt sich davor. Erst die Aufschlüsselung der Durchlaufzeit zeigt, wo sich Beschleunigung lohnt.',
           'AI speeds up building — but building was rarely the slow part. Approvals, dependencies, deploy windows remain; finished work piles up in front of them. Only a cycle-time breakdown shows where speeding up pays off.'),
       q:T('Welcher Anteil eurer Durchlaufzeit ist aktives Arbeiten?','What share of your cycle time is active work?')},
      {t:T('Streudiagramm statt Histogramm','Scatterplot instead of histogram'),
       a:T('Karten mit niedriger Flow Efficiency sind oft ohnehin kurz — die bringen wenig. Kreuzt Flow Efficiency mit der Durchlaufzeit: interessant sind die Karten <b>lang und ineffizient</b>. Dort liegt der Hebel.',
           'Items with low flow efficiency are often short anyway — little to gain there. Cross flow efficiency with cycle time: the interesting items are <b>long and inefficient</b>. That is where the lever is.'),
       q:T('Welche eurer langen Karten hatte die meiste Wartezeit?','Which of your long items had the most waiting time?')},
      {t:T('Flow Efficiency sauber messen','Measure flow efficiency properly'),
       a:T('Die Frage nach dem „guten Branchenwert" lenkt ab. Wichtiger: klar getrennte Warte- und Arbeitsstatus auf dem Board, konsequent gepflegte Übergänge und Blocker mitgezählt — sonst misst die Zahl eure Board-Disziplin, nicht euren Fluss.',
           'Asking for a "good industry value" distracts. More important: clearly separated waiting and working states on the board, consistently maintained transitions and blockers counted — otherwise the number measures board discipline, not flow.'),
       q:T('Hat euer Board eigene Warte-Spalten („bereit für …")?','Does your board have explicit waiting columns ("ready for …")?')}
     ]},

    {id:'forecast', name:T('Forecasts & Zusagen','Forecasts & commitments'),
     k:['forecast','prognose','monte carlo','zusage','commitment','termin','deadline','wann fertig','when done','story point','storypoint','schätz','estimat','stunden','hours','planning poker','versprechen','promise','garantie','guarantee','sure thing','ja sagen','verbindlich'],
     items:[
      {t:T('Wann wird „Ja" gesagt?','When is "yes" said?'),
       a:T('Das reflexhafte „klar, kein Problem!" ist die teuerste Antwort. Je früher die Zusage, desto wahrscheinlicher der Bruch. Definiert einen <b>Commitment Point</b>: bis dahin ist eine Anfrage optional — ihr klärt, ob sich die Investition lohnt, und schützt die Vorhersagbarkeit.',
           'The reflex "sure thing, no problem!" is the most expensive answer. The earlier the promise, the likelier it breaks. Define a <b>commitment point</b>: until then a request is optional — you check whether it is worth the investment and protect predictability.'),
       q:T('Wo auf eurem Board steht der Commitment Point?','Where on your board is the commitment point?')},
      {t:T('„Diese 10 Dinge bis Donnerstag"','"These 10 items by Thursday"'),
       a:T('Der Satz enthält zwei Versprechen: dass <i>alle</i> fertig werden und dass es <i>genau diese</i> sind. Wissensarbeit gibt das nicht her. Nennt stattdessen eine Wahrscheinlichkeit: „Mit 85 % schaffen wir mindestens sieben."',
           'The sentence holds two promises: that <i>all</i> will be done, and that it is <i>exactly these</i>. Knowledge work can\'t guarantee that. Give a probability instead: "With 85% confidence we finish at least seven."'),
       q:T('Wie würde eure nächste Zusage als Wahrscheinlichkeit klingen?','How would your next commitment sound as a probability?')},
      {t:T('Aufwand ist das kleinste Stück','Effort is the smallest slice'),
       a:T('Termine auf Basis von Aufwand scheitern, weil die Arbeitszeit nur ein kleiner Teil der Durchlaufzeit ist — der Rest ist Warten. Statt Termine zu verhandeln, antwortet mit euren Daten: „Bei unserem Durchsatz ist das mit 85 % bis Datum X fertig."',
           'Dates based on effort fail because working time is only a small part of cycle time — the rest is waiting. Instead of negotiating dates, answer with your data: "At our throughput this is 85% likely done by date X."'),
       q:T('Worauf stützt sich euer letzter zugesagter Termin?','What was your last promised date based on?')},
      {t:T('Story Points sind keine Stunden','Story points are not hours'),
       a:T('Punkte in Stunden umzurechnen wirkt objektiv, ist es aber nicht: zwischen Punkten und tatsächlicher Dauer gibt es meist keinen belastbaren Zusammenhang. Prüft es an euren eigenen Daten — und nutzt für Vorhersagen den Durchsatz.',
           'Converting points to hours looks objective but isn\'t: there is usually no reliable link between points and actual duration. Check it against your own data — and use throughput for forecasts.'),
       q:T('Hattet ihr schon mal eine „3", die länger dauerte als eine „8"?','Have you had a "3" that took longer than an "8"?')},
      {t:T('Monte Carlo in Kurzform','Monte Carlo in short'),
       a:T('Die Simulation zieht tausendfach aus eurem echten Durchsatz. Sie braucht keine gleich großen Tickets, sondern eine halbwegs stabile Historie aus derselben Art Arbeit. Laufende Arbeit mitdenken, Ergebnis als Bandbreite lesen (50/85/95 %).',
           'The simulation samples your real throughput a thousand times. It doesn\'t need equally sized items, just a reasonably stable history of the same kind of work. Account for work in progress, read the result as a range (50/85/95%).'),
       q:T('Welches Konfidenzniveau braucht eure Zusage — 85 oder 95 %?','Which confidence level does your commitment need — 85 or 95%?')},
      {t:T('Mythen über probabilistische Vorhersagen','Myths about probabilistic forecasting'),
       a:T('Häufige Einwände: „zu wenig Daten", „unsere Tickets sind zu unterschiedlich", „das ist zu kompliziert", „Schätzen ist genauer". In der Praxis liefert der Forecast mindestens so gute Antworten — mit einem Bruchteil des Aufwands.',
           'Common objections: "not enough data", "our items are too different", "it\'s too complicated", "estimating is more accurate". In practice the forecast gives at least as good answers — with a fraction of the effort.'),
       q:T('Welcher dieser Einwände kommt bei euch am häufigsten?','Which of these objections do you hear most?')},
      {t:T('Der Teddybär darf bleiben','The teddy bear may stay'),
       a:T('Schätzen abzuschaffen erzeugt Widerstand. Lasst beide Methoden eine Weile parallel laufen und vergleicht die Treffer. Vertrauen wächst aus Ergebnissen, nicht aus Argumenten.',
           'Abolishing estimation creates resistance. Run both methods in parallel for a while and compare hit rates. Trust grows from results, not arguments.'),
       q:T('Welche Methode hätte eure letzten drei Termine besser getroffen?','Which method would have hit your last three dates better?')},
      {t:T('Von Schätzung zu Garantie','From estimate to guarantee'),
       a:T('Wer lange genug misst, was tatsächlich geliefert wird, kann irgendwann Festpreis und Festtermin zusagen — auf Basis der Verteilung, nicht des Bauchgefühls. Das braucht Jahre an Daten, beginnt aber mit dem ersten sauber gemessenen Ticket.',
           'Measure what you actually deliver long enough and eventually you can commit to fixed price and fixed date — based on the distribution, not gut feeling. It takes years of data but starts with the first properly measured item.'),
       q:T('Seit wann habt ihr saubere Daten?','Since when do you have clean data?')}
     ]},

    {id:'policies', name:T('Explizite Policies & Systemdesign','Explicit policies & system design'),
     k:['policy','policies','spielregel','vereinbarung','definition of','systemdesign','board design','board-design','spezialis','silo','scrum und kanban','scrum vs','kanban mythos','myth','nach lehrbuch','by the book','swimlane'],
     items:[
      {t:T('Regeln sichtbar machen','Make rules visible'),
       a:T('Was tun wir, wenn ein Expedite kommt und niemand frei ist? Wie gehen wir mit Defekten mitten im Fluss um? Explizite Policies beantworten das, bevor es brennt — und eure Flow-Daten zeigen, welche Policy fehlt.',
           'What do we do when an expedite arrives and nobody is free? How do we handle defects mid-flow? Explicit policies answer that before it burns — and your flow data shows which policy is missing.'),
       q:T('Welche Regel lebt ihr, ohne dass sie irgendwo steht?','Which rule do you live without it being written anywhere?')},
      {t:T('Kanban passt sich euch an','Kanban adapts to you'),
       a:T('Ein gutes System baut auf den Stärken des Teams auf, statt Menschen ins System zu pressen. Kleine Schritte: Workflow um das formen, was schon funktioniert, echte Gespräche vor dem Board, Policies, die Zusammenarbeit leichter machen.',
           'A good system builds on the team\'s strengths instead of forcing people into it. Small steps: shape the workflow around what already works, real conversations in front of the board, policies that make collaboration easier.'),
       q:T('Was an eurem Board beschreibt, wie ihr wirklich arbeitet — und was nur, wie ihr arbeiten solltet?','What on your board describes how you really work — and what only how you should?')},
      {t:T('Spezialisierung verschiebt Prioritäten','Specialisation shifts priorities'),
       a:T('Jede Rolle macht ihren Job — und trotzdem bleibt die wichtigste Karte tagelang liegen, während weniger Dringendes zuerst beim Kunden ist. Wenn jeder nur „seine" Arbeit zieht, entscheidet die Verfügbarkeit, nicht die Priorität.',
           'Every role does its job — and still the most important item sits for days while something less urgent reaches the customer first. When everyone only pulls "their" work, availability decides, not priority.'),
       q:T('Hilft bei euch jemand bei einer Karte außerhalb seiner Rolle?','Does anyone on your team help with an item outside their role?')},
      {t:T('Nicht nach Lehrbuch','Not by the book'),
       a:T('Scrum oder Kanban „nach Lehrbuch" ist ein guter Start. Wirkung entsteht, wenn ihr übernehmt, was in eurem Kontext hilft, und weglasst, was nicht hilft — z. B. Flow-Metriken in Sprint-Events. Die Frage ist nicht „welches Framework", sondern „wie verhält sich unser System, wenn Arbeit fließt?"',
           'Scrum or Kanban "by the book" is a good start. Impact comes from adopting what helps in your context and dropping what doesn\'t — e.g. flow metrics in sprint events. The question is not "which framework" but "how does our system behave when work flows?"'),
       q:T('Welche Praxis macht ihr nur, weil sie im Lehrbuch steht?','Which practice do you only do because it is in the book?')}
     ]},

    {id:'verbesserung', name:T('Verbessern mit Daten','Improving with data'),
     k:['verbesser','improve','marginal','1 %','1%','kleine schritte','small steps','wirkt das','is it working','funktioniert es','datengetrieben','data-driven','data driven','experiment','kaizen','retro'],
     items:[
      {t:T('Die Summe kleiner Gewinne','The sum of marginal gains'),
       a:T('Kein großer Umbau, sondern viele kleine Verbesserungen von je etwa 1 % — konsequent über Jahre. Einzeln unscheinbar, zusammen transformierend. Für Teams heißt das: eine kleine Änderung pro Zyklus, gemessen.',
           'Not one big overhaul but many small improvements of about 1% each — consistently over years. Individually unremarkable, together transformative. For teams: one small change per cycle, measured.'),
       q:T('Welche 1-%-Verbesserung probiert ihr im nächsten Zyklus?','Which 1% improvement will you try in the next cycle?')},
      {t:T('Jede Initiative braucht eine Zahl','Every initiative needs a number'),
       a:T('„Beginne mit dem, was du jetzt tust." Jede Änderung — groß oder klein — bekommt ein messbares Ziel und eine Metrik. Trifft sie das Ziel nicht: anhalten, überdenken, anpassen, neu testen. Und den Kontext hinter der Zahl mit erzählen.',
           '"Start with what you do now." Every change — big or small — gets a measurable goal and a metric. If it misses: stop, rethink, adjust, retest. And tell the context behind the number.'),
       q:T('Woran würdet ihr in vier Wochen merken, dass eure letzte Änderung gewirkt hat?','How would you notice in four weeks that your last change worked?')},
      {t:T('Wirkt die Veränderung?','Is the change working?'),
       a:T('Werden die längsten Stufen in der Aufschlüsselung der Durchlaufzeit über die Zeit kürzer, seid ihr auf dem richtigen Weg. Kriechen sie nach oben, tiefer graben. So beantwortet ihr die Frage der Führung „wirkt das?" mit Daten statt Gefühl.',
           'If the longest stages in your cycle-time breakdown shrink over time, you are on the right path. If they creep up, dig deeper. That answers leadership\'s "is it working?" with data instead of feeling.'),
       q:T('Welche Stufe eurer Durchlaufzeit ist seit dem letzten Quartal gewachsen?','Which stage of your cycle time grew since last quarter?')}
     ]},

    {id:'fuehrung', name:T('Führung, Coaching & Entscheidungen','Leadership, coaching & decisions'),
     k:['führung','leadership','stakeholder','überzeugen','convince','pushback','widerstand','resistance','entscheidung','decision','portfolio','präsentier','present','ki kann das','can\'t ai','ai do this','facilitation','moderation','moderier'],
     items:[
      {t:T('Ein Satz von der Zahl zur Handlung','One sentence from number to action'),
       a:T('Portfolio-Review: 47 aktive Initiativen, 12 Wochen Durchlaufzeit — alle nicken, niemand pausiert etwas. Es fehlt ein Satz je Metrik: „Wenn diese Zahl X zeigt, tun wir Y." Ohne ihn wird ein Review zur Deutungsübung statt zur Entscheidung.',
           'Portfolio review: 47 active initiatives, 12 weeks cycle time — everyone nods, nobody pauses anything. What\'s missing is one sentence per metric: "When this number shows X, we do Y." Without it a review becomes interpretation, not decision.'),
       q:T('Welche Entscheidung löst eure wichtigste Kennzahl aus?','Which decision does your most important metric trigger?')},
      {t:T('Die Daten landen vor dem Meeting','Data lands before the meeting'),
       a:T('Wer Ergebnisse erst im Meeting zeigt, bekommt „gute Einsichten" und keine Entscheidung. Vorher: Befunde den einzelnen Stakeholdern zuordnen, Reihenfolge so bauen, dass einer den nächsten trägt, und das Szenario vorbereiten, nach dem gefragt werden wird.',
           'Showing results for the first time in the meeting earns "good insights" and no decision. Beforehand: map findings to individual stakeholders, sequence them so each earns the next, and prepare the scenario people will ask for.'),
       q:T('Mit wem müsstet ihr vor dem nächsten Review einzeln sprechen?','Whom would you need to talk to one-on-one before the next review?')},
      {t:T('Widerstand ist eine Nachricht','Pushback is a message'),
       a:T('„Das sollten wir anders betrachten" heißt selten, dass die Daten falsch sind. Meist steckt dahinter politisches Risiko, konkurrierende Ziele, Timing oder Zuständigkeit. Die Analyse lauter zu verteidigen hilft fast nie — nach dem eigentlichen Anliegen zu fragen schon.',
           '"We should look at this differently" rarely means the data is wrong. Usually it signals political risk, competing goals, timing or ownership. Defending the analysis harder almost never helps — asking for the real concern does.'),
       q:T('Welches unausgesprochene Risiko könnte hinter dem letzten Nein stecken?','What unspoken risk might sit behind the last "no"?')},
      {t:T('Szenarien statt Empfehlung','Scenarios, not a recommendation'),
       a:T('Ist die offensichtliche Lösung mit jemandes eigenem Ziel verknüpft, hilft kein „das ist falsch". Mehrere Szenarien entlang bereits zugesagter Termine lassen die Führung selbst die richtige Option wählen — mit eigener Begründung.',
           'If the obvious fix is tied to someone\'s own objective, "this is wrong" won\'t help. Several scenarios framed around already-promised dates let leadership pick the right option themselves — with their own reasoning.'),
       q:T('Wem gehört das System, das ihr ändern wollt?','Who owns the system you want to change?')},
      {t:T('Die fünf Minuten danach','The five minutes after'),
       a:T('Entscheidungen scheitern selten im Meeting, sondern im Flur danach: eine Ausnahme hier, eine Umbesetzung dort, und das alte System setzt sich wieder durch. Nachfassen, solange die Zusage warm ist.',
           'Decisions rarely fail in the meeting but in the hallway afterwards: an exception here, a reassignment there, and the old system reasserts itself. Follow up while the commitment is still warm.'),
       q:T('Wer prüft nächste Woche, ob die letzte Entscheidung noch gilt?','Who checks next week whether the last decision still holds?')},
      {t:T('„Kann das nicht die KI?"','"Can\'t AI do this?"'),
       a:T('Die ehrliche Antwort beginnt mit <b>Ja</b>: Die Analyse — Engpass, alte Arbeit, Kapazitätslücke — liefert ein Werkzeug in Sekunden. Was bleibt, ist die eigentliche Veränderungsarbeit: Dynamiken lesen, Szenarien bauen, Entscheidungen ermöglichen und absichern.',
           'The honest answer starts with <b>yes</b>: the analysis — bottleneck, aging work, capacity gap — a tool delivers in seconds. What remains is the actual change work: reading dynamics, building scenarios, enabling and securing decisions.'),
       q:T('Wofür würdet ihr die gewonnene Analysezeit nutzen?','What would you use the saved analysis time for?')},
      {t:T('Moderieren heißt führen','Facilitating is leading'),
       a:T('Wer ein Team führt, moderiert — ob es so heißt oder nicht. Zuhören, Stille aushalten, bis echtes Denken entsteht, und Gespräche so gestalten, dass andere entscheiden können.',
           'Whoever leads a team facilitates — whether it is called that or not. Listen, hold silence until real thinking emerges, and shape conversations so others can decide.'),
       q:T('Wann habt ihr zuletzt bewusst geschwiegen, damit jemand anderes entscheidet?','When did you last stay silent on purpose so someone else could decide?')}
     ]},

    {id:'menschen', name:T('Team & Nachhaltigkeit','Team & sustainability'),
     k:['stress','burnout','überlast','overload','nein sagen','say no','kündig','resign','schlüsselperson','key person','vier-tage','4-day','four-day','anreiz','incentive','bonus','motivation','konflikt','conflict','erschöpf','exhaust'],
     items:[
      {t:T('Nein sagen entlastet','Saying no relieves'),
       a:T('Jede Anfrage anzunehmen fühlt sich hilfsbereit an und endet im Ausbrennen. Ein sichtbares System mit Limits macht „noch nicht" zu einer sachlichen Antwort statt zu einer persönlichen Absage.',
           'Accepting every request feels helpful and ends in burnout. A visible system with limits turns "not yet" into a factual answer instead of a personal refusal.'),
       q:T('Welche Anfrage hättet ihr letzte Woche lieber auf „noch nicht" gesetzt?','Which request last week would you rather have set to "not yet"?')},
      {t:T('Die Last der Schlüsselperson','The key person\'s load'),
       a:T('Die fähigste Person trägt die schwerste Arbeit, stopft die Lücken, ist Ansprechpartner für alles Festgefahrene. Schaut hin, <i>bevor</i> sie kündigt: Was verlangt euer Liefersystem jede Woche von ihr?',
           'The most capable person carries the hardest work, fills the gaps, is the go-to for everything stuck. Look <i>before</i> they resign: what does your delivery system ask of them every week?'),
       q:T('Ohne wen würde bei euch nächste Woche am meisten stehen bleiben?','Without whom would most work stall next week?')},
      {t:T('Ein gemeinsames Ziel statt Einzelanreize','One shared goal instead of individual incentives'),
       a:T('Ein Team, das als Experiment auf eine Vier-Tage-Woche hinarbeitete, bekam nur ein gemeinsames Ziel: die Vorhersagbarkeit halten. Ergebnis: schnellere Lieferung — und vor allem mehr Zusammenarbeit. Einzelprämien ziehen eher in die Gegenrichtung.',
           'A team working towards a four-day week as an experiment was given only one shared goal: keep predictability. Result: faster delivery — and above all more collaboration. Individual bonuses tend to pull the other way.'),
       q:T('Belohnt euer System Einzelleistung oder fertige Arbeit?','Does your system reward individual output or finished work?')},
      {t:T('Die Geschichte hinter dem Konflikt','The story behind the conflict'),
       a:T('Wenn Teams feststecken, liegt es oft nicht am Prozess, sondern an unausgesprochenen Annahmen und Geschichten übereinander. Wer Geschichte und Wirklichkeit trennt, hört auf zu streiten, wer recht hat.',
           'When teams are stuck, it is often not the process but unspoken assumptions and the stories people tell about each other. Separating story from reality ends the fight about who is right.'),
       q:T('Welche Annahme übereinander habt ihr noch nie überprüft?','Which assumption about each other have you never checked?')}
     ]}
  ];

  /* Kachel-Id (cockpit.html, .cv) → Cluster, in Reihenfolge der Passung. */
  const CHART={
    cfd:['cfd','wip','kapazitaet'], wipcol:['wip','alter','cfd'], scatter:['durchlaufzeit','variation','effizienz'],
    hist:['durchlaufzeit','variation'], through:['kapazitaet','variation','forecast'], cvr:['cfd','kapazitaet'],
    aging:['alter','blocker','wip'], floweff:['effizienz','blocker'], due:['forecast'], mc:['forecast','kapazitaet'],
    type:['kapazitaet','policies'], cos:['kapazitaet','policies'], reso:['verbesserung','kapazitaet'], wsjf:['forecast','policies']
  };
  const byId={}; CLUSTER.forEach(c=>{byId[c.id]=c;});

  function L(lang){ if(lang)return String(lang).slice(0,2)==='en'?'en':'de';
    try{ return String(document.documentElement.lang||'de').slice(0,2)==='en'?'en':'de'; }catch(e){ return 'de'; } }
  /* Tageszähler (lokales Datum): dieselbe Kachel zeigt heute denselben, morgen den nächsten Impuls. */
  function day(){ const d=new Date(); return Math.floor(new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()/864e5); }
  function pick(arr,salt){ if(!arr||!arr.length)return null; let h=day(); for(const ch of String(salt||''))h=(h*31+ch.charCodeAt(0))>>>0; return arr[h%arr.length]; }

  function entry(c,it,lang){
    const l=L(lang);
    return {a:`<b>${c.name[l]} · ${it.t[l]}</b><br>${it.a[l]}`, q:it.q[l], c:true, cluster:c.id, title:it.t[l]};
  }

  /* Freitext → bester Eintrag. Score = Stichwort-Treffer im Cluster, dann Wortüberlappung im Eintrag.
     Kein Treffer → null (der Aufrufer behält seinen eigenen FALLBACK). */
  function match(text,lang){
    const t=' '+String(text||'').toLowerCase()+' ';
    if(t.trim().length<3)return null;
    const words=t.split(/[^a-zäöüß0-9%-]+/).filter(w=>w.length>4);
    let best=null,bs=0;
    CLUSTER.forEach((c,ci)=>{
      const hits=c.k.filter(kw=>t.includes(kw)).length;
      if(!hits)return;
      c.items.forEach((it,ii)=>{
        const head=(it.t.de+' '+it.t.en).toLowerCase(), body=(it.a.de+' '+it.a.en).toLowerCase();
        const sc=hits*10+words.filter(w=>head.includes(w)).length*2+words.filter(w=>body.includes(w)).length-ci*0.01-ii*0.001;
        if(sc>bs){bs=sc;best=[c,it];}
      });
    });
    return best?entry(best[0],best[1],lang):null;
  }

  function forChart(id,status,lang){
    const ids=CHART[id]; if(!ids)return null;
    /* Rot: der passendste Cluster. Sonst über die Liste rotieren, damit es nicht eintönig wird. */
    const c=byId[(status==='red')?ids[0]:pick(ids,id+'c')];
    const it=pick(c.items,id);
    return it?Object.assign(entry(c,it,lang),{short:it.a[L(lang)].replace(/<[^>]+>/g,'')}):null;
  }

  const SEV={red:0,yellow:1,green:2,grey:3};
  function situation(AS,lang){
    const list=Object.keys(AS||{}).filter(id=>CHART[id]&&AS[id]&&AS[id].s in SEV).sort((a,b)=>SEV[AS[a].s]-SEV[AS[b].s]);
    if(!list.length){ const c=pick(CLUSTER,'x'); return entry(c,pick(c.items,'x'),lang); }
    const id=list[0]; const e=forChart(id,AS[id].s,lang);
    return e?Object.assign(e,{chart:id,ampel:AS[id].s}):null;
  }

  /* Kurzfassung für den KI-Kontext: nur Titel, keine Texte (hält den Prompt klein). */
  function ctxFor(AS){
    const out=[];
    Object.keys(AS||{}).forEach(id=>{ const s=AS[id]&&AS[id].s; if((s==='red'||s==='yellow')&&CHART[id]){
      const c=byId[CHART[id][0]]; out.push({kachel:id,ampel:s,thema:c.name.de,impulse:c.items.map(i=>i.t.de)}); }});
    return out.slice(0,4);
  }

  window.pbFlowWissen={CLUSTER, CHART, match, forChart, situation, ctxFor,
    themen:(lang)=>CLUSTER.map(c=>c.name[L(lang)])};
})();
