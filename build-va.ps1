# Baut die VA-Instanz (site/va/index.html) aus der Starter-Variante.
# NACH build-starter.ps1 ausfuehren. Daten kommen zur Laufzeit aus va-data.json (stuendliche Action).
$ErrorActionPreference = 'Stop'
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:s = [IO.File]::ReadAllText("$base\site\flow-cockpit-starter.html")

function Rep([string]$old, [string]$new, [string]$name) {
  if (-not $script:s.Contains($old)) { throw "ANKER FEHLT: $name" }
  $script:s = $script:s.Replace($old, $new)
}
function RepX([string]$pattern, [string]$new, [string]$name) {
  $rx = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $rx.IsMatch($script:s)) { throw "ANKER FEHLT (RX): $name" }
  $ev = { param($m) $new }.GetNewClosure()
  $script:s = $rx.Replace($script:s, $ev, 1)
}

# 1) CONFIG: Vishnu Artists
RepX '(?s)const CONFIG=\{.*?\n\};' @'
const CONFIG={
 org:'Vishnu Artists · Board VA',
 projects:['VA'],
 teams:{t1:'Vishnu Artists'},
 coach:{name:'Benedikt Irsch',first:'Benedikt',mail:'benedikt.irsch@gmail.com',role:'Agile Coach',quali:'AKT & Flight-Levels-Experte'},
 people:[
  ['Jan Edinger','Agile Coach','t1'],['philipp','Agile Coach','t1'],['Yasmine','Agile Coach','t1'],
  ['Nayab Schneider','Agile Coach','t1'],['Domingo Lopez','Agile Coach','t1'],
  ['Benedikt Irsch','Coach','gesamt']],
 jiraBase:'https://vishnuartists.atlassian.net'
};
'@ 'CONFIG-VA'

# 1b) Personen dynamisch aus den Assignees der Live-Daten (alle als Agile Coach);
#     Benedikt bleibt Coach (privilegiert), statische Liste nur als Fallback.
Rep "const PEOPLE=(typeof RAWDATA!=='undefined'&&RAWDATA.people&&RAWDATA.people.length)?RAWDATA.people:CONFIG.people;" @'
const PEOPLE=(function(){
  if(!RAW||!RAW.length)return CONFIG.people;
  const seen={},l=[];
  RAW.forEach(i=>{const n=i[8];if(n&&!seen[n]){seen[n]=1;l.push([n,'Agile Coach','t1']);}});
  l.sort((a,b)=>a[0].localeCompare(b[0]));
  const c=l.find(p=>p[0]===CONFIG.coach.name);
  if(c){c[1]='Coach';c[2]='gesamt';}else l.push([CONFIG.coach.name,'Coach','gesamt']);
  return l;
})();
'@ 'PEOPLE-dynamisch'

# 1c) Coach-Gruppierung: nur Agile Coaches + Coach
Rep "[['Analyst',tr('Analysten','Analysts')],['Engineer','Engineers'],['PO','Product Owner'],['Architekt',tr('Architektur','Architecture')],['PM',tr('Projektmanagement','Project management')],['Coach','Coach']]" "[['Agile Coach','Agile Coaches'],['Coach','Coach']]" 'Coach-Gruppen'

# 1d) Agile Coaches bekommen die Flow-Tipps (WIP/Aging/Blocker)
Rep "if(role==='Engineer'||role==='Analyst'){" "if(role==='Engineer'||role==='Analyst'||role==='Agile Coach'){" 'Tipps-AgileCoach'

# 2) Boot: va-data.json (synchron, mit Cache-Buster) vor localStorage/Demo
Rep @'
/*__RAWDATA__*/const RAWDATA=(function(){
  try{const d=JSON.parse(localStorage.getItem('fcData')||'null');
    if(d&&d.issues&&d.issues.length&&d.meta)return d;}catch(e){}
'@ @'
/*__RAWDATA__*/const RAWDATA=(function(){
  /* Datenstand holen — und den letzten guten behalten (04.09.2026).
     Bis hierher endete jeder Ausfall der Datei im Demo-Generator: 170 erfundene Tickets, verteilt auf
     echte Namen. Ein leerer Datenstand (toter Jira-Token: HTTP 200 mit 0 Vorgängen, so geschehen am
     26.08.) sah genauso aus. Jetzt wandert jeder gute Stand in localStorage.fcData; fällt die Datei
     aus oder kommt sie leer, zeigt das Cockpit den letzten echten Stand — mit Puffer-Hinweis
     (va-app.js > standHtml), nie stumm und nie erfunden. */
  try{const x=new XMLHttpRequest();x.open('GET','va-data.json?ts='+Date.now(),false);x.send();
    if(x.status===200){const d=JSON.parse(x.responseText);
      if(d&&d.issues&&d.issues.length&&d.meta){
        try{ d.meta.geholtAm=new Date().toISOString(); localStorage.setItem('fcData',JSON.stringify(d)); }catch(e){}
        return d; }}}catch(e){}
  try{const d=JSON.parse(localStorage.getItem('fcData')||'null');
    if(d&&d.issues&&d.issues.length&&d.meta){ d.meta.puffer=d.meta.geholtAm||true; return d; }}catch(e){}
'@ 'Boot-XHR'

# 2a) VA-Datenformat: Feld 11 = STA-Link-Flag (0/1), Feld 12 = Resolution-Name (seit 17.08.2026).
#     Die Porsche-Quelle liest die Resolution aus Feld 11 -> im VA-Build zaehlte KEIN Ticket als erledigt
#     (Done 0, Lead 0 T, Durchsatz 0 — Ursache des "VA-Cockpit geht nicht" vom 17.08.). Datenstaende ohne
#     Feld 12 (bis zum naechsten Stundenlauf) zaehlen wie frueher: resolved = erledigt.
Rep "function isRealDone(i){return !!i[5]&&(i[11]===undefined||i[11]==='Done');}" "function isRealDone(i){return !!i[5]&&(typeof i[12]!=='string'||i[12]===''||i[12]==='Done');}" 'isRealDone-VA'
Rep "const rn=(i[11]===undefined)?'Done':(i[11]||'(ohne)');" "const rn=(typeof i[12]!=='string'||i[12]==='')?'Done':i[12];" 'reso-Donut-VA'

# 2a2) Portal-Zugriffs-Gate der Porsche-Quelle (redirect auf index.html ohne vsAuth) waere auf /va/ eine
#     Endlosschleife (index.html = das Cockpit selbst). Ersetzt durch den VA-Team-Login (site/va/va-app.js):
#     Bootstrap prueft localStorage.vaAuth_va2 (Schluessel seit der Rotation 25.08., VA-13506) und setzt die Cockpit-Identitaet (alle im Team = Coach).
Rep '/* __ACCESS_GATE__: Starter hat kein Portal-Login (Demo-Daten bzw. eigener Upload). */' @'
/* ── VA-Team-Login (Bootstrap): Login-Dialog + Startansicht liefert va-app.js; hier nur die
   Identitaet fuer das Cockpit setzen bzw. den Inhalt sperren, bis angemeldet. Alle im Team sind Coaches. ── */
(function(){try{
  var a=null;try{a=JSON.parse(localStorage.getItem('vaAuth_va2')||'null');}catch(e){}
  if(a&&a.name&&a.exp>Date.now()){ localStorage.setItem('vaUser_va',JSON.stringify({name:a.name,role:'Coach'})); }
  else { localStorage.removeItem('vaUser_va'); document.documentElement.classList.add('va-locked'); }
}catch(e){}})();
'@ 'Zugriffs-Gate-VA'

# 2a3) Sperr-Optik schon im Haupt-Style (va-app.js laedt erst am Ende — sonst kurzer unverpixelter Frame)
Rep '  .vkwelc{background:' ('  html.va-locked .wrap,html.va-locked #chartRail,html.va-locked #ctrlRail,html.va-locked .fab,html.va-locked .fab-bubble{filter:blur(8px);pointer-events:none;user-select:none}' + "`n" + '  .vkwelc{background:') 'Locked-CSS'

# 2a4) Alle im Team sind Coaches: persoenliche Diagramme ohne Level-Sperre (Level/XP bleiben als Gamification)
Rep '    if(lv.ix>=1){' '    if(lv.ix>=0){ /* VA: alle Coaches — keine Level-Sperre */' 'Personal-Lock-1'
Rep '    if(lv.ix>=2){' '    if(lv.ix>=0){ /* VA: alle Coaches — keine Level-Sperre */' 'Personal-Lock-2'

# 2a5) Persoenliche Kennzahlen v2 clientseitig: die VA-Rohdaten tragen den Assignee (anders als Porsche,
#     wo der Sync gated Aggregate liefert). Liefert wipCols/wk/leadH/agingB/blockedKeys/oldList/done7 fuer
#     die persoenlichen Diagramme + Rangliste. Erledigt = Resolution Done (isRealDone).
RepX '(?s)function recomputePdata\(\)\{.*?\n  return p;\n\}' @'
function recomputePdata(){
  const endMs=+TO,p={};
  const age=i=>Math.round((endMs-+dt(i[4]))/D1);
  PEOPLE.forEach(pe=>{const n=pe[0];
    const mine=RAW.filter(i=>i[8]===n&&i[3]!=='E');
    if(!mine.length)return;
    const open=mine.filter(i=>{const c=colAt(i,TO);return c>=0&&c<=4;});
    const wipIss=open.filter(i=>{const c=colAt(i,TO);return c>=1&&c<=4;});
    const sorted=open.slice().sort((a,b)=>a[4]<b[4]?-1:1);
    const oldest=sorted[0];
    const dn=mine.filter(i=>isRealDone(i)&&+dt(i[5])<=endMs);
    const doneIss=dn.filter(i=>dt(i[5])>=FROM);
    const done7=dn.filter(i=>+dt(i[5])>endMs-7*D1).length;
    const wipCols=[1,2,3,4].map(c=>wipIss.filter(i=>colAt(i,TO)===c).length);
    const wk=[];for(let w=7;w>=0;w--){const a=endMs-(w+1)*7*D1,b=endMs-w*7*D1;wk.push(dn.filter(i=>+dt(i[5])>a&&+dt(i[5])<=b).length);}
    const ld=dn.filter(i=>+dt(i[5])>endMs-84*D1).map(i=>Math.max(0,Math.round((+dt(i[5])-+dt(i[4]))/D1)));
    const leadH=[[0,3],[4,7],[8,14],[15,30],[31,60],[61,120],[121,1e9]].map(r=>ld.filter(x=>x>=r[0]&&x<=r[1]).length);
    const agingB=[[0,7],[8,30],[31,90],[91,180],[181,1e9]].map(r=>open.filter(i=>{const a=age(i);return a>=r[0]&&a<=r[1];}).length);
    const blockedKeys=open.filter(i=>i[7]).map(i=>i[0]);
    if(open.length||doneIss.length)p[n]={wip:wipIss.length,oldestKey:oldest?oldest[0]:'—',oldestDays:oldest?age(oldest):0,
      oldList:sorted.slice(0,5).map(i=>[i[0],age(i)]),doneP:doneIss.length,done7,flagged:blockedKeys.length,blockedKeys,
      wipCols,wk,leadH,agingB,stale:[]};
  });
  return p;
}
'@ 'recomputePdata-VA-v2'

# 2b) Wizard-Config unter EIGENEM Key fcConfig_va lesen + schreiben (VA-13334: Wizard war wirkungslos).
#     Namespaced statt entfernt: die Starter-Demo laeuft auf derselben Domain und schreibt 'fcConfig' —
#     ein gemeinsamer Key wuerde die VA-Instanz umkonfigurieren (alter Vorfall Coach "Jan").
Rep "try{const _fc=JSON.parse(localStorage.getItem('fcConfig')||'null');if(_fc)Object.assign(CONFIG,_fc);}catch(e){}" "try{const _fc=JSON.parse(localStorage.getItem('fcConfig_va')||'null');if(_fc&&typeof _fc==='object')Object.assign(CONFIG,_fc);}catch(e){}" 'fcConfig-va-Read'
Rep "localStorage.setItem('fcConfig',JSON.stringify(cfg));" "localStorage.setItem('fcConfig_va',JSON.stringify(cfg));" 'fcConfig-va-Write'

# 2c) Identitaet je Instanz (localStorage teilt sich die Domain mit Starter-Demo + Analytics-Cockpit)
$script:s = $script:s.Replace("localStorage.getItem('vaUser')", "localStorage.getItem('vaUser_va')")
$script:s = $script:s.Replace("localStorage.setItem('vaUser',", "localStorage.setItem('vaUser_va',")

# 3) Wizard-Autostart aus, Identitaets-Frage direkt
Rep 'if(!localStorage.getItem(''fcConfig''))setTimeout(wizShow,400);' '' 'Wizard-Autostart'
# Namens-Dialog-Autostart -> Team-Login (va-app.js ueberschreibt whoShow; Fallback bleibt der alte Dialog)
Rep 'if(!USER&&!(typeof wizShow===''function''&&!localStorage.getItem(''fcConfig'')))setTimeout(whoShow,300);' 'if(!USER)setTimeout(function(){if(window.vaApp)vaApp.loginShow();else whoShow();},600);' 'Who-Autostart'

# 4) Echte Spaltennamen aus meta.colNames
Rep 'const DCOLS=[''Backlog'',''Discovery'',''Ready'',''In Progress'',''In Review'',''Done''];' 'const DCOLS=RAWDATA.meta.colNames||[''Backlog'',''Discovery'',''Ready'',''In Progress'',''In Review'',''Done''];' 'DCOLS'
Rep 'wipLabels:[''Discovery'',''Ready'',''In Progress'',''In Review''],wip,' 'wipLabels:(RAWDATA.meta.colNames||[''Backlog'',''Discovery'',''Ready'',''In Progress'',''In Review'',''Done'']).slice(1,5),wip,' 'wipLabels'

# 4b) Programm-Tab -> Flight Level 2+3 (echte STA-Daten statt SAFe-Demo)
Rep ("h+='<div class=" + '"tab" data-view="programm">' + "'+tr('Programm-Board','Program board')+'<small>Demo " + [char]0xB7 + " SAFe</small></div>';") ("h+='<div class=" + '"tab" data-view="programm">' + "'+tr('Flight Level 2+3','Flight level 2+3')+'<small>Board STA</small></div>';") 'FL-Tab-Label'

Rep 'function renderProg(){' ("function renderProg(){renderFL();return;}`nfunction renderProgOld(){") 'renderProg-Umleitung'

# Drilldown fuer FL1-Tickets ohne Initiative
Rep " blocked:{t:['Geflaggte / wartende Tickets','Flagged / waiting tickets']," @'
 nolink:{t:['Aktive Tickets ohne Initiative (FL2)','Active tickets without initiative (FL2)'],f:()=>RAW.filter(i=>i[3]!=='E'&&!i[11]&&(c=>c>=0&&c<=4)(colAt(i,TO))).sort((a,b)=>a[4]<b[4]?-1:1)},
 blocked:{t:['Geflaggte / wartende Tickets','Flagged / waiting tickets'],
'@ 'FL-Drill'

# renderFL delegiert an site/va/va-fl.js (seit 18.08.2026: FL2+3-Tab nach Vorbild des Porsche-Programm-Boards —
# Auf einen Blick, Coach-Einschätzung, Verantwortung & Pflege, Kennzahlen mit Δ, Quartals-Entwicklung, Themen,
# Risiken, Key Results). Die JS-Logik lebt in einer eigenen Datei statt im PowerShell-Here-String.
Rep '// ——— Setup-Wizard v2 ———' @'
// ——— Flight Level 2+3 (Board STA) — Rendering in va-fl.js (window.vaFL) ———
function renderFL(){
  const pv=document.getElementById('progview');
  if(window.vaFL){vaFL.render();return;}
  pv.innerHTML='<div style="margin:20px 0;color:var(--sub);font-size:13px">ℹ️ '+tr('Flight-Level-Ansicht lädt (va-fl.js) …','Flight level view loading (va-fl.js) …')+'</div>';
}
// ——— Setup-Wizard v2 ———
'@ 'renderFL'

# 5) Hilfe liegt eine Ebene hoeher
$script:s = $script:s.Replace('flow-cockpit-hilfe.html', '../flow-cockpit-hilfe.html')

# 5b) Legenden-Text: VA laeuft mit Live-Daten, nicht mit Beispieldaten
Rep '<strong id="noteMode">Demo-Modus</strong> <span class="dim">· dieses Cockpit läuft mit Beispieldaten. Eigene Jira-Daten: ⚙️ Setup → Datenquelle (Upload oder Import-Skript).</span>' '<strong id="noteMode">Live-Daten</strong> <span class="dim">· Board VA (vishnuartists.atlassian.net), stündlich automatisch aktualisiert. Alle im Team sind Coaches — alle Diagramme und persönlichen Übersichten sind offen.</span>' 'Note-DE-VA'
Rep "<strong id=`"noteMode`">'+(RAWDATA.meta.demo?'Demo mode':'Your data')+'</strong> <span class=`"dim`">· own Jira data: ⚙️ Setup → data source (upload or import script).</span>" "<strong id=`"noteMode`">Live data</strong> <span class=`"dim`">· board VA (vishnuartists.atlassian.net), refreshed hourly. Everyone on the team is a coach — all charts and personal views are open.</span>" 'Note-EN-VA'
Rep "var vknm=document.getElementById('noteMode');if(vknm)vknm.textContent=tr('Eigene Daten','Your data');" "" 'Note-Mode-Init-VA'

# 6) Branding
$script:s = $script:s.Replace('Flow Cockpit — Kanban Analytics fuer euer Team', 'Vishnu Artists — Flow Cockpit (Board VA)')
$script:s = $script:s.Replace('◢</span> FLOW COCKPIT', '◢</span> VISHNU ARTISTS · FLOW COCKPIT')

# 7) VA-FL (Flight Level 2+3: Auf einen Blick, Coach-Einschaetzung, Verantwortung & Pflege, Quartals-Historie,
#    FL2+FL3-Rangliste) — eigene Datei site/va/va-fl.js, MUSS vor va-app.js laden (Startansicht nutzt window.vaFL).
#    VA-App (Team-Login, Startansicht, Ranglisten/Gamification, Willkommens-Banner) — site/va/va-app.js.
#    Cache-Buster bei jeder Aenderung mitziehen (VER in den Dateien ebenfalls).
Rep '</body>' ('<script src="va-fl.js?v=0818b"></script>' + "`n" + '<script src="va-app.js?v=0831a"></script>' + "`n" + '</body>') 'va-fl/va-app-Einbindung'

# 8) pb-ui.js-Einbindung sicherstellen — /va/ liefert eine EIGENE Kopie (site/va/pb-ui.js).
#    Der Starter-Build darf den Tag entfernen (site/-Root deployt kein pb-ui.js), VA braucht ihn
#    aber fuer KMM/FL-Coach — deshalb hier konditional wieder einsetzen.
#    Cache-Stempel = Inhalts-Hash der VA-Kopie: wer den Fork anfasst, muss an nichts denken.
$uiFile = "$base\site\va\pb-ui.js"
if (-not (Test-Path $uiFile)) { throw "VA-Fork fehlt: $uiFile" }
$uiHash = [Security.Cryptography.MD5]::Create().ComputeHash([IO.File]::ReadAllBytes($uiFile))
$uiStamp = (($uiHash | ForEach-Object { $_.ToString('x2') }) -join '').Substring(0,8)
if ($script:s -match '<script src="pb-ui\.js[^"]*"></script>') {
  $script:s = [regex]::Replace($script:s, '<script src="pb-ui\.js[^"]*"></script>', ('<script src="pb-ui.js?v=' + $uiStamp + '"></script>'))
} else {
  Rep '</body>' ('<script src="pb-ui.js?v=' + $uiStamp + '"></script>' + "`n" + '</body>') 'pb-ui-Einbindung VA'
}

# 9) Porsche-Artefakte strippen, die /va/ nicht deployt (sonst 404 in der Konsole):
#    pb-data.js-Include + __teamLogoHeader-Block (fetcht data/teams.json und braucht
#    pbTeamLogo/pbTeamBadge aus eben diesem pb-data.js — ohne die Datei toter Code).
#    Seit 22.08. raeumt das schon build-starter-part3.ps1 fuer Starter UND VA auf.
#    Hier bleibt es als Netz stehen — darf also ins Leere laufen, ohne den Build zu stoppen.
$script:s = [regex]::Replace($script:s, '<script src="pb-data\.js[^"]*"></script>\s*', '')
$script:s = [regex]::Replace($script:s, '(?s)<script>\s*/\* __teamLogoHeader:.*?</script>\s*', '')
# Ebenso als Netz: die Kopf-Includes der Porsche-Infrastruktur (pb-i18n/sync/store/bio) —
# /va/ deployt keine davon. Raeumt seit 27.08. schon build-starter-part3.ps1 fuer Starter
# UND VA weg; hier nur, falls ein alter Starter-Stand als Quelle dient.
$script:s = [regex]::Replace($script:s, '\n<!-- Sprache: pbLang[^\n]*-->', '')
$script:s = [regex]::Replace($script:s, '\n<script src="pb-(i18n|sync|store|bio)\.js[^"]*">\s*</script>', '')

New-Item -ItemType Directory -Force "$base\site\va" | Out-Null

# 9b) GETEILTE BAUSTEINE aus der Porsche-Quelle uebernehmen (seit 23.08.2026).
#     pb-buddy.js = Assistenten-Verhalten (Avatar, Ruhe-Modus, die eine Frage nach dem
#     3. Anmelden), pb-meet.js = Meeting-Masken FL1/FL2/FL3. Beide sind marken- und
#     personenfrei; WER der Assistent ist, steht im mount()-Aufruf in site/va/pb-ui.js.
#     Damit wandert ein Feature aus dem Porsche-Cockpit beim naechsten Build von selbst
#     hierher — kein Nachbauen im VA-Fork mehr. Der Cache-Stempel ist der Inhalts-Hash:
#     aendert sich die Datei, aendert sich der Stempel, ohne dass jemand daran denkt.
$shared = Join-Path (Split-Path -Parent $base) 'cs-carsales-flow-cockpit'
$stamps = @{}
foreach ($f in @('pb-buddy.js','pb-meet.js')) {
  $q = Join-Path $shared $f
  if (-not (Test-Path $q)) { throw "GETEILTE DATEI FEHLT: $q — Porsche-Repo neben diesem Repo auschecken." }
  $txt = [IO.File]::ReadAllText($q).Replace("`r`n","`n")
  [IO.File]::WriteAllText("$base\site\va\$f", $txt, (New-Object Text.UTF8Encoding($false)))
  $md5 = [Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($txt))
  $stamp = (($md5 | ForEach-Object { $_.ToString('x2') }) -join '').Substring(0,8)
  $stamps[$f] = $stamp
  $tag = '<script src="' + $f + '?v=' + $stamp + '"></script>'
  if ($script:s -match ('<script src="' + [regex]::Escape($f) + '[^"]*"></script>')) {
    $script:s = [regex]::Replace($script:s, '<script src="' + [regex]::Escape($f) + '[^"]*"></script>', $tag)
  } else {
    Rep '</body>' ($tag + "`n" + '</body>') ('Einbindung ' + $f)
  }
  Write-Output ("geteilt uebernommen: {0} (v={1})" -f $f, $stamp)
}
# pb-buddy.js muss VOR pb-ui.js stehen (der Fork montiert Ziff ueber pbBuddy.mount).
$script:s = [regex]::Replace($script:s, '<script src="pb-buddy\.js[^"]*"></script>\n?', '')
$script:s = [regex]::Replace($script:s, '(<script src="pb-ui\.js[^"]*"></script>)',
  ('<script src="pb-buddy.js?v=' + $stamps['pb-buddy.js'] + '"></script>' + "`n" + '$1'), 1)
if ($script:s -notmatch '<script src="pb-buddy\.js') { throw 'ANKER FEHLT: pb-buddy.js konnte nicht vor pb-ui.js gesetzt werden' }

# Zombie-Jagd-Refresh: VA laedt va-data.json nach
Rep "window.__liveDataUrl=null;" "window.__liveDataUrl='va-data.json';" 'Quest-DataUrl'
[IO.File]::WriteAllText("$base\site\va\index.html", $script:s, (New-Object Text.UTF8Encoding($false)))
Write-Output ("VA-Instanz geschrieben: {0} KB" -f [math]::Round((Get-Item "$base\site\va\index.html").Length/1KB))

