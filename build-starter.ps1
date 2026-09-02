# Baut die verkaufbare Starter-Variante (site/flow-cockpit-starter.html) aus cockpit.html
# und die anonymisierte Hilfe (site/flow-cockpit-hilfe.html) aus hilfe.html.
# Quelle ist das Porsche-Repo (Schwester-Checkout cs-carsales-flow-cockpit) —
# Porsche-Inhalte leben nur noch dort, nicht mehr in diesem Repo.
# Aufruf:  powershell -NoProfile -File build-starter.ps1   (oder & .\build-starter.ps1)
$ErrorActionPreference = 'Stop'
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:src = Join-Path (Split-Path -Parent $base) 'cs-carsales-flow-cockpit'
if (-not (Test-Path "$script:src\cockpit.html")) { throw "Quelle fehlt: $script:src\cockpit.html — Porsche-Repo neben diesem Repo auschecken." }
$script:s = [IO.File]::ReadAllText("$script:src\cockpit.html").Replace("`r`n","`n")

# Quelle ist auf LF normalisiert (Zeile 10). Anker/Ersetzungen aus den (CRLF-)
# Here-Strings dieses Skripts ebenfalls CR-frei machen, sonst matchen mehrzeilige
# Anker nie (Google-Drive/git flippen die Zeilenenden dieses .ps1 gern auf CRLF).
function Rep([string]$old, [string]$new, [string]$name) {
  $old = $old -replace "`r",''; $new = $new -replace "`r",''
  if (-not $script:s.Contains($old)) { throw "ANKER FEHLT (R): $name" }
  $script:s = $script:s.Replace($old, $new)
}
function RepX([string]$pattern, [string]$new, [string]$name) {
  $pattern = $pattern -replace "`r",''; $new = $new -replace "`r",''
  $rx = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $rx.IsMatch($script:s)) { throw "ANKER FEHLT (RX): $name" }
  $ev = { param($m) $new }.GetNewClosure()
  $script:s = $rx.Replace($script:s, $ev, 1)
}

# ── 0. Porsche-Branding zurueck auf vishnuartists (Verkaufsversion) ────────────
# Poppins selbst gehostet (VA-13562, 31.08.2026) — vorher zwei Requests an
# fonts.googleapis.com, also Besucher-IP an Google ohne Einwilligung.
# Der Pfad ist bewusst WURZEL-absolut: build-va.ps1 liest genau diese Datei und
# macht daraus site/va/index.html — ein relatives "fonts.css" liefe dort auf
# /va/fonts.css und damit ins 404. site/ deployt in den Domain-Root, /fonts.css
# stimmt deshalb fuer beide Seiten.
Rep '<link rel="stylesheet" href="https://cdn.ui.porsche.com/porsche-design-system/styles/font-face.7076ba0.css">' '<link rel="stylesheet" href="/fonts.css">' 'Brand-Fontlink'
Rep "font-family:'Porsche Next','Arial Narrow',Arial,'Heiti SC',SimHei,sans-serif;font-size:14px}" 'font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px}' 'Brand-Fontstack'
Rep '--bg:#fbfcff; --card:#ffffff; --ink:#010205; --sub:#6b6d70; --line:#d8d8db;' '--bg:#f0f0f0; --card:#ffffff; --ink:#0f1010; --sub:#5f6668; --line:#e2e4e5;' 'Brand-Farben1'
Rep '--accent:#010205; --brand:#1a44ea; --brand2:#2b50e8; --brand-dark:#0f2ec2;' '--accent:#0c1013; --brand:#89c527; --brand2:#74b62e; --brand-dark:#5c9220;' 'Brand-Farben2'
Rep '--blue:#1a44ea;' '--blue:#74b62e;' 'Brand-Blue'
$script:s = $script:s.Replace('background:#e9edfc;','background:#eef2e8;').Replace('background:#f7f9fe;','background:#fafbf7;').Replace('background:#f4f6fd;','background:#f7f8f4;')
Rep "fill='%23010205'" "fill='%230c1013'" 'Brand-FaviconBG'
Rep "fill='%231a44ea'" "fill='%2389c527'" 'Brand-FaviconMark'
Rep '© 2026 <a href="https://www.porsche.digital" target="_blank" rel="noopener">Porsche Digital GmbH</a> — Flow Cockpit.' '© 2026 <a href="https://vishnuartists.com" target="_blank" rel="noopener">vishnuartists.com</a> — Flow Cockpit.' 'Brand-Footer'

# ── 1. Hilfe-Verlinkung auf Starter-Hilfe umbiegen ─────────────────────────────
$script:s = $script:s.Replace('hilfe.html', 'flow-cockpit-hilfe.html')

# ── 2. Datenbloecke mit echten Keys -> Stubs (recomputeAll ueberschreibt) ──────
RepX '(?s)var REAL=\{.*?\n// Team-Datasets[^\n]*\nvar REALT=\{.*?\n// CAS-spezifisch' ("var REAL=null;`nvar REALT={};`n// CAS-spezifisch") 'REAL/REALT-Stub'
RepX 'let CASDATA=\{[^}]*\};[^\n]*' 'let CASDATA={ciaActive:0,casActive:0,frMet:0,frBreach:0,rtMet:0,rtBreach:0,casTotal:0};' 'CASDATA-Stub'
# PDATA/ANA sind in der Quelle bereits geleert (Betriebsrat: keine Individualdaten im Client) — nur absichern:
if ($script:s -notmatch 'var PDATA=\{\};') { throw 'ANKER FEHLT: Quelle enthaelt PDATA-Individualdaten (erwartet: var PDATA={};)' }

# ── 3. Generische Teams ────────────────────────────────────────────────────────
Rep @'
function subsetIss(team,scope){return RAW.filter(i=>i[3]!=='E'
  &&(team==='gesamt'||i[1]===(team==='engineering'?'e':'a'))
  &&(!scope||(scope==='cia'?i[2]==='C':i[2]==='S')));}
'@ @'
function subsetIss(team,scope){return RAW.filter(i=>i[3]!=='E'&&(team==='gesamt'||i[1]===team));}
'@ 'subsetIss'

RepX '(?s)function recomputeAll\(\)\{.*?\n  return true;\n\}' @'
function recomputeAll(){
  if(!RAW.length)return false;
  REAL=buildSetR(subsetIss('gesamt'),FROM,TO);
  REALT={};Object.keys(CONFIG.teams).forEach(k=>REALT[k]=buildSetR(subsetIss(k),FROM,TO));
  ANA={both:REALT[Object.keys(CONFIG.teams)[0]]||REAL};
  const pFrom=new Date(+FROM-(+TO-+FROM)),pTo=FROM;
  const pl=d=>String(d.getUTCDate()).padStart(2,'0')+'.'+String(d.getUTCMonth()+1).padStart(2,'0');
  PREV={label:pl(pFrom)+'–'+pl(pTo)+(pFrom<dt(RAWDATA.meta.doneWindowStart)?' ⚠':''),
    gesamt:buildSetR(subsetIss('gesamt'),pFrom,pTo)};
  Object.keys(CONFIG.teams).forEach(k=>PREV[k]=buildSetR(subsetIss(k),pFrom,pTo));
  PDATA=recomputePdata();
  REFINE={needed:RAW.filter(i=>(i[9]&1)&&(x=>x>=0&&x<=4)(colAt(i,TO))).length,done:RAW.filter(i=>i[9]&2).length};
  EPICS_OPEN=RAW.filter(i=>i[3]==='E'&&(x=>x>=0&&x<=4)(colAt(i,TO))).length;
  return true;
}
'@ 'recomputeAll generisch'

Rep "const d=DATA[view],j=JQL[view],k=d.kpi;" "const d=DATA[view]||DATA.gesamt,j=JQL[view]||JQL.gesamt,k=d.kpi;" 'DATA-Fallback'
Rep "let R=view==='gesamt'?REAL:(view==='analytics'?ANA[anaScope]:REALT[view]);" "let R=view==='gesamt'?REAL:(REALT[view]||REAL);" 'R-Auswahl'
Rep @'
  const PR=(!personLabel&&PREV)?(view==='gesamt'?PREV.gesamt:view==='engineering'?PREV.engineering
    :(anaScope==='cia'?PREV.cia:anaScope==='cas'?PREV.cas:PREV.analytics)):null;
'@ @'
  const PR=(!personLabel&&PREV)?(PREV[view]||PREV.gesamt):null;
'@ 'PR-Auswahl'

Rep @'
  const name=label||(view==='analytics'
    ?(anaScope==='cia'?tr('Analysten (nur CIA)','Analysts (CIA only)'):anaScope==='cas'?tr('Analysten (nur CAS)','Analysts (CAS only)'):tr('Analysten-Team','Analytics team'))
    :(view==='engineering'?tr('Engineering-Team','Engineering team'):tr('Gesamtsystem (CIA+CAS)','Overall system (CIA+CAS)')));
'@ @'
  const name=label||(view==='gesamt'?tr('Gesamtsystem','Overall system'):(CONFIG.teams[view]||view));
'@ 'computeAssess-Name'

# CAS-SLA-Regeln aus computeAssess entfernen (Panel existiert im Starter nicht)
RepX "(?s)\n  if\(view==='analytics'\)\{\n    const frTot=.*?\n  \}\n  return A;" ("`n  return A;") 'computeAssess-CAS-Block'

# Refinement-KPI nur im Analytics-Kontext (Team-Label enthaelt "analy")
Rep ("  if(view==='analytics'){`n    const rTot=REFINE") ("  if(/analy/i.test(CONFIG.teams[view]||'')){`n    const rTot=REFINE") 'Refinement-Analytics'

Rep "document.getElementById('anaFilter').style.display=(view==='analytics')?'flex':'none';" "document.getElementById('anaFilter').style.display='none';" 'anaFilter-aus'
Rep "if(view!=='analytics' || anaScope==='cia' || personMode){el.style.display='none';return;}" "{el.style.display='none';return;}" 'casPanel-aus'
Rep "  const R=team==='engineering'?REALT.engineering:team==='analytics'?REALT.analytics:REAL;" "  const R=REALT[team]||REAL;" 'coachTips-R'

# Analysten-CAS-Tipp raus, Refinement-Tipp-Sprungziel generisch
$patCasTip = @'
(?s)\n      t\.push\(\['warn',tr\(.CAS-SLAs: nur.*?'analytics','casRT'\]\);
'@
RepX $patCasTip.Trim() '' 'coachTips-CAS-Tipp'
Rep ",'analytics','kpis']);" ",'gesamt','kpis']);" 'Refinement-Tipp-Ziel'

Rep "  [['Engineer',CONFIG.teams.engineering],['Analyst',CONFIG.teams.analytics],['PO','Product Owner']" "  [['Analyst',tr('Analysten','Analysts')],['Engineer','Engineers'],['PO','Product Owner']" 'initCoach-Gruppen'
Rep "' · Team: '+esc(p[2]==='engineering'?CONFIG.teams.engineering:CONFIG.teams.analytics)" "' · Team: '+esc(CONFIG.teams[p[2]]||p[2])" 'renderCoach-Teamlabel'

# initCoach nullsicher: bei Porsche kommt USER immer aus dem Portal-Login (vsAuth),
# im Starter gibt es kein Portal — anonymer Erstaufruf darf nicht crashen.
# initCoach-nullsafe: obsolet seit 16.07.2026 — cockpit.html ist selbst schon null-safe (} else if(USER&&USER.name){)

# applyStatic: Tabs werden dynamisch gebaut -> statischen Uebersetzungsblock entfernen
$patTabs = @'
(?s)\n  // Tabs\n  const tabs=\{gesamt:.*?forEach\(t=>\{const m=tabs\[t\.dataset\.view\];.*?\}\);
'@
RepX $patTabs.Trim() '' 'applyStatic-Tabs'

# Statische Tabs -> leerer Container
RepX '(?s)  <div class="tabs" id="tabs">.*?</div>\r?\n  </div>' ("  <div class=""tabs"" id=""tabs""></div>") 'Tabs-HTML'

# Tab-Handler -> buildTabs()
Rep @'
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');
  const v=t.dataset.view;
  if(v==='programm'){document.getElementById('flowview').style.display='none';
    document.getElementById('progview').style.display='block';renderProg();}
  else{document.getElementById('progview').style.display='none';
    document.getElementById('flowview').style.display='block';renderFlow(v);}
  if(typeof buildRails==='function')buildRails();
}));
'@ @'
function buildTabs(){
  const tb=document.getElementById('tabs');
  let h='<div class="tab active" data-view="gesamt">'+tr('Gesamtsystem','Overall system')+'<small>'+tr('alle Teams','all teams')+'</small></div>';
  Object.keys(CONFIG.teams).forEach(k=>{h+='<div class="tab" data-view="'+k+'">'+CONFIG.teams[k]+'<small>Team</small></div>';});
  h+='<div class="tab" data-view="programm">'+tr('Programm-Board','Program board')+'<small>Demo · SAFe</small></div>';
  tb.innerHTML=h;
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');
    const v=t.dataset.view;
    if(v==='programm'){document.getElementById('flowview').style.display='none';
      document.getElementById('progview').style.display='block';renderProg();}
    else{document.getElementById('progview').style.display='none';
      document.getElementById('flowview').style.display='block';renderFlow(v);}
    if(typeof buildRails==='function')buildRails();
  }));
}
buildTabs();
'@ 'buildTabs'

Write-Output "Teil 1 ok — Struktur transformiert."
. "$base\build-starter-part2.ps1"
