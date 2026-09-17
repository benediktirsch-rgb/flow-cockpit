import {instance,ensureProfile,loadData} from "../runtime.mjs";
import {views,DAY,date,day,project,summary,column,rowsFor,periodCohort,metrics,jira,canView,scopeOptions,normalizeScope} from './model.mjs?v=20260917-insights2';
import {renderInsights,clearInsights} from './insights.mjs?v=20260917-insights2';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let en=false,profile=await ensureProfile();try{en=localStorage.getItem("vsLang")==="en"}catch{}
const T=(de,eng)=>en?eng:de,params=new URLSearchParams(location.search);
let team=Object.hasOwn(views,params.get('team'))?params.get('team'):instance.defaultTeam,question=params.get('question')||'delivery',data=null,page=0,request=0;
const cache=new Map(),today=day(Date.now());
const sourceNames=Object.fromEntries(['all',...new Set(Object.values(views).flatMap(v=>v.projects))].map(id=>[id,id==='all'?['Alle Projekte','All projects']:[id,id]]));
const questions={delivery:['Was haben wir geliefert?','What have we delivered?'],time:['Wie lange dauert es?','How long does it take?'],blockers:['Wo steckt Arbeit fest?','Where is work stuck?'],care:['Was braucht Aufmerksamkeit?','What needs attention?']};
if(!Object.hasOwn(questions,question))question='delivery';
function options(el,opts,value){el.innerHTML=opts.map(([id,de,eng])=>`<option value="${id}">${esc(T(de,eng||de))}</option>`).join('');el.value=opts.some(x=>x[0]===value)?value:opts[0]?.[0]||'';}
function labels(){
 document.documentElement.lang=en?'en':'de';$('language').textContent=en?'DE':'EN';
 $('workspaceLink').textContent=T('Mein Arbeitsplatz','My workspace');
 $('modelGuide').innerHTML='<summary>🪜 KMM · '+T('Reife','Maturity')+' &nbsp; | &nbsp; ▱ Flight Levels · '+T('Zusammenarbeit','Collaboration')+'</summary><p>'+T('KMM (ML0–ML6) beschreibt die Reife des Arbeitssystems. Flight Levels beschreiben die Zusammenarbeit: FL1 operativ, FL2 koordinierend, FL3 strategisch. Kennzahlen allein bestätigen keinen KMM-Reifegrad.','KMM (ML0–ML6) describes work system maturity. Flight Levels describe collaboration: FL1 operations, FL2 coordination, FL3 strategy. Metrics alone cannot confirm a KMM maturity level.')+'</p><a href="home-v2.html#assessmentBridge">'+T('KMM-Selbstbild und nächste Schritte →','KMM self-assessment and next steps →')+'</a>';
 const fields={team:['Team / Bereich','Team / area'],scope:['Arbeitsquelle','Work source'],period:['Zeitraum','Period'],from:['Von','From'],to:['Bis','To'],type:['Ticketart','Issue type'],status:['Status','Status'],flagged:['Nur markierte Blocker','Flagged blockers only'],search:['Titel oder ID suchen','Find title or ID']};
 for(const [key,pair]of Object.entries(fields))document.querySelector(`[data-label="${key}"]`).textContent=T(...pair);
 const text={moreFilters:['Weitere Filter','More filters'],reset:['Zurücksetzen','Reset'],refresh:['Aktualisieren','Refresh'],questionTitle:['Welche Frage möchtest du klären?','What would you like to understand?'],reviewEyebrow:['FL1 · OPERATIVER FLOW','FL1 · OPERATIONAL FLOW'],definitionTitle:['Datenbasis und Grenzen','Data basis and limits'],flowTitle:['Wo liegt die Arbeit?','Where is the work?'],flowHint:['Offen + Abschlüsse im Zeitraum','Open + closures in period'],throughputTitle:['Abschlüsse im Verlauf','Completions over time'],throughputHint:['7-Tage-Intervalle','7-day intervals'],workEyebrow:['VON DER ZAHL ZUR ARBEIT','FROM METRICS TO WORK'],tableTitle:['Tickets hinter der Auswahl','Issues behind the selection'],sortLabel:['Sortieren','Sort'],previous:['Zurück','Previous'],next:['Weiter','Next'],nextEyebrow:['GEMEINSAM VERBESSERN','IMPROVING TOGETHER'],nextTitle:['Aus Beobachtungen nächste Schritte machen','Turn observations into next steps'],practiceLink:['Praktiken entdecken →','Explore practices →'],detailLink:['Visuelle Analysen →','Visual analyses →'],footerText:[instance.name,instance.name]};
 for(const[id,pair]of Object.entries(text))$(id).textContent=T(...pair);
 options($('team'),Object.entries(views).map(([id,v])=>[id,v.name+(v.pending?T(' · in Erstellung',' · being created'):'')]),team);
 options($('scope'),scopeOptions(team).map(id=>[id,...sourceNames[id]]),normalizeScope(team,$('scope').value||params.get('scope')));
 options($('type'),[['work','Arbeit ohne Epics','Work excluding epics'],['all','Alle inkl. Epics','All incl. epics'],['S','Stories'],['T','Tasks'],['B','Bugs'],['X','Technische Tasks','Technical tasks'],['E','Epics']],$('type').value||params.get('type')||'work');
 options($('status'),[['all','Alle','All'],['open','Offen inkl. Backlog','Open incl. backlog'],['active','Begonnen · WIP','Started · WIP'],['done','Abgeschlossen','Closed']],$('status').value||params.get('status')||'all');
 options($('period'),[['28','28 Tage','28 days'],['84','12 Wochen','12 weeks'],['custom','Eigener Zeitraum','Custom period']],$('period').value||'28');
 options($('sort'),[['age','Älteste zuerst','Oldest first'],['key','Ticket','Issue'],['state','Workflow','Workflow']],$('sort').value||'age');
 $('questions').innerHTML=Object.entries(questions).map(([id,pair])=>`<button type="button" data-question="${id}" aria-pressed="${id===question}">${T(...pair)}</button>`).join('');
 $('teamLinks').innerHTML='';
 $('title').textContent=views[team].name;document.title=views[team].name+' · Flow Cockpit';
 $('intro').textContent=T('Vollständige Coach-Sicht: Flow verstehen und gemeinsam verbessern.','Full coach view: understand flow and improve together.');
 $('boardLink').hidden=!!views[team].pending;
 if(views[team].board)$('boardLink').href=`${instance.jiraBase}/jira/software/c/projects/${views[team].project}/boards/${views[team].board}`;
 $('detailLink').href='#insights';
 $('programLink').textContent=T('FL2 · Programm','FL2 · Program');$('programLink').href=instance.coordinationUrl;
}
function note(){ $('scopeNote').textContent=T('Alle im Team sind Coaches. Alle elf Auswertungen sind verfügbar. Das bestätigt keinen KMM-Reifegrad.','Everyone is a coach. All eleven analyses are available. This does not confirm a KMM maturity level.'); }
function saveUrl(){const q=new URLSearchParams({team,scope:$('scope').value,from:$('from').value,to:$('to').value,type:$('type').value,status:$('status').value,question});if($('flagged').checked)q.set('flagged','1');if($('search').value)q.set('q',$('search').value);history.replaceState(null,'','analytics.html?'+q);}
const link=(rows,label)=>rows.length?`<a href="${esc(jira(rows))}" target="_blank" rel="noopener">${esc(label)} ↗</a>`:esc(label);
function metric(title,value,explanation,rows,unit=''){
 return `<article class="metric"><h3>${esc(title)}</h3>${rows?.length?`<a class="value" href="${esc(jira(rows))}" target="_blank" rel="noopener" aria-label="${esc(title+': '+value+' '+unit)}">${esc(value)}<small> ${esc(unit)} ↗</small></a>`:`<span class="value">${esc(value)}<small> ${esc(unit)}</small></span>`}<p>${esc(explanation)}</p></article>`;
}
function render(){
 note();saveUrl();if(!data)return;
 const valid=date($('from').value)<=date($('to').value)&&date($('to').value)-date($('from').value)<=3*366*DAY;
 if(!valid){clearInsights();$('sourceStatus').className='error';$('sourceStatus').textContent=T('Bitte einen gültigen Zeitraum von höchstens drei Jahren wählen.','Choose a valid period of at most three years.');$('dashboard').hidden=true;return;}
 $('dashboard').hidden=false;const stale=Date.now()-date(data.meta.importDate)>2*DAY;
 $('sourceStatus').className=stale?'error':'';$('sourceStatus').textContent=T('Datenstand: ','Imported: ')+data.meta.importDate+' · '+T('Quelle: Jira-Board ','Source: Jira board ')+data.meta.board+(stale?T(' · Import älter als zwei Tage',' · Import older than two days'):'');
 const filters={project:$('scope').value,type:$('type').value,status:$('status').value,flagged:$('flagged').checked,q:$('search').value};
 const selected=rowsFor(data,filters);
 const rows=periodCohort(selected,$('from').value,$('to').value);
 const m=metrics(rows,$('from').value,$('to').value,data.meta.importDate),d=T('T','d'),n=x=>x==null?'—':Number(x.toFixed(1));
 $('cohort').textContent=rows.length+' '+T('Tickets in der Auswahl','issues in selection');
 const sample=T('Abschlüsse im Zeitraum. „Won’t Do“ und Duplikate zählen nicht als Lieferung.','Completions in the period. “Won’t Do” and duplicates do not count as delivery.');
 if(question==='delivery')$('metrics').innerHTML=metric(T('Erledigt im Zeitraum','Completed in period'),m.done.length,sample,m.done)+metric(T('Aktuell begonnen','Current work in progress'),m.wip.length,T('Discovery bis Review. Bestand am Importtag, unabhängig vom Abschlusszeitraum.','Discovery through review. Snapshot at import time, independent of completion period.'),m.wip)+metric(T('Lead Time · Median','Lead time · median'),n(m.lead50),T('Anlage → Abschluss. Stichprobe: ','Created → completed. Sample: ')+m.leadRows.length,m.leadRows,d);
 if(question==='time')$('metrics').innerHTML=metric(T('Lead Time · Median','Lead time · median'),n(m.lead50),T('Anlage → Abschluss. Stichprobe: ','Created → completed. Sample: ')+m.leadRows.length,m.leadRows,d)+metric('Lead Time · p85',n(m.lead85),T('Historische Verteilung, keine Liefergarantie. Stichprobe: ','Historical distribution, not a delivery guarantee. Sample: ')+m.leadRows.length,m.leadRows,d)+metric('Cycle Time · Median',n(m.cycle50),T('Erster Einstieg in Discovery/WIP → Abschluss. Stichprobe: ','First entry into discovery/WIP → completion. Sample: ')+m.cycleRows.length,m.cycleRows,d);
 if(question==='blockers')$('metrics').innerHTML=metric(T('Markierte Blocker','Flagged blockers'),m.blocked.length,T('Offene Tickets mit Flag. Nicht gepflegte Blockaden sind unsichtbar.','Open flagged issues. Unrecorded blockers remain invisible.'),m.blocked)+metric(T('Über 30 Tage im Prozess','Over 30 days in process'),m.aged.length,T('Begonnene, offene Arbeit seit dem ersten WIP-Einstieg. Gesprächseinstieg, kein SLA.','Started, open work since first WIP entry. A discussion prompt, not an SLA.'),m.aged)+metric(T('Termin überschritten','Overdue'),m.overdue.length,T('Offene Tickets mit Fälligkeitsdatum vor dem Importtag.','Open issues with a due date before the import day.'),m.overdue);
 if(question==='care')$('metrics').innerHTML=metric(T('Termin überschritten','Overdue'),m.overdue.length,T('Nächsten Schritt und Termin mit dem Team klären.','Review next steps and dates with the team.'),m.overdue)+metric(T('Über 30 Tage im Prozess','Over 30 days in process'),m.aged.length,T('Alte Arbeit fertigstellen, teilen oder bewusst beenden.','Complete, split or deliberately close old work.'),m.aged)+metric(T('Offen im Backlog','Open in backlog'),rows.filter(r=>column(r)===0).length,T('Noch nicht begonnen. Alter allein ist kein Löschgrund.','Not started yet. Age alone is not a reason to delete.'),rows.filter(r=>column(r)===0));
 $('definitions').innerHTML=`<p>${esc(T('Alle Kennzahlen verwenden dieselbe Projekt-, Typ-, Status- und Blockerauswahl. Der Zeitraum begrenzt Abschlüsse; WIP und Blocker zeigen den aktuellen Import.','All metrics share the same project, type, status and blocker filters. Dates constrain completions; WIP and blockers reflect the current import.'))}</p><p>${esc(T('Standard: Arbeit ohne Epics; gezählt werden die importierten Ticketarten. „Done“ setzt eine erfolgreiche Resolution und den letzten Workflow-Schritt voraus. Fehlende oder unbekannte Resolution zählt nicht als nachgewiesene Lieferung.','Default: work excluding epics; imported issue types are counted. “Done” requires a successful resolution and the final workflow stage. Missing or unknown resolutions are not counted as proven deliveries.'))}</p><p>${esc(T('Die Metriken zählen importierte Tickets, keine Personenleistung. Historische Abschlüsse vor ','Metrics count imported issues, not individual performance. Historical completions before ')+data.meta.doneWindowStart+T(' fehlen.',' are absent.'))}</p>`;
 const cols=data.meta.colNames||['Backlog','Discovery','Ready','In Progress','Review','Done'];
 const groups=cols.map((name,i)=>({name,rows:rows.filter(r=>column(r)===i)}));
 function bars(groups){const max=Math.max(1,...groups.map(x=>x.rows.length));return groups.map(x=>`<a class="bar-row" href="${esc(jira(x.rows))}" target="_blank" rel="noopener" aria-label="${esc(x.name+': '+x.rows.length)}"><span>${esc(x.name)}</span><span class="bar-track"><span class="bar-fill" style="display:block;width:${x.rows.length/max*100}%"></span></span><strong>${x.rows.length}</strong></a>`).join('');}
 $('flow').innerHTML=bars(groups);$('throughput').innerHTML=m.weeks.length?bars(m.weeks.map(w=>({name:w.start,rows:w.rows}))):'';
 $('support').hidden=true;
 const sorted=[...rows].sort((a,b)=>$('sort').value==='key'?a[0].localeCompare(b[0],undefined,{numeric:true}):$('sort').value==='state'?column(a)-column(b):(Number(column(a)===5)-Number(column(b)===5))||date(a[4])-date(b[4]));
 const pages=Math.max(1,Math.ceil(sorted.length/25));page=Math.min(page,pages-1);
 $('tableHead').innerHTML='<tr>'+[T('Issue / Titel','Issue / title'),T('Projekt','Project'),T('Typ','Type'),'Workflow',T('Angelegt','Created'),T('Abschluss','Completed'),T('Flag','Flag')].map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr>';
 $('tickets').innerHTML=sorted.slice(page*25,page*25+25).map(r=>`<tr><td><a href="${instance.jiraBase}/browse/${encodeURIComponent(r[0])}" target="_blank" rel="noopener">${esc(summary(r)||T('Titel noch nicht importiert','Title not imported yet'))} ↗</a><small class="issue-key">${esc(r[0])}</small></td><td>${esc(project(r))}</td><td>${esc({S:'Story',T:'Task',B:'Bug',E:'Epic',X:'Technical task'}[r[3]]||r[3])}</td><td><span class="state">${esc(cols[column(r)]||T('Nicht zugeordnet','Unmapped'))}</span></td><td>${esc(r[4]||'—')}</td><td>${esc(r[5]||'—')}</td><td>${r[7]?T('Markiert','Flagged'):'—'}</td></tr>`).join('')||`<tr><td colspan="7" class="empty">${T('Keine Tickets für diese Filter. Auswahl zurücksetzen oder eine andere Arbeitsquelle wählen.','No issues match these filters. Reset filters or choose another work source.')}</td></tr>`;
 $('tableContext').innerHTML=`<div class="table-context"><span>${T('Offene Arbeit und Abschlüsse im gewählten Zeitraum.','Open work and closures in the selected period.')}</span>${link(sorted.slice(page*25,page*25+25),T('Diese Seite in Jira','This page in Jira'))}</div>`;
 $('pageCount').textContent=T('Seite ','Page ')+(page+1)+' / '+pages;$('previous').disabled=page===0;$('next').disabled=page+1>=pages;
 renderInsights({profile,team,en,data,rows,selected,m,from:$('from').value,to:$('to').value,filters});
 $('nextText').textContent=T('Besprecht die älteste begonnene Arbeit und wiederkehrende Blocker. Vereinbart eine konkrete Änderung mit Beleg und Reviewdatum. Kennzahlen liefern Hinweise, keinen automatisch bewiesenen Reifegrad.','Discuss the oldest started work and recurring blockers. Agree on one concrete change, evidence and a review date. Metrics provide signals, not an automatically proven maturity level.');
}
async function load(force=false){
 clearInsights();
 const token=++request;data=null;$('refresh').disabled=false;$('dashboard').hidden=true;$('pending').hidden=true;$('access').hidden=true;labels();note();saveUrl();

 if(!canView(profile,team)){$('sourceStatus').textContent='';$('access').hidden=false;$('access').innerHTML=`<h2>${T('Bestehenden Cockpit-Zugang verwenden','Use your existing cockpit account')}</h2><p>${T('Diese Teamansicht nutzt deine vorhandene Profilzuordnung. Sie erweitert keine Zugriffsrechte.','This team view uses your existing profile assignment. It does not expand access rights.')}</p><a class="button" href="index.html#login">${T('Zur Anmeldung / Profilwahl','Sign in / choose profile')} →</a>`;return;}
 $('sourceStatus').className='';$('sourceStatus').textContent=T('Jira-Import wird geladen …','Loading Jira import …');$('refresh').disabled=true;
 try{const source=views[team].source;let loaded=cache.get(source);if(!loaded||force){loaded=await loadData(source);cache.set(source,loaded);}if(token!==request)return;data=loaded;render();}
 catch(e){if(token!==request)return;$('sourceStatus').className='error';$('sourceStatus').textContent=T('Daten konnten nicht geladen werden. Bitte erneut versuchen oder das Jira-Board öffnen. Keine Demo- oder Nullwerte werden eingesetzt.','Data could not be loaded. Try again or open the Jira board. No demo or zero values are substituted.');}
 finally{if(token===request)$('refresh').disabled=false;}
}
$('from').value=Number.isFinite(date(params.get('from')))?params.get('from'):day(Date.now()-27*DAY);$('to').value=Number.isFinite(date(params.get('to')))?params.get('to'):today;
if(params.has('from')||params.has('to'))$('period').value='custom';$('flagged').checked=params.get('flagged')==='1';$('search').value=params.get('q')||'';
$('team').addEventListener('change',()=>{team=$('team').value;page=0;load();});
for(const id of ['scope','type','status','flagged','sort'])$(id).addEventListener('change',()=>{page=0;render();});
for(const id of ['from','to'])$(id).addEventListener('change',()=>{$('period').value='custom';page=0;render();});
$('period').addEventListener('change',()=>{if($('period').value!=='custom'){$('to').value=today;$('from').value=day(date(today)-(Number($('period').value)-1)*DAY);page=0;render();}});
let searchTimer;$('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=0;render()},120);});
$('questions').addEventListener('click',e=>{const button=e.target.closest('[data-question]');if(!button)return;question=button.dataset.question;for(const b of $('questions').children)b.setAttribute('aria-pressed',String(b===button));render();});
$('refresh').addEventListener('click',()=>load(true));$('language').addEventListener('click',()=>{en=!en;try{localStorage.setItem('vsLang',en?'en':'de')}catch{}labels();if(data)render();else load();});
$('reset').addEventListener('click',()=>{$('scope').value=scopeOptions(team)[0];$('type').value='work';$('status').value='all';$('flagged').checked=false;$('search').value='';$('period').value='28';$('from').value=day(date(today)-27*DAY);$('to').value=today;page=0;render();});
$('previous').addEventListener('click',()=>{page=Math.max(0,page-1);render();});$('next').addEventListener('click',()=>{page++;render();});
load();
