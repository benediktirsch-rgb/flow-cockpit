# Teil 3 des Starter-Builds — Wizard, Anonymisierung, Hilfe. Von part2 dot-sourced.

# ── 9. Wizard-CSS ──────────────────────────────────────────────────────────────
Rep '</style>' @'
  .wiz-ov{position:fixed;inset:0;background:rgba(15,16,16,.55);z-index:100;display:none;align-items:center;justify-content:center}
  .wiz{background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);max-width:620px;width:94%;padding:26px 30px;border-top:5px solid var(--brand);max-height:92vh;overflow:auto}
  .wiz h2{margin:0 0 6px} .wiz h3{margin:0 0 8px;font-size:14px;color:var(--sub)}
  .wiz label{display:block;font-size:12.5px;font-weight:600;color:var(--sub);margin:10px 0}
  .wiz input,.wiz textarea,.wiz select{display:block;width:100%;margin-top:4px;padding:9px 10px;border:1px solid var(--line);border-radius:8px;font-family:inherit;font-size:13px}
  .wiz textarea{font-family:Consolas,monospace;font-size:11.5px}
  .wiz .wnav{display:flex;justify-content:space-between;align-items:center;margin-top:18px}
  .wiz code{background:#f4f5f7;padding:1px 5px;border-radius:4px}
  .wiz .srcopt{display:flex;gap:8px;align-items:flex-start;margin:8px 0;padding:10px;border:1px solid var(--line);border-radius:8px}
  .wiz .srcopt input[type=radio]{width:auto;margin-top:3px}
  .wiz .mini{font-size:11.5px;color:var(--sub)}
  .wiz .ok{color:var(--brand-dark);font-weight:700}
</style>
'@ 'Wizard-CSS'

# ── 10. Wizard-HTML ────────────────────────────────────────────────────────────
Rep '<footer class="dashfoot">' @'
<div id="wizard" class="wiz-ov">
 <div class="wiz">
  <h2>🚦 Flow Cockpit einrichten</h2>
  <div class="mini" id="wizStepInfo"></div>

  <div class="wstep"><h3>Organisation</h3>
    <label>Name eurer Organisation / Board-Titel<input id="wOrg" placeholder="z. B. ACME · Product Team"></label></div>

  <div class="wstep" style="display:none"><h3>Datenquelle</h3>
    <div class="srcopt"><input type="radio" name="wSrc" value="demo" checked id="wSrcDemo">
      <div><b>Demo-Daten</b><div class="mini">Sofort loslegen mit realistischen Beispieldaten — ideal, um das Cockpit dem Team zu zeigen.</div></div></div>
    <div class="srcopt"><input type="radio" name="wSrc" value="upload">
      <div><b>Datei-Upload</b> <span class="mini">(flow-cockpit-data.json)</span>
        <input type="file" accept=".json,application/json" onchange="wizUpload(event)" style="margin-top:6px">
        <div class="mini" id="wUpInfo"></div></div></div>
    <div class="srcopt"><input type="radio" name="wSrc" value="script">
      <div><b>Jira-Import-Skript</b>
        <div class="mini">Direkter API-Zugriff aus dieser Seite wird vom Browser blockiert (CORS). Stattdessen: Skript unten kopieren, in einem Jira-Tab die Konsole öffnen (F12), einfügen, Enter — es lädt <code>flow-cockpit-data.json</code> herunter, die du dann oben hochlädst. Kein Plugin, keine Admin-Rechte, Daten bleiben bei dir.</div>
        <label>Jira-URL<input id="wJira2" placeholder="https://firma.atlassian.net"></label>
        <label>Projekt-Keys (Komma-getrennt)<input id="wProjects" placeholder="PROJ, SUP"></label>
        <label>Board-ID <span class="mini">(steht in der Board-URL: /boards/…)</span><input id="wBoard" placeholder="123"></label>
        <a class="subtab" onclick="buildImportScript()" style="display:inline-block;margin-top:6px">Skript erzeugen</a>
        <a class="subtab" onclick="const t=document.getElementById(&quot;wScript&quot;);t.select();document.execCommand(&quot;copy&quot;)" style="display:inline-block;margin-top:6px">Kopieren</a>
        <textarea id="wScript" rows="5" placeholder="→ erst „Skript erzeugen“ klicken"></textarea>
        <div class="mini">Weitere Wege (auf Anfrage): geplanter Server-Import, CSV-Konverter, Confluence-Gadget.</div></div></div></div>

  <div class="wstep" style="display:none"><h3>Teams <span class="mini">— beliebig viele</span></h3>
    <div id="wTeams"></div>
    <a class="subtab" onclick="wizAddTeam('')" style="display:inline-block;margin-top:6px">＋ Team hinzufügen</a></div>

  <div class="wstep" style="display:none"><h3>Personen</h3>
    <div class="mini">Eine Person pro Zeile: <code>Name; Rolle; Team-Nr</code> — Rollen: Analyst · Engineer · PO · Architekt · PM · Coach — Team: t1, t2, … oder gesamt</div>
    <a class="subtab" onclick="wizScanNames()" style="display:inline-block;margin:8px 0">👥 Namen aus den Daten übernehmen</a>
    <span class="mini" id="wScanInfo"></span>
    <textarea id="wPeople" rows="8">Anna Beispiel; Analyst; t1
Ben Muster; Analyst; t1
Chris Demo; Engineer; t2
Dana Test; Engineer; t2
Eva Product; PO; gesamt
Alex Muster; Coach; gesamt</textarea></div>

  <div class="wstep" style="display:none"><h3>Coach</h3>
    <label>Coach-Name<input id="wCName" placeholder="Alex Muster"></label>
    <label>Coach-E-Mail (für den Termin-Button)<input id="wCMail" placeholder="coach@firma.de"></label>
    <label>Coach-Rolle<input id="wCRole" value="Agile Coach"></label>
    <label>Qualifikation (erscheint erst nach Klick aufs ℹ️)<input id="wCQuali" placeholder="z. B. Kanban-Coaching, Flight Levels"></label></div>

  <div class="wnav"><span class="subtab" id="wizPrev" onclick="wizPrev()">← Zurück</span><a class="cta" style="margin-top:0" onclick="wizNext()" id="wizNextBtn">Weiter →</a></div>
  <div class="explain" style="margin-top:12px">Einstellungen jederzeit änderbar über ⚙️ Setup oben rechts. Sprache: EN/DE-Knopf im Header.</div>
 </div>
</div>

<footer class="dashfoot">
'@ 'Wizard-HTML'

# ── 11. Wizard-JS ──────────────────────────────────────────────────────────────
# Ziel ist das ENDE des grossen Inline-Scripts — verankert am pb-data.js-Include, der in
# der Quelle direkt dahinter steht (Lookahead; der Include selbst bleibt und wird in
# Schritt 13 gedroppt). Bis 27.08. stand hier RepX '</script>' (erstes Vorkommen) — seit
# die Quelle am 24.08. pb-i18n.js & Co. im <head> laedt, war das erste </script> ein
# src-Include und der Wizard landete als toter Inhalt darin (⚙️ Setup und im VA-Build
# der FL2+3-Tab: ReferenceError). Faellt der pb-data-Include je aus der Quelle, bricht
# der Build hier laut ab — dann neuen Anker fuers Script-Ende suchen.
RepX '</script>(?=\n<script src="pb-data\.js)' @'

// ——— Setup-Wizard v2 ———
let wizStep=0;const WIZN=5;
function wizShow(){document.getElementById('wizard').style.display='flex';
  if(!document.querySelector('.wTeam')){Object.keys(CONFIG.teams).forEach(k=>wizAddTeam(CONFIG.teams[k]));}
  document.getElementById('wOrg').value=CONFIG.org;wizGo(0);}
function wizGo(n){wizStep=n;
  document.querySelectorAll('.wstep').forEach((e,i)=>e.style.display=i===n?'block':'none');
  document.getElementById('wizStepInfo').textContent=tr('Schritt ','Step ')+(n+1)+' / '+WIZN;
  document.getElementById('wizPrev').style.visibility=n===0?'hidden':'visible';
  document.getElementById('wizNextBtn').textContent=n===WIZN-1?tr('✔ Fertig — Cockpit starten','✔ Done — launch cockpit'):tr('Weiter →','Next →');}
function wizPrev(){if(wizStep>0)wizGo(wizStep-1);}
function wizAddTeam(label){const c=document.getElementById('wTeams');const idx=c.children.length+1;
  const row=document.createElement('div');
  row.innerHTML='<label>Team t'+idx+'<input class="wTeam" value="'+String(label||'').replace(/"/g,'')+'" placeholder="Team-Name"></label>';
  c.appendChild(row);}
function wizTeams(){return [...document.querySelectorAll('.wTeam')].map((e,i)=>['t'+(i+1),e.value.trim()]).filter(t=>t[1]);}
function wizUpload(ev){
  const f=ev.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{try{const d=JSON.parse(rd.result);
    if(!d.issues||!d.issues.length||!d.meta)throw new Error('format');
    localStorage.setItem('fcData',rd.result);
    document.getElementById('wUpInfo').innerHTML='<span class="ok">✔ '+d.issues.length+' '+tr('Tickets geladen — Import vom ','tickets loaded — import of ')+d.meta.importDate+'</span>';
    document.querySelector('input[name=wSrc][value=upload]').checked=true;
  }catch(e){document.getElementById('wUpInfo').textContent=tr('✖ Ungültige Datei — bitte flow-cockpit-data.json aus dem Import-Skript verwenden.','✖ Invalid file — please use flow-cockpit-data.json from the import script.');}};
  rd.readAsText(f);}
function wizScanNames(){
  let data=null;try{data=JSON.parse(localStorage.getItem('fcData')||'null');}catch(e){}
  const issues=(data&&data.issues&&data.issues.length)?data.issues:RAW;
  const teams=wizTeams();
  const cnt={};issues.forEach(i=>{const n=i[8];if(!n)return;cnt[n]=cnt[n]||{};cnt[n][i[1]]=(cnt[n][i[1]]||0)+1;});
  const lines=Object.keys(cnt).sort().map(n=>{
    const best=Object.keys(cnt[n]).sort((a,b)=>cnt[n][b]-cnt[n][a])[0];
    const key=teams.some(t=>t[0]===best)?best:(teams[0]?teams[0][0]:'t1');
    const lbl=(teams.find(t=>t[0]===key)||['',''])[1];
    const role=/eng|dev|tech|platt|platform/i.test(lbl)?'Engineer':'Analyst';
    return n+'; '+role+'; '+key;});
  if(lines.length)document.getElementById('wPeople').value=lines.join('\n');
  document.getElementById('wScanInfo').textContent=lines.length+' '+tr('Namen aus den Tickets übernommen — Rollen/Teams bitte prüfen.','names taken from the tickets — please review roles/teams.');}
function buildImportScript(){
  const jira=(document.getElementById('wJira2').value||'https://firma.atlassian.net').replace(/\/+$/,'');
  const projs=(document.getElementById('wProjects').value||'PROJ').split(',').map(x=>x.trim()).filter(Boolean);
  const board=(document.getElementById('wBoard').value||'123').trim();
  const teams=wizTeams();
  const tmap=teams.map(t=>'["'+String(t[1]).toLowerCase().replace(/"/g,'').slice(0,8)+'","'+t[0]+'"]').join(',');
  const defT=teams[0]?teams[0][0]:'t1';
  const L=[];
  L.push('// Flow Cockpit Import — auf einem '+jira+'-Tab in der Browser-Konsole (F12) ausfuehren');
  L.push('(async()=>{');
  L.push('const PROJECTS='+JSON.stringify(projs)+';const BOARD="'+board+'";');
  L.push('// Team-Zuordnung: ["suchbegriff in component/label","team-key"] — bitte anpassen!');
  L.push('const TEAMMAP=['+tmap+'];const DEFTEAM="'+defT+'";');
  L.push('const cfg=await fetch("/rest/agile/1.0/board/"+BOARD+"/configuration").then(r=>r.json());');
  L.push('const cols={};cfg.columnConfig.columns.forEach((c,i,a)=>{const idx=i===0?0:(i===a.length-1?5:Math.max(1,Math.min(4,i+6-a.length)));c.statuses.forEach(st=>cols[st.id]=idx);});');
  L.push('const jql="project in ("+PROJECTS.join(",")+") AND issuetype not in subTaskIssueTypes() AND (statusCategory != Done OR resolved >= -26w)";');
  L.push('let issues=[],token=null;');
  L.push('for(let p=0;p<60;p++){const u=new URL("/rest/api/3/search/jql",location.origin);u.searchParams.set("jql",jql);u.searchParams.set("maxResults","100");u.searchParams.set("fields","status,assignee,created,resolutiondate,issuetype,labels,duedate,components,project");if(token)u.searchParams.set("nextPageToken",token);const j=await fetch(u).then(r=>r.json());issues=issues.concat(j.issues||[]);if(!j.nextPageToken)break;token=j.nextPageToken;}');
  L.push('console.log("Tickets: "+issues.length+" — lade Status-Historien (dauert etwas)...");');
  L.push('const cl={};const q=issues.slice();');
  L.push('await Promise.all(Array.from({length:10},async()=>{let it;while((it=q.shift())){let h=[],sa=0;for(let p=0;p<6;p++){const r=await fetch("/rest/api/3/issue/"+it.key+"/changelog?maxResults=100&startAt="+sa);if(!r.ok)break;const j=await r.json();j.values.forEach(v=>v.items.forEach(x=>{if(x.fieldId==="status")h.push([v.created.slice(0,10),x.from,x.to]);}));if(j.isLast||!j.values.length)break;sa+=j.values.length;}cl[it.key]=h;}}));');
  L.push('const ty=n=>/story/i.test(n)?"S":/epic/i.test(n)?"E":/tech/i.test(n)?"X":/^task|^aufgabe/i.test(n)?"T":"O";');
  L.push('const team=f=>{const txt=((f.components||[]).map(c=>c.name).join(" ")+" "+(f.labels||[]).join(" ")).toLowerCase();for(const m of TEAMMAP){if(m[0]&&txt.indexOf(m[0])>=0)return m[1];}return DEFTEAM;};');
  L.push('const out=issues.map(i=>{const f=i.fields;const h=(cl[i.key]||[]).sort((a,b)=>a[0]<b[0]?-1:1);');
  L.push(' const ic=h.length?cols[h[0][1]]:cols[f.status.id];const trn=[[f.created.slice(0,10),ic==null?0:ic]];');
  L.push(' h.forEach(x=>{const c=cols[x[2]];if(c!=null&&c!==trn[trn.length-1][1])trn.push([x[0],c]);});');
  L.push(' const lb=(f.labels||[]).map(l=>l.toLowerCase());');
  L.push(' return [i.key,team(f),"C",ty(f.issuetype.name),f.created.slice(0,10),f.resolutiondate?f.resolutiondate.slice(0,10):"",f.duedate||"",0,f.assignee?f.assignee.displayName:"",(lb.indexOf("refinement_needed")>=0?1:0)+(lb.indexOf("refinement_done")>=0?2:0),trn];});');
  L.push('const today=new Date().toISOString().slice(0,10);const start=new Date(Date.now()-182*86400000).toISOString().slice(0,10);');
  L.push('const blob=new Blob([JSON.stringify({meta:{importDate:today,doneWindowStart:start},issues:out})],{type:"application/json"});');
  L.push('const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="flow-cockpit-data.json";document.body.appendChild(a);a.click();a.remove();');
  L.push('console.log("Fertig — flow-cockpit-data.json wurde heruntergeladen. Jetzt im Cockpit-Wizard hochladen.");');
  L.push('})();');
  document.getElementById('wScript').value=L.join('\n');
  document.querySelector('input[name=wSrc][value=script]').checked=true;}
function wizNext(){
  if(wizStep<WIZN-1){wizGo(wizStep+1);return;}
  const src=(document.querySelector('input[name=wSrc]:checked')||{}).value||'demo';
  if(src==='demo')localStorage.removeItem('fcData');
  const teams={};wizTeams().forEach(t=>teams[t[0]]=t[1]);
  if(!Object.keys(teams).length){teams.t1='Team 1';}
  const people=document.getElementById('wPeople').value.split('\n').map(l=>l.split(';').map(x=>x.trim())).filter(l=>l.length===3&&l[0]);
  const cName=document.getElementById('wCName').value||CONFIG.coach.name;
  const cfg={org:document.getElementById('wOrg').value||CONFIG.org,
    teams:teams,
    people:people.length?people:CONFIG.people,
    coach:{name:cName,first:cName.split(' ')[0],
      mail:document.getElementById('wCMail').value||CONFIG.coach.mail,
      role:document.getElementById('wCRole').value||'Agile Coach',
      quali:document.getElementById('wCQuali').value||CONFIG.coach.quali},
    jiraBase:(document.getElementById('wJira2').value||CONFIG.jiraBase).replace(/\/+$/,'')};
  localStorage.setItem('fcConfig',JSON.stringify(cfg));
  location.reload();}
</script>
'@ 'Wizard-JS'

# ── 12. Interne Feature-Titel generisch ────────────────────────────────────────
$map = @{'Improve Observability'='Observability ausbauen';'Publish Dashboard Pages'='Dashboards veroeffentlichen';'Adobe Data Quality'='Datenqualitaet Tracking';'Data Product Structure'='Datenprodukt-Struktur';'Cross-Product Metadata'='Metadaten-Katalog';'Future BI Tool Decision'='BI-Tool-Entscheidung';'Finder GTM Region Containers'='Tracking-Container Rollout';'Credit App Data Integration'='App-Daten-Integration';'External Access Databricks'='Externer Datenzugriff';'Migration Insights BI'='BI-Migration';'PFS Sales Funnel'='Sales-Funnel-Analyse';'MVP OCS Dashboard'='MVP Self-Service-Dashboard';'PCW Dealership Reporting'='Haendler-Reporting';'InsightsBI Sundown'='Alt-BI-Abschaltung';'Echte Momentaufnahme, Analytics-Team'='Demo-Momentaufnahme'}
foreach ($k in $map.Keys) { $script:s = $script:s.Replace($k, $map[$k]) }

# ── 13. Anonymisierung & Branding ──────────────────────────────────────────────
Rep ('  <a href="programmboard.html">📋 Programm Board PI 2026.25</a>' + "`n") '' 'Footer-Programmboard-Link'
$script:s = $script:s.Replace('porschedigital.atlassian.net', '${CONFIG.jiraBase.replace(/^https?:\/\//,"")}')
# Restnamen aus Kommentar-Beispielen der Login-Namenserkennung anonymisieren (seit persoenl. Uebersicht 58bf951)
$script:s = $script:s.Replace('"Zhang Tian" -> "Tian Zhang"', '"Muster Anna" -> "Anna Muster"')
$script:s = $script:s.Replace('"Zhang Tian" ' + [char]0x2192 + ' "Tian Zhang"', '"Muster Anna" ' + [char]0x2192 + ' "Anna Muster"')
$script:s = $script:s.Replace('Usernames wie "tzhang", "zhangt"', 'Usernames wie "amuster", "annam"')
$script:s = $script:s.Replace("window.__liveDataUrl='data/analytics-data.json';", 'window.__liveDataUrl=null;') # Starter: Daten stecken in der Datei bzw. localStorage
$script:s = $script:s.Replace('CARS', 'FEAT').Replace('CIA', 'PRJ').Replace('CAS', 'SUP')
$script:s = $script:s.Replace('Car Sales', 'Demo Org')
$script:s = $script:s.Replace('Analytics Kanban Dashboard — Flow Cockpit', 'Flow Cockpit — Kanban Analytics fuer euer Team')
# Kopfzeile: der Anker hiess bis zum 22.08. '◢</span> ANALYTICS · KANBAN COCKPIT'.
# Die Quelle schreibt dort inzwischen den Namen des Wertstroms — in GROSSBUCHSTABEN,
# weshalb das .Replace('Car Sales','Demo Org') darueber nicht griff und der Kundenname
# still in der Verkaufsversion stand. Deshalb jetzt mit Anker, der beim naechsten
# Textwechsel laut wird.
RepX '<span class="logo"><span class="mark">◢</span>[^<]*</span>' '<span class="logo"><span class="mark">◢</span> FLOW COCKPIT</span>' 'Kopfzeile Starter'

# pb-start.js (Porsche-Startansicht + Dark Theme, 18.08.) droppen — Starter/VA haben eigene Einstiege (va-app.js), Datei wird nicht deployt
RepX '\n<script src="pb-start\.js[^"]*"></script>' '' 'pb-start-Einbindung droppen'
# pb-ui.js-Einbindung droppen — site/ deployt kein pb-ui.js, der Tag liefe auf 404 (VA-Menü/FAB nur im /va/-Cockpit)
RepX '\n<script src="pb-ui\.js[^"]*"></script>' '' 'pb-ui-Einbindung droppen'
# pb-buddy.js droppen — der Assistent hat eine Persona (John/Ziff), die Verkaufsversion
# ist weiss. Die Meeting-Masken (pb-meet.js) bleiben: sie sind marken- und personenfrei
# und gehoeren zum Produkt. Die Datei wird unten nach site/ kopiert, Stempel = Inhalts-Hash.
RepX '\n<script src="pb-buddy\.js[^"]*"></script>' '' 'pb-buddy-Einbindung droppen'
# pb-data.js / pb-gauges.js ebenso: werden nach site/ nicht deployt und im Starter von
# nichts aufgerufen (nur pbKmm/pbTeamLogo kamen aus pb-ui). Standen bisher als drei
# 404 in der Konsole der Verkaufs-Demo (22.08.).
RepX '\n<script src="pb-data\.js[^"]*"></script>' '' 'pb-data-Einbindung droppen'
RepX '\n<script src="pb-gauges\.js[^"]*"></script>' '' 'pb-gauges-Einbindung droppen'
# Kopf-Includes der Porsche-Infrastruktur droppen — site/ deployt keine dieser Dateien
# (jeder Tag = 404 in der Konsole). pb-i18n.js (Kroatisch-Overlay) nennt zudem Kundschaft
# und Kollegen im Klartext (Car Sales, CARS-Keys, Uebersetzer) — gehoert nicht in die
# Verkaufsversion; alle pbLang/pbHr-Aufrufe der Seiten sind geguardet, setLang() faellt
# auf DE⇄EN zurueck. pb-sync/pb-store/pb-bio (SharePoint-State, Login) sind seit 26.08.
# im <head> der Quelle; einziger Aufruf im Inline-Script (window.pbSendEvent) ist geguardet.
RepX '\n<!-- Sprache: pbLang[^\n]*-->\n<script src="pb-i18n\.js[^"]*"></script>' '' 'pb-i18n-Einbindung droppen'
RepX '\n<script src="pb-sync\.js[^"]*"></script>' '' 'pb-sync-Einbindung droppen'
RepX '\n<script src="pb-store\.js[^"]*"></script>' '' 'pb-store-Einbindung droppen'
RepX '\n<script src="pb-bio\.js[^"]*"></script>' '' 'pb-bio-Einbindung droppen'
# Team-Logo-Kopf holt data/teams.json (Porsche-Miro-Infowand) — im Produkt gibt es
# weder die Datei noch die Team-IDs. Block ersatzlos raus.
RepX '(?s)\n<script>\n/\* __teamLogoHeader:.*?\n</script>' '' 'Team-Logo-Kopf droppen'

# -match ist in PowerShell von Haus aus schreibungsunabhaengig — "CAR SALES" faellt
# hier also mit auf, seit der Wertstrom-Name (22.08.) in der Liste steht.
if ($script:s -match 'porsche|Car Sales|Irsch|Benedikt|Bjoern|Guth|Traub|Niehoff|Konstantinides|Attila|Philipp Lange|Tian Zhang|Christian Hohn|Dominik') { throw 'ANONYMISIERUNG UNVOLLSTAENDIG' }

# Meeting-Masken als geteilte Datei nach site/ uebernehmen (Quelle: Porsche-Repo).
# So wandert jede Aenderung dort beim naechsten Build in die Verkaufsversion mit.
$meetSrc = Join-Path $script:src 'pb-meet.js'
if (-not (Test-Path $meetSrc)) { throw "GETEILTE DATEI FEHLT: $meetSrc" }
$meetTxt = [IO.File]::ReadAllText($meetSrc).Replace("`r`n","`n")
if ($meetTxt -match 'porsche|Car Sales|Irsch|Benedikt|Vishnu|John|Ziff') { throw 'pb-meet.js ist nicht neutral — Marken-/Personennamen gefunden' }
[IO.File]::WriteAllText("$base\site\pb-meet.js", $meetTxt, (New-Object Text.UTF8Encoding($false)))
$mh = [Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($meetTxt))
$mstamp = (($mh | ForEach-Object { $_.ToString('x2') }) -join '').Substring(0,8)
$script:s = [regex]::Replace($script:s, '<script src="pb-meet\.js[^"]*"></script>', ('<script src="pb-meet.js?v=' + $mstamp + '"></script>'))
Write-Output ("geteilt uebernommen: pb-meet.js (v={0})" -f $mstamp)

# -- 13b. Kopfangaben fuer Suchmaschinen (04.09.2026) --------------------------
# Anlass: Starter und Hilfe liegen an ZWEI Adressen — vishnu-artists.de/ (alt) und
# demo.vishnuartists.com/cockpit/ (neu). Beide antworteten mit 200, keine trug ein
# canonical. Damit hat Google zwei gleiche Anwendungen ohne Fliesstext im Index und
# muss selbst raten, welche zaehlt; im Abdeckungsbericht standen sie als
# "gecrawlt, zurzeit nicht indexiert".
#
# Was jetzt drinsteht:
#   canonical  -> die Produktseite auf der Marke. Nicht die andere Kopie: was
#                 ranken soll, ist die Seite MIT Text, nicht die Anwendung.
#   robots     -> noindex,follow. Eine Anwendung ohne Fliesstext ist kein gutes
#                 Suchergebnis; die Links darin sollen aber weiter zaehlen.
#                 Wichtig: NICHT zusaetzlich per robots.txt sperren — wer aussperrt,
#                 verhindert, dass dieses noindex ueberhaupt gelesen wird.
#   og:*       -> damit ein geteilter Link nicht als grauer Kasten ankommt.
function Kopfangaben([string]$html, [string]$titel, [string]$beschreibung, [string]$kanonisch) {
  $block = @"
<link rel="canonical" href="$kanonisch">
<meta name="robots" content="noindex,follow">
<meta property="og:type" content="website">
<meta property="og:title" content="$titel">
<meta property="og:description" content="$beschreibung">
<meta property="og:url" content="$kanonisch">
<meta property="og:image" content="https://vishnuartists.com/img/og-default.jpg">
<meta name="twitter:card" content="summary_large_image">
"@
  $block = $block -replace "`r", ''
  if ($html -match '<link rel="canonical"') { throw 'Kopfangaben stehen schon drin — Anker pruefen' }
  $i = $html.IndexOf('</head>')
  if ($i -lt 0) { throw 'kein </head> gefunden' }
  return $html.Substring(0, $i) + $block + $html.Substring($i)
}

$script:s = Kopfangaben $script:s 'Flow Cockpit - Demo mit Beispieldaten' 'Das vollstaendige Flow Cockpit mit Beispieldaten: CFD, Lead-Time-Streuung, WIP- und Aging-Ampeln. Ohne Anmeldung.' 'https://vishnuartists.com/flow-cockpit.html'
[IO.File]::WriteAllText("$base\site\flow-cockpit-starter.html", $script:s, (New-Object Text.UTF8Encoding($false)))
Write-Output ("Starter geschrieben: {0} KB" -f [math]::Round((Get-Item "$base\site\flow-cockpit-starter.html").Length/1KB))

# ── 14. Hilfe anonymisieren ────────────────────────────────────────────────────
$h = [IO.File]::ReadAllText("$script:src\hilfe.html").Replace("`r`n","`n")
$h = $h.Replace('href="index.html"', 'href="flow-cockpit-starter.html"')
# Reifegrad-Seite (12.09.2026, nur im Produkt): Link in der Kopfzeile der Hilfe. Die Quelle kennt
# die Seite nicht — sie liegt als site/reifegrad.html neben der generierten Hilfe.
$hBefore = $h.Length
$h = $h.Replace('<a href="flow-cockpit-starter.html" id="backLink" onclick="return hilfeBack(event)">', '<a href="reifegrad.html" id="reifegradLink" style="margin-left:auto;margin-right:18px">' + [char]0x1F333 + ' Reifegrad</a>' + "`n" + '  <a href="flow-cockpit-starter.html" id="backLink" style="margin-left:0" onclick="return hilfeBack(event)">')
if ($h.Length -eq $hBefore) { throw 'HILFE: backLink-Anker fuer den Reifegrad-Link nicht gefunden — Anker pruefen.' }
$h = $h.Replace('CARS', 'FEAT').Replace('CIA', 'PRJ').Replace('CAS', 'SUP').Replace('Car Sales', 'Demo Org')
# Kopfzeile der Hilfe fuehrt den Wertstrom-Namen in Grossbuchstaben — vom .Replace
# darueber nicht erfasst. Gleicher Fall wie in der Kopfzeile des Cockpits.
$h = $h.Replace('◢</em> VALUE STREAM CAR SALES · ', '◢</em> ')
# pb-ui.js-Einbindung droppen — site/ deployt kein pb-ui.js
$h = [regex]::Replace($h, '\n<script src="pb-ui\.js[^"]*"></script>', '')
# pb-buddy.js gehoert nicht ins Produkt (Persona), pb-meet.js bekommt denselben Inhalts-Stempel
$h = [regex]::Replace($h, '\n<script src="pb-buddy\.js[^"]*"></script>', '')
# Kopf-Includes droppen — gleiche Begruendung wie beim Starter (Schritt 13); der eine
# pbLang-Aufruf der Hilfe ist geguardet.
$h = [regex]::Replace($h, '\n<!-- Sprache: pbLang[^\n]*-->\n<script src="pb-i18n\.js[^"]*"></script>', '')
$h = [regex]::Replace($h, '\n<script src="pb-(sync|store|bio)\.js[^"]*"></script>', '')
# Geraete-Sync-Eintrag (SharePoint im Porsche-Tenant, seit 26.08. in hilfe.html) raus —
# pb-sync/pb-store sind oben gedroppt, das Produkt hat dieses Feature nicht. DE + EN.
$hBefore = $h.Length
$h = [regex]::Replace($h, '\n\s*<li><b>[^<]*(Ger' + [char]0x00E4 + 'te-Sync|Device sync):</b>[^\n]*</li>', '')
if ($h.Length -eq $hBefore) { throw 'HILFE: Geraete-Sync-Eintrag nicht gefunden — Anker pruefen.' }
$h = [regex]::Replace($h, '<script src="pb-meet\.js[^"]*"></script>', ('<script src="pb-meet.js?v=' + $mstamp + '"></script>'))
$h = $h.Replace('· Datenstand: 06.07.2026 ·', '·').Replace('· data as of: 2026-07-06 ·', '·')
# Confluence-Verweis (Porsche-intern, seit 21.08. in hilfe.html) raus — DE und EN.
# Kundschaft kann den Raum nicht oeffnen, und die Adresse nennt den Auftraggeber.
$hBefore = $h.Length
$h = [regex]::Replace($h, '(?s)\n  <p style="font-size:13px;color:var\(--sub\)">[^<]*Confluence.*?</a></p>', '')
if ($h.Length -eq $hBefore) { throw 'HILFE: Confluence-Absatz nicht gefunden — Anker pruefen.' }
# Porsche-Branding zurueck auf vishnuartists
# Poppins selbst gehostet (VA-13562) — siehe Kommentar in build-starter.ps1.
$h = $h.Replace('<link rel="stylesheet" href="https://cdn.ui.porsche.com/porsche-design-system/styles/font-face.7076ba0.css">', '<link rel="stylesheet" href="/fonts.css">')
$h = $h.Replace("font-family:'Porsche Next','Arial Narrow',Arial,sans-serif", 'font-family:Poppins,sans-serif')
$h = $h.Replace('--bg:#fbfcff;--card:#fff;--ink:#010205;--sub:#6b6d70;--line:#d8d8db;', '--bg:#f0f0f0;--card:#fff;--ink:#0f1010;--sub:#5f6668;--line:#e2e4e5;')
$h = $h.Replace('--brand:#1a44ea;--brand2:#2b50e8;--brand-dark:#0f2ec2;--accent:#010205}', '--brand:#89c527;--brand2:#74b62e;--brand-dark:#5c9220;--accent:#0c1013}')
$h = $h.Replace("fill='%23010205'", "fill='%230c1013'").Replace("fill='%231a44ea'", "fill='%2389c527'")
$h = $h.Replace('© 2026 <a href="https://www.porsche.digital" target="_blank" rel="noopener">Porsche Digital GmbH</a>', '© 2026 <a href="https://vishnuartists.com" target="_blank" rel="noopener">vishnuartists.com</a>')
if ($h -match 'porsche|Car Sales') { throw 'HILFE: Porsche-Branding oder Kundenname nicht entfernt' }
$h = Kopfangaben $h 'Flow Cockpit - Anleitung' 'Die Anleitung zum Flow Cockpit: Setup-Wizard, Board-Mapping, Kennzahlen und Ampeln.' 'https://vishnuartists.com/flow-cockpit.html'
[IO.File]::WriteAllText("$base\site\flow-cockpit-hilfe.html", $h, (New-Object Text.UTF8Encoding($false)))
Write-Output "Hilfe geschrieben. BUILD KOMPLETT."
