# Teil 2 des Starter-Builds — wird von build-starter.ps1 dot-sourced ($script:s, R, RX vorhanden)

# ── 4. Demo-CONFIG + Wizard-Merge ──────────────────────────────────────────────
RepX '(?s)const CONFIG=\{.*?\n\};' @'
const CONFIG={
 org:'Demo Org · Product Analytics',
 projects:['PRJ','SUP'],
 teams:{t1:'Analysten',t2:'Engineers'},
 coach:{name:'Alex Muster',first:'Alex',mail:'coach@example.com',role:'Agile Coach',quali:'Kanban- & Flight-Levels-Coaching'},
 people:[
  ['Anna Beispiel','Analyst','t1'],['Ben Muster','Analyst','t1'],
  ['Chris Demo','Engineer','t2'],['Dana Test','Engineer','t2'],
  ['Eva Product','PO','gesamt'],['Alex Muster','Coach','gesamt']],
 jiraBase:'https://your-instance.atlassian.net'
};
// Wizard-Konfiguration aus dem Browser-Speicher uebernehmen
try{const _fc=JSON.parse(localStorage.getItem('fcConfig')||'null');if(_fc)Object.assign(CONFIG,_fc);}catch(e){}
'@ 'CONFIG-Demo'

# ── 5. Datenquelle: Upload aus localStorage, sonst Demo-Generator ──────────────
# Ersetzt die komplette Porsche-Loader-IIFE (XHR auf data/analytics-data.json + eingebetteter
# Jira-Snapshot) — im Starter gibt es nur Upload (localStorage) oder synthetische Demo-Daten.
RepX '/\*__RAWDATA__\*/const RAWDATA=\(function\(\)\{.*?\}\)\(\);' @'
// Demo-Daten-Generator: reproduzierbar ~170 synthetische Tickets ueber 26 Wochen
function DEMOGEN(){
  let seed=42;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
  const MS=86400000,END=new Date();END.setUTCHours(0,0,0,0);
  const iso=d=>d.toISOString().slice(0,10);
  const devs=CONFIG.people.filter(p=>p[2]!=='gesamt');
  const tkeys=Object.keys(CONFIG.teams);
  const out=[];
  for(let n=0;n<170;n++){
    const created=new Date(+END-Math.floor(rnd()*175+2)*MS);
    const dev=devs.length?devs[Math.floor(rnd()*devs.length)]:null;
    const team=dev?dev[2]:tkeys[Math.floor(rnd()*tkeys.length)]||'t1';
    const tyR=rnd();const ty=tyR<.5?'S':tyR<.68?'T':tyR<.82?'X':tyR<.9?'O':'E';
    const flow=[[iso(created),0]];let cur=0;let t=+created;const speed=rnd();
    if(ty!=='E'){for(const st of [1,2,3,4,5]){
      if(rnd()<0.82){t+=(Math.floor(rnd()*16*(1.5-speed))+1)*MS;if(t>+END)break;flow.push([iso(new Date(t)),st]);cur=st;}else break;}}
    const resolved=cur===5?flow[flow.length-1][0]:'';
    const due=rnd()<0.12?iso(new Date(+created+Math.floor(rnd()*40+10)*MS)):'';
    const ref=rnd()<0.2?(rnd()<0.5?1:2):0;
    const proj=rnd()<0.18?'S':'C';
    out.push([(proj==='S'?'SUP-':'PRJ-')+(100+n),team,proj,ty,iso(created),resolved,due,rnd()<0.08?1:0,dev&&rnd()<0.8?dev[0]:'',ref,flow]);
  }
  return out;
}
/*__RAWDATA__*/const RAWDATA=(function(){
  try{const d=JSON.parse(localStorage.getItem('fcData')||'null');
    if(d&&d.issues&&d.issues.length&&d.meta)return d;}catch(e){}
  const t=new Date();t.setUTCHours(0,0,0,0);const iso=x=>x.toISOString().slice(0,10);
  return {meta:{importDate:iso(t),doneWindowStart:iso(new Date(+t-182*86400000)),demo:true},issues:DEMOGEN()};
})();
'@ 'RAWDATA-Boot'

# Portal-Zugriffs-Gate der Porsche-Quelle (seit 09cc4e1: ohne sessionStorage.vsAuth -> location.replace('index.html'))
# hat im Starter nichts zu suchen: kein Portal, Demo-/Upload-Daten — und index.html ist hier die Produktseite
# (Live-Demo sprang seit dem 14.08.-Rebuild sofort zur Marketing-Seite). Marker bleibt, build-va setzt dort den VA-Login ein.
RepX '(?s)/\* ── Zugriffs-Gate: ohne Anmeldung keine Firmendaten\..*?\}catch\(e\)\{\}\}\)\(\);' '/* __ACCESS_GATE__: Starter hat kein Portal-Login (Demo-Daten bzw. eigener Upload). */' 'Zugriffs-Gate-Starter'

# Feature-Liste kommt bei Porsche aus dem stuendlichen Sync (data/features.json) — im Starter kein Remote-Load:
RepX 'var VSFEAT_REMOTE=\(function\(\)\{.*?\}\)\(\);' 'var VSFEAT_REMOTE={};' 'VSFEAT-Remote-Stub'

# ── 6. Header-Badge + Demo-Note ────────────────────────────────────────────────
# Die Anker tragen bewusst kein Datum mehr: die Quelle nannte frueher ein festes
# Import-Datum ("letzter Import: 09.07.2026"), inzwischen "Datenstand: siehe Footer".
# Datumsanker brechen bei jeder Textpflege — deshalb auf den stabilen Teil greifen.
RepX '<span class="badge" id="importBadge">Snapshot[^<]*</span>' '<span class="badge" id="importBadge">Demo-Modus · synthetische Daten</span> <span class="badge" style="cursor:pointer" onclick="wizShow()">⚙️ Setup</span>' 'Badge'
RepX "q\('#importBadge','Snapshot[^']*'\);" "q('#importBadge',RAWDATA.meta.demo?'Demo mode · synthetic data':'Data as of: '+RAWDATA.meta.importDate);" 'Badge-EN'
RepX '<div class="nrow"><strong>Snapshot[^<]*</strong> <span class="dim">[^<]*</span>' '<div class="nrow"><strong id="noteMode">Demo-Modus</strong> <span class="dim">· dieses Cockpit läuft mit Beispieldaten. Eigene Jira-Daten: ⚙️ Setup → Datenquelle (Upload oder Import-Skript).</span>' 'Note-DE'
# 24.08.2026: Die i18n-Runde hat den Satz in S('…') gewickelt — der alte Anker griff nur
# auf das nackte '<strong>Snapshot. Deshalb jetzt (a) beide Formen erlaubt und (b) die
# GANZE Anweisung ersetzt statt nur ihres Kopfes; sonst bliebe das schliessende ');' der
# S()-Klammer als Rest stehen. Die LIVE/MOCK-Legende steht in der Ersetzung wieder mit drin.
RepX "if\(nr\[0\]\)nr\[0\]\.innerHTML=(?:S\()?'<strong>Snapshot[^\n]*" "if(nr[0])nr[0].innerHTML='<strong id=`"noteMode`">'+(RAWDATA.meta.demo?'Demo mode':'Your data')+'</strong> <span class=`"dim`">· own Jira data: ⚙️ Setup → data source (upload or import script).</span> &nbsp;<span class=`"chip live`">● LIVE</span> <span class=`"dim`">real imported value</span> · <span class=`"chip mock`">○ MOCK</span> <span class=`"dim`">placeholder</span>';" 'Note-EN'

# ── 7. Version ─────────────────────────────────────────────────────────────────
Rep "const VERSION='2.1.0';" "const VERSION='2.1.0-starter';" 'Version'

# ── 7b. Stufenleiter: Fliegerei statt Motorsport ───────────────────────────────
# Kart -> Formel 1 -> Weltmeister ist die Porsche-Sprache und bleibt dort. Die
# Produktfamilie heisst Flightdeck (Compass, Cockpit, Crew, Tower) — dort traegt
# die Fliegerleiter. Gleiche XP-Schwellen, gleiche Freischaltungen (ix>=1 WIP und
# Durchsatz, ix>=2 Lead Times, ix>=3 alle Team-Diagramme), nur andere Namen.
Rep @'
/* Racing-Stufen (19.08.): [XP ab, Icon, DE, EN] — Index-basiert (pLevel().ix), Freischaltungen: ix≥1 WIP/Durchsatz, ix≥2 Lead Times, ix≥3 alle Team-Diagramme */
const PLEVELS=[[0,'🏎','Kart','Kart'],[60,'4️⃣','Formel 4','Formula 4'],[150,'3️⃣','Formel 3','Formula 3'],[280,'2️⃣','Formel 2','Formula 2'],[450,'1️⃣','Formel 1','Formula 1'],[700,'🏆','Weltmeister','World Champion']];
'@ @'
/* Flieger-Stufen (22.08.): [XP ab, Icon, DE, EN] — Index-basiert (pLevel().ix), Freischaltungen: ix≥1 WIP/Durchsatz, ix≥2 Lead Times, ix≥3 alle Team-Diagramme */
const PLEVELS=[[0,'🎈','Ballon','Balloon'],[60,'🪂','Segelflieger','Glider pilot'],[150,'🛩️','Sportpilot','Private pilot'],[280,'✈️','Linienpilot','Airline pilot'],[450,'🎖️','Kapitän','Captain'],[700,'🏆','Fluglehrer','Flight instructor']];
'@ 'Stufenleiter Fliegerei'

# ── 8. Init: Badge bei echten Daten + Wizard-Autostart ─────────────────────────
# fixImportNote (Porsche: stuendlicher Jira-Sync-Hinweis) entfaellt im Starter — Demo-Badge-Logik uebernimmt.
# 24.08.2026: Der Anker fasst nur noch die eine Zeile, die wirklich ersetzt werden soll.
# Vorher hing die naechste Zeile (if(RAW.length){recomputeAll();}) mit im Anker — und brach,
# sobald dort der Startzeitraum dazukam. Was danach steht, bleibt jetzt unangetastet.
Rep 'applyStatic();fixImportNote();' @'
applyStatic();
if(!RAWDATA.meta.demo){var vkib=document.getElementById('importBadge');if(vkib)vkib.textContent=tr('Datenstand: ','Data as of: ')+RAWDATA.meta.importDate;
  var vknm=document.getElementById('noteMode');if(vknm)vknm.textContent=tr('Eigene Daten','Your data');}
if(!localStorage.getItem('fcConfig'))setTimeout(wizShow,400);
'@ 'Init-Hooks'

Write-Output "Teil 2 ok — CONFIG/Boot/Badge."
. "$base\build-starter-part3.ps1"
