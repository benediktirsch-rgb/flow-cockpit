/* ═══════════════════════════════════════════════════════════════════════════
   pbMeet — Meeting-Masken je Flight Level (FL1 Team · FL2 Programm · FL3 Strategie)
   ───────────────────────────────────────────────────────────────────────────
   Warum: Die Zahlen im Cockpit ändern nichts, solange niemand ein Gespräch daraus
   macht. Diese Masken sind die Brücke: vier Formate (Daily, Planung, Review,
   Flow Review) — auf jedem Flight Level dasselbe Muster, aber mit den Fragen und
   Zahlen, die dort zählen. Jede Maske hat denselben Aufbau:
     Zweck · Ablauf mit Timebox · EURE Zahlen jetzt · die 3 Fragen · Besser werden
   Die 3 Fragen sind bewusst „offensichtlich": im Meeting stellt sie trotzdem
   niemand. Die Vorschläge kommen aus den Live-Zahlen, nicht aus dem Lehrbuch.
   Notizen/Beschluss/Experiment bleiben lokal im Browser (Betriebsrat: keine
   Personendaten, kein Versand).
   Aufruf: Menü-Chip „🗓 Meeting" (pb-ui.js) — fehlt der, hängt sich diese Datei selbst
   ein Abzeichen in den Seitenkopf. Direkt: pbMeet.open('fl1','daily').

   GETEILTE DATEI — hier ist die Quelle. Die anderen Instanzen bekommen sie über ihren
   Build kopiert (analytics-dashboard: build-va.ps1 → site/va/, build-starter-part3.ps1 →
   site/), mit einem Cache-Stempel aus dem Datei-Inhalt. Wer hier etwas ändert, ändert es
   überall — deshalb steht in dieser Datei nichts Kunden-, Marken- oder Personenspezifisches.
   Zahlen kommen entweder aus dem Team-Datenmodell des Programms (pb-data.js: TEAMS/teamStats/LIVEFLOW/
   OKRS) oder, wo das fehlt, aus window.pbFacts() — das die Cockpit-Seite selbst liefert.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  /* Sprache aus pb-i18n.js. Die Paare stehen hier als Array ['de','en'] — Kroatisch legt sich
     als Overlay darueber, geschluesselt auf dem deutschen Element. */
  const LANG = (window.pbLang ? pbLang() : 'de');
  const T = p => Array.isArray(p)
    ? (LANG === 'hr' ? (window.pbHr ? pbHr(p[0], p[1]) : p[1]) : (LANG === 'en' ? p[1] : p[0]))
    : p;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* Der Assistent heißt je Instanz anders — der Name kommt von dem, der gerade montiert
     ist. Wo gar keiner läuft (Verkaufsversion), entfällt der Knopf ersatzlos. */
  const HASBUDDY = () => !!(window.pbFlow && window.pbFlow.open);
  const BUDDY = () => { try{ return (window.pbBuddy && pbBuddy.name && pbBuddy.name()) || T(['dem Assistenten','the assistant']); }
                        catch(e){ return T(['dem Assistenten','the assistant']); } };

  /* ---------- Kontext: auf welchem Flight Level steht die Nutzerin gerade? ---------- */
  function here(){ return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
  function ctxLevel(){
    const p = here(), h = (location.hash || '').replace('#','');
    if (/^cockpit/.test(p)) return 'fl1';
    if (/programmboard/.test(p)) return h === 'okr' ? 'fl3' : 'fl2';
    if (/valuestream/.test(p)) return 'fl3';
    /* Instanzen mit eigenem Dateinamen (index.html einer Team-Instanz) erkennt man daran,
       dass die Seite eigene Flusszahlen anbietet — das ist ein Team-Cockpit, also FL1. */
    if (pageFacts()) return 'fl1';
    return 'fl2';
  }
  function teamId(){
    try{ if (typeof vsCurrentTeamId === 'function') return vsCurrentTeamId(); }catch(e){}
    try{ const a = JSON.parse(sessionStorage.getItem('vsAuth')||'null'); if (a && a.team) return a.team; }catch(e){}
    return null;
  }
  function teamName(id){
    try{ const t = (typeof TEAMS !== 'undefined') && TEAMS.find(x=>x.id===id); return t ? t.n : (id||''); }catch(e){ return id||''; }
  }
  /* Datenmodell da? pb-data.js liefert TEAMS/FEAT/teamStats — auf Seiten ohne Modell bleiben die Zahlen leer. */
  const HAS = () => (typeof TEAMS !== 'undefined' && typeof FEAT !== 'undefined' && typeof teamStats === 'function');

  /* ---------- Zahlen: was auf diesem Level gerade wirklich gilt ----------
     Jede Kennzahl kommt mit Ampel — dieselben Schwellen wie im Cockpit (vsSet). */
  function setg(){ try{ return (typeof vsSet === 'function') ? vsSet() : {}; }catch(e){ return {}; } }
  /* Zahlen der Seite selbst: {wip, p50, done8w, team} — jede Cockpit-Instanz kann sie liefern. */
  function pageFacts(){
    try{ if (typeof window.pbFacts === 'function'){ const p = window.pbFacts(); if (p && (p.wip != null || p.p50 != null)) return p; } }catch(e){}
    return null;
  }
  function amp(v, y, r){ return v == null ? 'grey' : (v >= r ? 'red' : v >= y ? 'yellow' : 'green'); }
  function ampDown(v, g, y){ return v == null ? 'grey' : (v >= g ? 'green' : v >= y ? 'yellow' : 'red'); }

  function facts(level){
    const S = setg(), out = { level, num: [], raw: {} };
    if (level === 'fl1'){
      const id = teamId(); out.raw.team = id; out.team = teamName(id);
      let s = null, lf = null;
      try{ if (HAS() && id) s = teamStats(id); }catch(e){}
      try{ lf = (typeof LIVEFLOW !== 'undefined' && id && LIVEFLOW[id]) ? LIVEFLOW[id] : null; }catch(e){}
      /* Instanzen ohne dieses Datenmodell liefern ihre eigenen Zahlen:
         die Cockpit-Seite meldet sich mit window.pbFacts() an (Definition in cockpit.html). */
      if (!lf) { const P = pageFacts(); if (P) { lf = P; if (P.team) out.team = P.team; } }
      if (lf){
        const wk = lf.done8w ? lf.done8w/8 : 0, inv = (wk > 0 && lf.wip != null) ? lf.wip/wk : null;
        Object.assign(out.raw, {wip:lf.wip, p50:lf.p50, done8w:lf.done8w, wk, inv});
        out.num.push(['WIP aktiv','WIP active', lf.wip, amp(lf.wip, S.wipYellow||20, S.wipRed||60), ['Tickets gleichzeitig offen','tickets open in parallel']]);
        out.num.push(['Lead Time p50','Lead time p50', lf.p50 + ' ' + T(['Tage','days']), amp(lf.p50, S.ltYellow||20, S.ltRed||45), ['jedes zweite Ticket schafft es in dieser Zeit','every second ticket makes it in this time']]);
        out.num.push(['Durchsatz','Throughput', (Math.round(wk*10)/10).toString().replace('.', LANG==='en'?'.':',') + '/' + T(['Wo','wk']), 'grey', ['fertig pro Woche (8-Wochen-Schnitt)','finished per week (8-week average)']]);
        if (inv != null) out.num.push([['Bestand','Inventory'], null, (Math.round(inv*10)/10).toString().replace('.', LANG==='en'?'.':',') + ' ' + T(['Wochen','weeks']), amp(inv, 2, 3.5), ['WIP geteilt durch Durchsatz — so lange braucht der Stapel','WIP divided by throughput — that is how long the pile takes']]);
      }
      if (s){
        Object.assign(out.raw, {deps:s.deps, pred:s.pred, obj:s.obj, feat:s.fk.length, done:s.by.D, wsjfOk:s.wsjfOk});
        if (s.deps != null) out.num.push([['Abhängigkeiten','Dependencies'], null, s.deps, amp(s.deps, 1, 4), ['am Team hängende Kopplungen','couplings hanging on the team']]);
        if (s.pred != null) out.num.push(['Predictability', 'Predictability', s.pred + ' %', ampDown(s.pred, 70, 45), ['Fortschritt der PI-Features','progress of the PI features']]);
      }
    }
    if (level === 'fl2'){
      let deps = 0, feat = 0, done = 0, act = 0, teams = 0, wsjf = 0, live = 0;
      try{
        if (HAS()){
          TEAMS.forEach(t => { teams++;
            if (t.live) live++;
            const s = teamStats(t.id);
            deps += s.deps||0; feat += s.fk.length; done += s.by.D||0; act += (s.by.I||0)+(s.by.F||0); wsjf += s.wsjfOk||0;
          });
        }
      }catch(e){}
      Object.assign(out.raw, {deps, feat, done, act, teams, wsjf, live});
      if (feat){
        out.num.push([['Features im Programm','Features in the program'], null, feat, 'grey', ['über alle Teams','across all teams']]);
        out.num.push([['davon fertig','of them done'], null, done + ' (' + Math.round(done/feat*100) + ' %)', ampDown(Math.round(done/feat*100), 60, 35), ['Ende-zu-Ende geliefert','delivered end to end']]);
        out.num.push([['gleichzeitig aktiv','active in parallel'], null, act, amp(act, Math.max(6, teams*1.5), Math.max(12, teams*3)), ['angefangen, nicht fertig — Programm-WIP','started, not finished — program WIP']]);
        out.num.push([['WSJF gepflegt','WSJF maintained'], null, Math.round(wsjf/feat*100) + ' %', ampDown(Math.round(wsjf/feat*100), 70, 40), ['ohne Priorisierung entscheidet die Lautstärke','without prioritisation, volume decides']]);
      }
      /* Ohne Teamliste keine Programm-Zahlen: dann bleibt der Block leer und sagt das auch,
         statt „0/0" zu behaupten. */
      if (teams){
        out.num.push([['Abhängigkeiten','Dependencies'], null, deps, amp(deps, 3, 8), ['rote Kopplungen auf dem Programm-Board','red couplings on the program board']]);
        out.num.push([['Teams mit Live-Daten','Teams with live data'], null, live + '/' + teams, ampDown(Math.round(live/teams*100), 70, 40), ['ohne Daten redet man über Gefühle','without data you discuss feelings']]);
      }
    }
    if (level === 'fl3'){
      let objs = 0, kr = 0, rated = 0, g = 0, y = 0, r = 0, last = null;
      try{
        if (typeof OKRS !== 'undefined'){
          OKRS.forEach(o => { objs++; (o.krs||[]).forEach(k => { kr++;
            const st = (typeof krStatus === 'function') ? krStatus(o.id.replace(' ','')+'/'+k[0]) : null;
            if (st){ rated++; if (st.s==='g') g++; else if (st.s==='y') y++; else r++; if (st.date && (!last || String(st.date) > String(last))) last = st.date; }
          }); });
        }
      }catch(e){}
      const konf = rated ? Math.round((g + 0.5*y)/rated*100) : null;
      Object.assign(out.raw, {objs, kr, rated, g, y, r, konf, last});
      if (objs){
        out.num.push([['Objectives','Objectives'], null, objs, 'grey', ['Ziele im Quartal','goals this quarter']]);
        out.num.push([['Key Results bewertet','Key results rated'], null, rated + '/' + kr, ampDown(kr ? Math.round(rated/kr*100) : 0, 80, 50), ['unbewertete KRs sind unsichtbare Risiken','unrated KRs are invisible risks']]);
      }
      if (konf != null) out.num.push([['OKR-Konfidenz','OKR confidence'], null, konf + ' %', ampDown(konf, S.okrGreen||70, S.okrYellow||50), [g+'× grün · '+y+'× gelb · '+r+'× rot', g+'× green · '+y+'× yellow · '+r+'× red']]);
      if (last) out.num.push([['Letztes Check-in','Last check-in'], null, last, 'grey', ['Stand der Bewertung','state of the rating']]);
    }
    return out;
  }

  /* ---------- Die Formate ----------
     Vier Muster, drei Ebenen. agenda: [Minuten, Text]. fragen: die drei, die keiner stellt. */
  const M = {
    fl1: {
      lbl: ['FL1 · Team-Flow','FL1 · team flow'],
      sub: ['Die Arbeit des Teams — operativ, täglich, am Board','The team\'s work — operational, daily, at the board'],
      m: [
      { id:'daily', ic:'☀️', n:['Daily','Daily'], kad:['täglich · 15 Min','daily · 15 min'], box:15,
        wer:['Alle, die an der Arbeit sind','Everyone working on the items'],
        zweck:['Kein Status-Bericht. Das Board von rechts nach links durchgehen und die Frage beantworten: Was bringen wir heute über die Ziellinie?',
               'Not a status report. Walk the board right to left and answer one question: what do we get over the line today?'],
        agenda:[[3,['Blocker zuerst — rote Karten, Wartepositionen, Eskalationen','Blockers first — red cards, waiting items, escalations']],
                [7,['Von rechts nach links: was ist nah am Fertig und braucht Hilfe?','Right to left: what is close to done and needs help?']],
                [3,['WIP-Blick: darf heute überhaupt etwas Neues starten?','WIP check: may anything new start today at all?']],
                [2,['Eine Zusage: was ist heute Abend wirklich fertig?','One commitment: what is really finished tonight?']]],
        fragen:[['Was hindert uns heute daran, etwas fertig zu machen?','What is stopping us from finishing something today?'],
                ['Welche Karte liegt am längsten still — und woran wartet sie?','Which card has been idle longest — and what is it waiting for?'],
                ['Startet gerade jemand Neues, obwohl etwas anderes offen ist?','Is anyone starting something new while something else is still open?']] },
      { id:'plan', ic:'🎯', n:['Planung / Replenishment','Planning / replenishment'], kad:['wöchentlich · 45 Min','weekly · 45 min'], box:45,
        wer:['Team + Product Owner (Nachschub entscheidet, wer Prioritäten verantwortet)','Team + product owner (replenishment is where priorities are owned)'],
        zweck:['Nicht „was schaffen wir?", sondern „was ziehen wir als Nächstes rein?". Nachschub nur so viel, wie Platz frei geworden ist.',
               'Not "what can we manage?" but "what do we pull in next?". Replenish only as much as capacity has actually freed up.'],
        agenda:[[8,['Rückblick: was ist seit letzter Woche fertig geworden — und was nicht?','Look back: what got finished since last week — and what did not?']],
                [12,['Der Nachschub-Kandidatenstapel: Wert, Dringlichkeit, Risiko','The replenishment candidates: value, urgency, risk']],
                [15,['Ziehen statt Zuteilen: nur so viel, wie Platz frei ist','Pull, don\'t assign: only as much as there is room for']],
                [10,['Abhängigkeiten und Zusagen an andere Teams festhalten','Note dependencies and commitments to other teams']]],
        fragen:[['Wieviel ist seit dem letzten Mal fertig geworden — und ziehen wir genau so viel nach?','How much got finished since last time — and are we pulling exactly that much?'],
                ['Was von dem, was wir reinziehen, würde niemandem fehlen, wenn wir es lassen?','What of the work we pull in would nobody miss if we dropped it?'],
                ['Wer außerhalb des Teams muss zustimmen, damit das fertig werden kann?','Who outside the team must agree for this to get finished?']] },
      { id:'review', ic:'✅', n:['Review / Delivery','Review / delivery'], kad:['alle 2 Wochen · 45 Min','every 2 weeks · 45 min'], box:45,
        wer:['Team + PO + echte Nutzer:innen oder Stakeholder','Team + PO + real users or stakeholders'],
        zweck:['Nicht Fleiß vorführen, sondern Wirkung prüfen: Was ist fertig, was nutzt es, und was lernen wir daraus fürs Nächste?',
               'Not a diligence show but an impact check: what is done, what does it do for users, what do we learn for what comes next?'],
        agenda:[[10,['Zeigen, was wirklich fertig ist (Definition of Done, nicht „fast")','Show what is really done (definition of done, not "almost")']],
                [15,['Rückmeldung der Nutzer:innen einsammeln — ungefiltert','Collect user feedback — unfiltered']],
                [10,['Was ist NICHT fertig geworden und warum?','What did NOT get finished, and why?']],
                [10,['Konsequenz: was ändern wir an Reihenfolge oder Zuschnitt?','Consequence: what do we change in order or slicing?']]],
        fragen:[['Was davon hat jemand außerhalb des Teams schon benutzt?','What of this has someone outside the team actually used?'],
                ['Wo lagen wir mit unserer Annahme daneben — und was hat es gekostet?','Where was our assumption wrong — and what did it cost?'],
                ['Was war zu groß geschnitten, um in einem Stück fertig zu werden?','What was sliced too big to get finished in one piece?']] },
      { id:'flow', ic:'🌊', n:['Flow Review','Flow review'], kad:['alle 2–4 Wochen · 60 Min','every 2–4 weeks · 60 min'], box:60,
        wer:['Team + Coach (Zahlen ansehen, nicht bewerten)','Team + coach (look at numbers, don\'t judge people)'],
        zweck:['Der Blick auf das System statt auf die Tickets: Wo staut sich Arbeit, wo wartet sie, und welches EINE Experiment probieren wir bis zum nächsten Mal?',
               'Look at the system instead of the tickets: where does work pile up, where does it wait, and which ONE experiment do we try until next time?'],
        agenda:[[10,['Zahlen gemeinsam lesen: WIP, Lead Time, Durchsatz','Read the numbers together: WIP, lead time, throughput']],
                [15,['Ausreißer ansehen: die drei ältesten Tickets, was ist deren Geschichte?','Look at outliers: the three oldest tickets — what is their story?']],
                [15,['Wartezeiten suchen: wo liegt Arbeit ohne Bearbeitung?','Hunt for waiting time: where does work lie untouched?']],
                [10,['Ein Experiment beschließen — mit Datum und Messgröße','Decide one experiment — with a date and a measure']],
                [10,['Was hat das letzte Experiment gebracht?','What did the last experiment achieve?']]],
        fragen:[['Wo verbringt unsere Arbeit die meiste Zeit mit Warten?','Where does our work spend most of its time waiting?'],
                ['Welches WIP-Limit würde weh tun — und genau deshalb helfen?','Which WIP limit would hurt — and help precisely for that reason?'],
                ['Was war unser letztes Experiment, und woran haben wir gemerkt, ob es wirkt?','What was our last experiment, and how did we notice whether it worked?']] }
      ]},
    fl2: {
      lbl: ['FL2 · Koordination','FL2 · coordination'],
      sub: ['Zwischen den Teams — Abhängigkeiten, Reihenfolge, Ende-zu-Ende-Fluss','Between the teams — dependencies, sequence, end-to-end flow'],
      m: [
      { id:'daily', ic:'🔗', n:['Koordinations-Sync','Coordination sync'], kad:['2×/Woche · 20 Min','twice a week · 20 min'], box:20,
        wer:['Je eine Person pro Team, die entscheiden darf','One person per team — one who may decide'],
        zweck:['Das FL2-Gegenstück zum Daily: nicht was jedes Team macht, sondern wo die Arbeit ZWISCHEN den Teams hängt.',
               'The FL2 counterpart to the daily: not what each team is doing, but where work is stuck BETWEEN teams.'],
        agenda:[[5,['Neue und eskalierte Abhängigkeiten benennen','Name new and escalated dependencies']],
                [8,['Für jede: wer wartet auf wen, seit wann, was kostet es?','For each: who waits for whom, since when, what does it cost?']],
                [5,['Eine Kopplung heute lösen — verbindlich mit Namen','Resolve one coupling today — with a name attached']],
                [2,['Was muss FL3 wissen (Eskalation)?','What does FL3 need to know (escalation)?']]],
        fragen:[['Welche Abhängigkeit blockiert den größten Wert — nicht den lautesten Termin?','Which dependency blocks the biggest value — not the loudest deadline?'],
                ['Seit wann wartet dieses Team schon, und hat das jemand gemerkt?','How long has this team been waiting — and did anyone notice?'],
                ['Welche Kopplung könnten wir dauerhaft auflösen statt wöchentlich zu verwalten?','Which coupling could we dissolve for good instead of managing it weekly?']] },
      { id:'plan', ic:'🗺️', n:['Programm-Planung','Program planning'], kad:['alle 2 Wochen · 60 Min','every 2 weeks · 60 min'], box:60,
        wer:['POs der Teams + Programm-Verantwortung','Team POs + program ownership'],
        zweck:['Reihenfolge über Teams hinweg festlegen: Was startet als Nächstes, was startet bewusst NICHT — und welche Abhängigkeit muss vorher weg?',
               'Set the sequence across teams: what starts next, what deliberately does NOT start — and which dependency must be cleared first.'],
        agenda:[[10,['Was ist Ende-zu-Ende fertig geworden?','What got finished end to end?']],
                [15,['Kandidaten mit WSJF sortieren — nicht nach Lautstärke','Sort candidates by WSJF — not by volume']],
                [20,['Für die Top-Kandidaten: Abhängigkeiten vorab klären','For the top candidates: clear dependencies up front']],
                [15,['Programm-WIP begrenzen: was starten wir NICHT?','Limit program WIP: what do we NOT start?']]],
        fragen:[['Welches Feature startet, obwohl seine Abhängigkeit ungeklärt ist?','Which feature is starting although its dependency is unresolved?'],
                ['Was steht seit dem letzten Mal unverändert im Programm — und warum?','What has been sitting unchanged in the program since last time — and why?'],
                ['Wenn wir nur die Hälfte starten dürften: welche Hälfte?','If we were allowed to start only half: which half?']] },
      { id:'review', ic:'🏁', n:['Programm-Review','Program review'], kad:['alle 4 Wochen · 60 Min','every 4 weeks · 60 min'], box:60,
        wer:['Teams + Stakeholder + Programm-Verantwortung','Teams + stakeholders + program ownership'],
        zweck:['Ergebnisse über Teamgrenzen hinweg zeigen: Funktioniert die Kette am Stück — oder nur jedes Glied für sich?',
               'Show results across team boundaries: does the chain work as a whole — or only each link on its own?'],
        agenda:[[20,['Ende-zu-Ende zeigen (ein Weg durch mehrere Teams)','Show end to end (one path across several teams)']],
                [15,['Was ist an Übergaben verloren gegangen?','What got lost at the handovers?']],
                [15,['Rückmeldung der Stakeholder — und was sie NICHT gesagt haben','Stakeholder feedback — and what they did NOT say']],
                [10,['Was ändern wir an der Zusammenarbeit, nicht an den Menschen?','What do we change in the collaboration, not in the people?']]],
        fragen:[['An welcher Übergabe hat die Arbeit am längsten gewartet?','At which handover did the work wait the longest?'],
                ['Was hätte ein Team allein gar nicht liefern können?','What could no single team have delivered alone?'],
                ['Welche Zusage zwischen Teams wurde gebrochen — und was hat das ausgelöst?','Which cross-team commitment was broken — and what did that trigger?']] },
      { id:'flow', ic:'🌊', n:['Programm-Flow-Review','Program flow review'], kad:['monatlich · 60 Min','monthly · 60 min'], box:60,
        wer:['Programm-Verantwortung + Coaches + je Team eine Stimme','Program ownership + coaches + one voice per team'],
        zweck:['Der Blick auf den Fluss zwischen den Teams: Wieviel ist gleichzeitig offen, wo staut es sich, und wie lange dauert der Weg durch das ganze System?',
               'The look at flow between teams: how much is open in parallel, where does it pile up, and how long is the path through the whole system?'],
        agenda:[[15,['Programm-WIP und Durchsatz über alle Teams','Program WIP and throughput across all teams']],
                [15,['Abhängigkeits-Muster: welche Paare tauchen immer wieder auf?','Dependency patterns: which pairs keep coming back?']],
                [15,['Alterung: welche Features liegen seit dem letzten PI?','Ageing: which features have been around since the last PI?']],
                [15,['Ein System-Experiment beschließen (Struktur, nicht Fleiß)','Decide one system experiment (structure, not effort)']]],
        fragen:[['Wieviele Features sind gleichzeitig angefangen — und wieviele werden pro Monat fertig?','How many features are started in parallel — and how many finish per month?'],
                ['Welche zwei Teams hängen strukturell aneinander, ohne dass es jemand entschieden hat?','Which two teams are structurally coupled without anyone having decided it?'],
                ['Was würde passieren, wenn wir vier Wochen lang nichts Neues starten?','What would happen if we started nothing new for four weeks?']] }
      ]},
    fl3: {
      lbl: ['FL3 · Strategie','FL3 · strategy'],
      sub: ['Woran arbeiten wir überhaupt — und warum jetzt?','What are we working on at all — and why now?'],
      m: [
      { id:'daily', ic:'🧭', n:['Strategie-Sync','Strategy sync'], kad:['alle 2 Wochen · 30 Min','every 2 weeks · 30 min'], box:30,
        wer:['Leitung + Programm-Verantwortung','Leadership + program ownership'],
        zweck:['Das kurze Format auf FL3: Hat sich an den Annahmen etwas geändert — Markt, Regulatorik, Personen, Technik? Und muss deshalb etwas gestoppt werden?',
               'The short FL3 format: has anything changed in our assumptions — market, regulation, people, technology? And does something have to stop because of it?'],
        agenda:[[8,['Was hat sich außen verändert seit dem letzten Mal?','What changed on the outside since last time?']],
                [10,['Welche Objectives sind dadurch in Gefahr — oder überflüssig?','Which objectives are endangered by that — or obsolete?']],
                [8,['Entscheidungen, die auf uns warten (und wer sie trifft)','Decisions waiting on us (and who makes them)']],
                [4,['Was geben wir nach unten weiter — in einem Satz','What we pass down — in one sentence']]],
        fragen:[['Welche Annahme, auf der ein Objective steht, gilt heute nicht mehr?','Which assumption behind an objective no longer holds today?'],
                ['Was läuft weiter, obwohl der Grund dafür weggefallen ist?','What keeps running although the reason for it has gone?'],
                ['Welche Entscheidung schieben wir seit mehr als zwei Wochen?','Which decision have we been postponing for more than two weeks?']] },
      { id:'plan', ic:'🎯', n:['Strategie-Planung','Strategy planning'], kad:['quartalsweise · 3 Std','quarterly · 3 hrs'], box:180,
        wer:['Leitung + Programm + Vertretung der Teams','Leadership + program + team representation'],
        zweck:['Ziele setzen, die man auch verfehlen kann — und dafür anderes ausdrücklich streichen. Weniger Objectives, ehrlicher formuliert.',
               'Set goals you can actually miss — and explicitly cut other things for them. Fewer objectives, more honestly worded.'],
        agenda:[[30,['Rückblick: was hat das letzte Quartal wirklich bewegt?','Look back: what really moved last quarter?']],
                [45,['Objectives formulieren — Outcome, nicht Projektliste','Formulate objectives — outcome, not a project list']],
                [45,['Key Results messbar machen (woran merken wir es?)','Make key results measurable (how will we notice?)']],
                [30,['Die Streichliste: was hört auf, damit das Platz hat?','The stop list: what ends so this has room?']],
                [30,['Aufhängen an FL2: welche Features zahlen darauf ein?','Hook into FL2: which features contribute to this?']]],
        fragen:[['Woran würden wir in drei Monaten merken, dass wir das Ziel verfehlt haben?','How would we notice in three months that we missed the goal?'],
                ['Welches laufende Vorhaben zahlt auf KEIN Objective ein?','Which ongoing initiative contributes to NO objective?'],
                ['Was haben wir gestrichen — und wer hat das Gestrichene erfahren?','What did we cut — and who was told about the cut?']] },
      { id:'review', ic:'📊', n:['OKR-Check-in / Strategie-Review','OKR check-in / strategy review'], kad:['alle 2–4 Wochen · 60 Min','every 2–4 weeks · 60 min'], box:60,
        wer:['Objective-Verantwortliche + Leitung','Objective owners + leadership'],
        zweck:['Konfidenz ehrlich bewerten statt Fortschritt zu behaupten. Rot ist ein Hilferuf, kein Versagen — und muss eine Konsequenz haben.',
               'Rate confidence honestly instead of claiming progress. Red is a call for help, not a failure — and it must have a consequence.'],
        agenda:[[15,['Jedes KR: Ampel und Konfidenz in Prozent','Each KR: traffic light and confidence in percent']],
                [20,['Bei Rot und Gelb: was genau fehlt — und wer kann helfen?','For red and yellow: what exactly is missing — and who can help?']],
                [15,['Widerspruch prüfen: Konfidenz gegen Flusszahlen halten','Check the contradiction: hold confidence against the flow numbers']],
                [10,['Konsequenzen beschließen — auch das Streichen','Decide consequences — including cutting things']]],
        fragen:[['Worauf stützt sich diese Konfidenz — Daten oder Hoffnung?','What is this confidence based on — data or hope?'],
                ['Welches KR ist seit Wochen gelb und niemand hat etwas geändert?','Which KR has been yellow for weeks with nobody changing anything?'],
                ['Was müsste passieren, damit wir ein Objective mitten im Quartal beenden?','What would have to happen for us to end an objective mid-quarter?']] },
      { id:'flow', ic:'🌊', n:['Strategischer Flow Review','Strategic flow review'], kad:['quartalsweise · 90 Min','quarterly · 90 min'], box:90,
        wer:['Leitung + Coaches','Leadership + coaches'],
        zweck:['Kommt Strategie überhaupt unten an? Der Blick auf den Weg vom Objective bis zur ersten Auslieferung — und auf das, was auf dem Weg verhungert.',
               'Does strategy actually arrive at the bottom? Look at the path from objective to first delivery — and at what starves on the way.'],
        agenda:[[20,['Wie lange dauert es vom Objective bis zur ersten Auslieferung?','How long from objective to first delivery?']],
                [20,['Wieviele Objectives laufen gleichzeitig — und wieviele wurden fertig?','How many objectives run in parallel — and how many finished?']],
                [25,['Wo versickert Strategie: welche Ziele haben keine Arbeit im System?','Where does strategy evaporate: which goals have no work in the system?']],
                [25,['Eine Struktur-Entscheidung treffen, keine Appelle','Take one structural decision, no appeals']]],
        fragen:[['Wieviele Objectives laufen gleichzeitig — und wieviele haben wir je zu Ende gebracht?','How many objectives run in parallel — and how many have we ever finished?'],
                ['Welches Ziel hat seit einem Quartal keine einzige Karte im System?','Which goal has had not a single card in the system for a quarter?'],
                ['Woran scheitert Strategie bei uns zuverlässig — Prioritäten, Kapazität oder Klarheit?','Where does strategy reliably fail here — priorities, capacity or clarity?']] }
      ]}
  };

  /* ---------- Besser werden: Vorschläge aus EUREN Zahlen ----------
     Erst die datengetriebenen (die treffen), dann die formatspezifischen Klassiker. */
  function tips(level, id, f){
    const r = f.raw, out = [];
    const S = setg();
    if (level === 'fl1'){
      if (r.inv != null && r.inv > 3) out.push([
        `Bestand von rund ${(Math.round(r.inv*10)/10).toString().replace('.',',')} Wochen: setzt ein WIP-Limit knapp unter den heutigen Wert (${r.wip}) und zieht erst nach, wenn etwas fertig ist.`,
        `Inventory of about ${(Math.round(r.inv*10)/10)} weeks: set a WIP limit just below today's value (${r.wip}) and only pull when something is finished.`]);
      if (r.p50 != null && r.p50 >= (S.ltYellow||20)) out.push([
        `Lead Time p50 bei ${r.p50} Tagen: markiert eine Woche lang jede Karte, die liegt, ohne dass jemand daran arbeitet — die Wartezeit ist fast immer größer als die Arbeitszeit.`,
        `Lead time p50 at ${r.p50} days: for one week, mark every card that sits without anyone working on it — waiting time is nearly always bigger than working time.`]);
      if (r.deps > 0) out.push([
        `${r.deps} Abhängigkeit${r.deps>1?'en':''}: nehmt die teuerste mit ins FL2-Sync statt sie im Team zu verwalten.`,
        `${r.deps} dependenc${r.deps>1?'ies':'y'}: take the most expensive one into the FL2 sync instead of managing it inside the team.`]);
      if (r.obj != null && r.pred != null && r.obj - r.pred > 15) out.push([
        `OKR-Konfidenz (${r.obj} %) liegt deutlich über der Predictability (${r.pred} %) — vergleicht beim nächsten Check-in beide Zahlen nebeneinander.`,
        `OKR confidence (${r.obj}%) sits well above predictability (${r.pred}%) — put both numbers side by side at the next check-in.`]);
      if (id === 'daily') out.push([
        'Dreht das Daily um: von rechts nach links am Board. Wer mit „was habe ich gestern gemacht" anfängt, redet über Menschen statt über Arbeit.',
        'Turn the daily around: right to left along the board. Starting with "what did I do yesterday" talks about people instead of work.']);
      if (id === 'plan') out.push([
        'Nachschub nur so viel, wie fertig geworden ist — die einfachste Form eines WIP-Limits, die kein Werkzeug braucht.',
        'Replenish only as much as got finished — the simplest form of a WIP limit, and it needs no tooling.']);
      if (id === 'review') out.push([
        'Ladet eine echte Nutzerin ein, nicht nur die Vertretung der Nutzerin. Ein einziger echter Satz ersetzt zehn Vermutungen.',
        'Invite an actual user, not only the user\'s proxy. One real sentence replaces ten assumptions.']);
      if (id === 'flow') out.push([
        'Ein Experiment pro Flow Review — mehr merkt sich niemand, und mehr lässt sich nicht auseinanderhalten.',
        'One experiment per flow review — nobody remembers more, and more cannot be told apart.']);
    }
    if (level === 'fl2'){
      if (r.deps >= 4) out.push([
        `${r.deps} offene Abhängigkeiten: führt eine feste Liste mit „wer wartet auf wen seit wann" — Alter macht den Schmerz sichtbar, Anzahl nicht.`,
        `${r.deps} open dependencies: keep a fixed list of "who waits for whom since when" — age makes the pain visible, count does not.`]);
      if (r.feat && r.act > r.teams * 2) out.push([
        `${r.act} Features gleichzeitig aktiv bei ${r.teams} Teams: begrenzt das Programm-WIP, sonst wird jede Reihenfolge im Alltag wieder aufgelöst.`,
        `${r.act} features active in parallel across ${r.teams} teams: limit program WIP, otherwise any sequence dissolves again in daily business.`]);
      if (r.feat && r.wsjf/r.feat < 0.7) out.push([
        `Nur ${Math.round(r.wsjf/r.feat*100)} % der Features haben WSJF: ohne Priorisierungsgröße entscheidet im Zweifel die Lautstärke.`,
        `Only ${Math.round(r.wsjf/r.feat*100)}% of features have WSJF: without a prioritisation measure, volume decides in case of doubt.`]);
      if (r.live < r.teams) out.push([
        `${r.teams - r.live} Team${(r.teams-r.live)>1?'s':''} ohne Live-Daten: solange die fehlen, ist das Programm-Board eine Meinung, kein Bild.`,
        `${r.teams - r.live} team${(r.teams-r.live)>1?'s':''} without live data: as long as they are missing, the program board is an opinion, not a picture.`]);
      if (id === 'daily') out.push([
        'Ins Koordinations-Sync gehört pro Team jemand, der entscheiden darf. Sonst wird aus 20 Minuten eine Sammelstelle für Rückfragen.',
        'The coordination sync needs one person per team who may decide. Otherwise 20 minutes turn into a collection point for follow-up questions.']);
      if (id === 'plan') out.push([
        'Klärt Abhängigkeiten VOR dem Start, nicht beim Auftreten — danach kostet dieselbe Klärung ein Vielfaches.',
        'Clear dependencies BEFORE the start, not when they surface — afterwards the same clarification costs a multiple.']);
      if (id === 'review') out.push([
        'Zeigt einen Weg quer durch mehrere Teams statt vier getrennte Team-Demos. Nur so sieht man die Übergaben.',
        'Show one path across several teams instead of four separate team demos. Only that makes the handovers visible.']);
      if (id === 'flow') out.push([
        'Sucht wiederkehrende Team-Paare in den Abhängigkeiten — dieselbe Kopplung jeden Monat ist eine Frage der Struktur, nicht der Disziplin.',
        'Look for recurring team pairs in the dependencies — the same coupling every month is a question of structure, not discipline.']);
    }
    if (level === 'fl3'){
      if (r.kr && r.rated < r.kr) out.push([
        `${r.kr - r.rated} von ${r.kr} Key Results sind unbewertet: unbewertete KRs sind keine neutralen KRs, sie sind unsichtbare Risiken.`,
        `${r.kr - r.rated} of ${r.kr} key results are unrated: unrated KRs are not neutral KRs, they are invisible risks.`]);
      if (r.konf != null && r.konf >= (S.okrGreen||70) && r.r === 0) out.push([
        `Alles grün und kein rotes KR: prüft, ob eure Ziele überhaupt verfehlbar waren — nicht verfehlbare Ziele steuern nichts.`,
        `All green and no red KR: check whether your goals were missable at all — goals that cannot be missed steer nothing.`]);
      if (r.objs > 5) out.push([
        `${r.objs} Objectives gleichzeitig: fokussiert auf drei. Mehr Ziele heißt nicht mehr Richtung, sondern weniger.`,
        `${r.objs} objectives in parallel: focus on three. More goals does not mean more direction, it means less.`]);
      if (id === 'review') out.push([
        'Bewertet Konfidenz, nicht Fortschritt in Prozent. „Wie sicher sind wir, dass wir es schaffen?" ist die ehrlichere Frage.',
        'Rate confidence, not percentage progress. "How sure are we we will make it?" is the more honest question.']);
      if (id === 'plan') out.push([
        'Zu jedem neuen Objective gehört eine Streichung. Ohne Streichliste ist Priorisierung nur ein Wunschzettel.',
        'Every new objective comes with a cut. Without a stop list, prioritisation is just a wish list.']);
      if (id === 'daily') out.push([
        'Das FL3-Sync ist für Annahmen da, nicht für Statusfolien. Wenn niemand etwas Neues weiß, ist es in fünf Minuten vorbei — das ist ein gutes Ergebnis.',
        'The FL3 sync is for assumptions, not status slides. If nobody knows anything new it is over in five minutes — that is a good outcome.']);
      if (id === 'flow') out.push([
        'Messt die Zeit vom beschlossenen Objective bis zur ersten Auslieferung. Diese eine Zahl sagt mehr über eure Strategiefähigkeit als jedes Portfolio-Board.',
        'Measure the time from decided objective to first delivery. That single number says more about your strategic capability than any portfolio board.']);
    }
    return out.slice(0, 4);
  }

  /* ---------- Notizen (nur lokal, je Format) ---------- */
  const NKEY = 'pbMeetNotes';
  function notesAll(){ try{ return JSON.parse(localStorage.getItem(NKEY)||'{}'); }catch(e){ return {}; } }
  function notesGet(k){ return notesAll()[k] || {be:'', ex:'', ts:''}; }
  function notesSet(k, be, ex){
    const a = notesAll();
    a[k] = { be, ex, ts: new Date().toISOString().slice(0,16).replace('T',' ') };
    try{ localStorage.setItem(NKEY, JSON.stringify(a)); }catch(e){}
    return a[k].ts;
  }

  /* ---------- Timebox ---------- */
  const TB = { t:null, left:0, run:false };
  function tbPaint(){
    const el = document.getElementById('pbmTime'); if(!el) return;
    const m = Math.floor(Math.abs(TB.left)/60), s = Math.abs(TB.left)%60;
    el.textContent = (TB.left<0?'-':'') + m + ':' + String(s).padStart(2,'0');
    el.style.color = TB.left < 0 ? '#ff5630' : (TB.left < 120 ? '#ffab00' : '');
    const b = document.getElementById('pbmTimeBtn'); if(b) b.textContent = TB.run ? '⏸' : '▶';
  }
  function tbStop(){ if(TB.t){ clearInterval(TB.t); TB.t=null; } TB.run=false; }
  function tbToggle(){
    if(TB.run){ tbStop(); tbPaint(); return; }
    TB.run = true;
    TB.t = setInterval(()=>{ TB.left--; tbPaint(); }, 1000);
    tbPaint();
  }
  function tbSet(min){ tbStop(); TB.left = min*60; tbPaint(); }

  /* ---------- Maske ---------- */
  let CUR = { lv:null, id:null };
  function close(){ tbStop(); const o=document.getElementById('pbmOv'); if(o) o.remove(); }
  function open(lv, id){
    lv = lv || ctxLevel();
    if(!M[lv]) lv = 'fl2';
    id = id || (CUR.lv === lv && CUR.id) || 'daily';
    CUR = {lv, id};
    let ov = document.getElementById('pbmOv');
    if(!ov){
      ov = document.createElement('div'); ov.className='pbmov'; ov.id='pbmOv';
      ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
      document.body.appendChild(ov);
      document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown', esc); } });
    }
    ov.innerHTML = render(lv, id);
    wire(lv, id);
  }
  function render(lv, id){
    const L = M[lv], mt = L.m.find(x=>x.id===id) || L.m[0];
    const f = facts(lv), tp = tips(lv, mt.id, f);
    const lvTabs = ['fl1','fl2','fl3'].map(k =>
      `<span class="pbmlv${k===lv?' act':''}" data-lv="${k}">${T(M[k].lbl)}</span>`).join('');
    const mTabs = L.m.map(x =>
      `<span class="pbmt${x.id===mt.id?' act':''}" data-m="${x.id}">${x.ic} ${T(x.n)}</span>`).join('');
    const nums = f.num.length
      ? `<div class="pbmnums">${f.num.map(n=>{
          const lab = Array.isArray(n[0]) ? T(n[0]) : (LANG==='en' ? n[1] : n[0]);
          return `<div class="pbmnum ${n[3]}"><div class="l">${esc(lab)}</div><div class="v">${esc(n[2])}</div><div class="h">${esc(T(n[4]))}</div></div>`;
        }).join('')}</div>`
      : `<div class="pbmhint">${T(['Auf dieser Seite sind keine Team-Daten geladen — öffnet das Cockpit oder das Programm Board, dann stehen hier eure Zahlen.',
          'No team data is loaded on this page — open the cockpit or the program board and your numbers will appear here.'])}</div>`;
    const nt = notesGet(lv+':'+mt.id);
    const teamLine = lv === 'fl1' && f.team ? ` · ${esc(f.team)}` : '';
    return `<div class="pbm" role="dialog" aria-label="${esc(T(mt.n))}">
      <div class="pbmh">
        <span class="x" id="pbmX">✕</span>
        <div class="pbmlvs">${lvTabs}</div>
        <h3>${mt.ic} ${esc(T(mt.n))}</h3>
        <div class="s">${esc(T(L.sub))}${teamLine} · ${esc(T(mt.kad))}</div>
      </div>
      <div class="pbmtabs">${mTabs}</div>
      <div class="pbmbody">
        <div class="pbmsec"><b>${T(['Wozu','Purpose'])}</b><p>${esc(T(mt.zweck))}</p>
          <div class="pbmwer">👥 ${esc(T(mt.wer))}</div></div>

        <div class="pbmsec"><b>${T(['Eure Zahlen jetzt','Your numbers right now'])}</b>${nums}</div>

        <div class="pbmsec"><b>${T(['Ablauf','Agenda'])}</b>
          <div class="pbmbox"><span id="pbmTime">${mt.box}:00</span>
            <span class="tb" id="pbmTimeBtn">▶</span>
            <span class="tb" id="pbmTimeRst">↺</span>
            <span class="tbl">${T(['Timebox','Timebox'])} ${mt.box} ${T(['Min','min'])}</span></div>
          <ol class="pbmag">${mt.agenda.map(a=>`<li><span class="mi">${a[0]}'</span>${esc(T(a[1]))}</li>`).join('')}</ol></div>

        <div class="pbmsec"><b>${T(['Die 3 Fragen','The 3 questions'])}</b>
          <div class="pbmq3">${mt.fragen.map((q,i)=>`<div class="pbmq"><span class="n">${i+1}</span><span class="t">${esc(T(q))}</span>
            ${HASBUDDY() ? `<span class="ask" data-ask="${esc(T(q))}" title="${T([`Mit ${BUDDY()} besprechen`,`Discuss with ${BUDDY()}`])}">💬</span>` : ``}</div>`).join('')}</div></div>

        <div class="pbmsec"><b>${T(['Besser werden','Getting better'])}</b>
          <div class="pbmtips">${tp.length ? tp.map(t=>`<div class="pbmtip">${T(t)}</div>`).join('')
            : `<div class="pbmtip">${T(['Eure Zahlen geben gerade keinen Hinweis her — dann ist die beste Verbesserung, das Format überhaupt regelmäßig zu machen.','Your numbers give no hint right now — then the best improvement is simply running this format regularly.'])}</div>`}</div></div>

        <div class="pbmsec"><b>${T(['Ergebnis festhalten','Capture the outcome'])}</b>
          <textarea id="pbmBe" rows="3" placeholder="${T(['Beschluss / was wir gesehen haben …','Decision / what we saw …'])}">${esc(nt.be)}</textarea>
          <input id="pbmEx" placeholder="${T(['Ein Experiment bis zum nächsten Mal …','One experiment until next time …'])}" value="${esc(nt.ex)}">
          <div class="pbmsave"><span class="btn" id="pbmSave">${T(['Speichern','Save'])}</span>
            <span class="btn ghost" id="pbmCopy">${T(['Als Notiz kopieren','Copy as note'])}</span>
            ${HASBUDDY() ? `<span class="btn ghost" id="pbmBuddy">${T([`Mit ${BUDDY()} vorbereiten`,`Prepare with ${BUDDY()}`])}</span>` : ``}
            <span class="ts" id="pbmTs">${nt.ts ? T(['zuletzt','last']) + ' ' + esc(nt.ts) : ''}</span></div>
          <div class="pbmnote">${T(['Notizen bleiben lokal in diesem Browser — nichts wird gesendet.','Notes stay local in this browser — nothing is sent.'])}</div></div>
      </div></div>`;
  }
  function plain(lv, id){
    const L = M[lv], mt = L.m.find(x=>x.id===id), f = facts(lv), tp = tips(lv, id, f), nt = notesGet(lv+':'+id);
    const li = [];
    li.push(T(mt.n) + ' — ' + T(L.lbl) + (f.team ? ' · ' + f.team : ''));
    li.push(new Date().toLocaleDateString(LANG==='en'?'en-GB':'de-DE') + ' · ' + T(mt.kad));
    li.push(''); li.push(T(['Wozu','Purpose']) + ': ' + T(mt.zweck));
    if (f.num.length){ li.push(''); li.push(T(['Zahlen','Numbers']) + ':');
      f.num.forEach(n => li.push('  - ' + (Array.isArray(n[0]) ? T(n[0]) : (LANG==='en'?n[1]:n[0])) + ': ' + n[2])); }
    li.push(''); li.push(T(['Ablauf','Agenda']) + ':');
    mt.agenda.forEach(a => li.push('  ' + a[0] + "' " + T(a[1])));
    li.push(''); li.push(T(['Die 3 Fragen','The 3 questions']) + ':');
    mt.fragen.forEach((q,i) => li.push('  ' + (i+1) + '. ' + T(q)));
    if (tp.length){ li.push(''); li.push(T(['Besser werden','Getting better']) + ':'); tp.forEach(t => li.push('  - ' + T(t))); }
    if (nt.be || nt.ex){ li.push('');
      if (nt.be) li.push(T(['Beschluss','Decision']) + ': ' + nt.be);
      if (nt.ex) li.push(T(['Experiment','Experiment']) + ': ' + nt.ex); }
    return li.join('\n');
  }
  function wire(lv, id){
    const mt = M[lv].m.find(x=>x.id===id) || M[lv].m[0];
    tbSet(mt.box);
    const on = (sel, fn, ev) => { const n = document.querySelector(sel); if(n) n.addEventListener(ev||'click', fn); };
    on('#pbmX', close);
    document.querySelectorAll('.pbmlv').forEach(n => n.addEventListener('click', ()=>open(n.dataset.lv, null)));
    document.querySelectorAll('.pbmt').forEach(n => n.addEventListener('click', ()=>open(lv, n.dataset.m)));
    on('#pbmTimeBtn', tbToggle);
    on('#pbmTimeRst', ()=>tbSet(mt.box));
    on('#pbmSave', ()=>{
      const ts = notesSet(lv+':'+id, document.getElementById('pbmBe').value.trim(), document.getElementById('pbmEx').value.trim());
      const t = document.getElementById('pbmTs'); if(t) t.textContent = T(['gespeichert','saved']) + ' ' + ts;
    });
    on('#pbmCopy', ()=>{
      const txt = plain(lv, id), b = document.getElementById('pbmCopy');
      const done = ok => { b.textContent = ok ? '✔ ' + T(['kopiert','copied']) : T(['Kopieren ging nicht','Copy failed']);
        setTimeout(()=>{ b.textContent = T(['Als Notiz kopieren','Copy as note']); }, 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>done(true), ()=>done(false));
      else done(false);
    });
    on('#pbmBuddy', ()=>{
      const q = T(['Wir machen gleich ein ','We are about to run a ']) + T(mt.n) + T([' auf ',' on ']) + T(M[lv].lbl) + T(['. Worauf sollen wir bei unseren Zahlen besonders achten?','. What should we watch for in our numbers?']);
      close(); if (window.pbFlow && pbFlow.open) pbFlow.open(q); else alert(q);
    });
    document.querySelectorAll('.pbmq .ask').forEach(n => n.addEventListener('click', ()=>{
      const q = n.dataset.ask; close(); if (window.pbFlow && pbFlow.open) pbFlow.open(q);
    }));
  }

  /* ---------- Styles ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .pbmov{position:fixed;inset:0;z-index:150;background:rgba(6,8,20,.55);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
  .pbm{background:var(--card,#fff);color:var(--ink,#151515);width:720px;max-width:100%;max-height:92vh;overflow:auto;border-radius:16px;
    box-shadow:0 24px 70px rgba(0,0,0,.34);font-family:inherit;font-size:13px;line-height:1.55}
  .pbmh{background:linear-gradient(135deg,#1a44ea,#0f2ec2);color:#fff;padding:14px 20px 16px;position:relative}
  .pbmh h3{margin:8px 0 0;font-size:19px;letter-spacing:-.2px}
  .pbmh .s{font-size:12px;opacity:.9;margin-top:3px}
  .pbmh .x{position:absolute;right:14px;top:12px;cursor:pointer;font-size:19px;opacity:.85}
  .pbmlvs{display:flex;gap:6px;flex-wrap:wrap}
  .pbmlv{font-size:11px;font-weight:700;padding:4px 11px;border-radius:13px;cursor:pointer;background:rgba(255,255,255,.16);color:#fff}
  .pbmlv.act{background:#fff;color:#0f2ec2}
  .pbmtabs{display:flex;gap:6px;flex-wrap:wrap;padding:12px 20px;border-bottom:1px solid var(--line,#e6e8ec)}
  .pbmt{font-size:12px;font-weight:600;padding:6px 12px;border-radius:14px;cursor:pointer;border:1px solid var(--line,#d8d8db);color:var(--sub,#6b6d70)}
  .pbmt.act{background:#1a44ea;border-color:#1a44ea;color:#fff}
  .pbmbody{padding:4px 20px 20px}
  .pbmsec{margin-top:16px}
  .pbmsec>b{display:block;font-size:10.5px;letter-spacing:.7px;text-transform:uppercase;color:var(--sub,#6b6d70);margin-bottom:6px}
  .pbmsec p{margin:0}
  .pbmwer{margin-top:6px;font-size:12px;color:var(--sub,#6b6d70)}
  .pbmhint{font-size:12.5px;color:var(--sub,#6b6d70);background:var(--bg,#f4f6fd);border-radius:10px;padding:10px 12px}
  .pbmnums{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
  .pbmnum{border:1px solid var(--line,#e6e8ec);border-left-width:4px;border-radius:10px;padding:8px 11px}
  .pbmnum.green{border-left-color:#36b37e}.pbmnum.yellow{border-left-color:#ffab00}
  .pbmnum.red{border-left-color:#ff5630}.pbmnum.grey{border-left-color:#97a0af}
  .pbmnum .l{font-size:10.5px;letter-spacing:.4px;text-transform:uppercase;color:var(--sub,#6b6d70)}
  .pbmnum .v{font-size:21px;font-weight:800;letter-spacing:-.4px;margin:1px 0}
  .pbmnum .h{font-size:11px;color:var(--sub,#6b6d70);line-height:1.4}
  .pbmbox{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .pbmbox #pbmTime{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;min-width:66px}
  .pbmbox .tb{cursor:pointer;border:1px solid var(--line,#d8d8db);border-radius:8px;padding:3px 9px;font-size:12px}
  .pbmbox .tbl{font-size:11.5px;color:var(--sub,#6b6d70)}
  .pbmag{margin:0;padding-left:0;list-style:none}
  .pbmag li{display:flex;gap:9px;padding:5px 0;border-bottom:1px dashed var(--line,#e6e8ec)}
  .pbmag .mi{flex:0 0 34px;font-weight:800;color:var(--brand-dark,#0f2ec2);font-variant-numeric:tabular-nums}
  .pbmq{display:flex;gap:9px;align-items:flex-start;background:var(--bg,#f7f9fe);border-radius:10px;padding:9px 11px;margin-bottom:6px}
  .pbmq .n{flex:0 0 20px;height:20px;border-radius:50%;background:#1a44ea;color:#fff;font-size:11px;font-weight:800;text-align:center;line-height:20px}
  .pbmq .t{flex:1;font-size:13.5px}
  .pbmq .ask{cursor:pointer;opacity:.55;font-size:14px}
  .pbmq .ask:hover{opacity:1}
  .pbmtip{border-left:3px solid #36b37e;background:var(--bg,#f4fff9);border-radius:8px;padding:8px 11px;margin-bottom:6px;font-size:12.5px}
  .pbm textarea,.pbm input{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--line,#d8d8db);border-radius:9px;
    font-family:inherit;font-size:12.5px;margin-bottom:7px;background:transparent;color:inherit;resize:vertical}
  .pbmsave{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .pbmsave .btn{cursor:pointer;background:#1a44ea;color:#fff;border-radius:9px;padding:7px 14px;font-weight:700;font-size:12px}
  .pbmsave .btn.ghost{background:transparent;color:var(--brand-dark,#0f2ec2);border:1px solid var(--line,#d8d8db)}
  .pbmsave .ts{font-size:11px;color:var(--sub,#97a0af)}
  .pbmnote{font-size:10.5px;color:var(--sub,#97a0af);margin-top:7px}
  @media(max-width:640px){.pbmov{padding:0}.pbm{max-height:100vh;border-radius:0}.pbmbody{padding:4px 14px 18px}}`;
  document.head.appendChild(css);
  if (window.pbTheme) pbTheme.refresh();   /* Dark-Theme-Regeln für die eben injizierten Styles nachziehen */

  /* ---------- Einstieg ----------
     Regelfall: pb-ui.js setzt den Chip „🗓 Meeting" ins Menü. Instanzen ohne dieses Menü
     (Starter/Verkaufsversion, VA-Fork) bekommen hier ein Abzeichen in den Seitenkopf —
     eine Datei, ein Einstieg, egal wo sie läuft. */
  function mountEntry(){
    if (document.getElementById('pbMeetBtn') || document.getElementById('pbMeetBadge')) return;
    const hdr = document.querySelector('header'); if (!hdr) return;
    const b = document.createElement('span');
    b.id = 'pbMeetBadge'; b.className = 'badge'; b.style.cursor = 'pointer';
    b.title = T(['Meeting-Maske öffnen (Daily, Planung, Review, Flow Review)','Open meeting canvas (daily, planning, review, flow review)']);
    b.textContent = '🗓 Meeting';
    b.addEventListener('click', ()=>open());
    hdr.appendChild(b);
  }
  function los(){ mountEntry(); setTimeout(mountEntry, 1500); }  /* zweiter Anlauf: Menüs werden teils nachgerendert */
  if (document.body) los(); else document.addEventListener('DOMContentLoaded', los);

  window.pbMeet = { open, close, level: ctxLevel, facts, plain, mountEntry };
})();
