import {instance,ensureProfile,loadData,script} from '../runtime.mjs';
import {DAY,date,day,active,completed,summary,column,jira} from '../analytics/model.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profile=await ensureProfile();
if(!profile){$('homeIdentity').textContent='Bitte mit deinem Vishnu-Konto anmelden.';$('homeSignedOut').hidden=false;}
else{
 $('homeContent').hidden=false;$('homeGreeting').textContent='Hallo'+(profile.name?', '+profile.name:'')+'.';$('homeIdentity').textContent='Vishnu Artists · Coach · vollständiges Dashboard';
 $('homeActionTitle').textContent='Wiederkehrende Blocker verstehen';$('homeActionText').textContent='Besprecht die älteste begonnene Arbeit, untersucht gemeinsame Ursachen und vereinbart ein Experiment mit Reviewdatum.';
 $('homeAssessmentLink').href='index.html?legacy=1&go=team#kmmMount';
 $('homeTeams').innerHTML='<a class="btn" href="analytics.html">Alle elf Auswertungen öffnen →</a><p><a href="index.html?legacy=1&go=fl2">FL2 / FL3 · Initiativen, Ziele und Verantwortung →</a></p>';
 $('homeAgenda').innerHTML='<h2>Euer Review-Rhythmus</h2><p>Täglich: Board, WIP, Blocker und Aging.</p><p>Wöchentlich: Lieferungen, Durchlaufzeit und Verbesserungen.</p><p>Zur Planung: Nachfrage, Kapazität und Monte Carlo mit ausreichend Historie.</p><p class="hint">Empfohlener Rhythmus, keine importierten Kalendertermine.</p>';
 await script('assets/home/practice-data.js');await script('assets/home/workspace.js');
 const teams=Object.entries(instance.views).map(([id,v])=>({id,n:v.name,art:'Vishnu Artists'}));
 const week=()=>{const now=new Date(),local=new Date(now.toLocaleString('en-US',{timeZone:'Europe/Berlin'}));const monday=new Date(Date.UTC(local.getFullYear(),local.getMonth(),local.getDate()-(local.getDay()+6)%7-7));return {start:day(+monday)}};
 window.homeReview={week};window.cockpitWorkspace.init(profile,teams,teams[0]);
 $('homeReviewTeam').innerHTML='<option>Vishnu Artists</option>';$('homeReviewScope').innerHTML='<option value="team">Team</option><option value="personal">Persönlich</option>';
 $('homeReviewWeek').innerHTML=[0,1,2,3].map(i=>{const start=date(week().start)-i*7*DAY;return `<option value="${i}">${day(start)} – ${day(start+6*DAY)}</option>`}).join('');
 $('homeReadingMode').onchange=()=>{$('homeMetricHelp').hidden=$('homeReadingMode').value==='compact';};
 try{
  const data=await loadData(),names=[...new Set(data.issues.map(r=>r[8]).filter(Boolean))];
  const matches=names.filter(n=>n.toLocaleLowerCase()===profile.name.toLocaleLowerCase()),mine=matches.length===1?data.issues.filter(r=>r[8]===matches[0]):null;
  const issue=r=>`<a href="${esc(instance.jiraBase+'/browse/'+encodeURIComponent(r[0]))}" target="_blank" rel="noopener">${esc(summary(r)||r[0])}<small style="display:block">${esc(r[0])}</small></a>`;
  const work=data.issues.filter(r=>r[3]!=='E');
  $('homePersonal').innerHTML=`<p>Datenstand: ${esc(data.meta.importDate)}</p>`+(mine?`<p><b>${mine.filter(active).length}</b> begonnen · <b>${mine.filter(r=>column(r)!==5&&r[7]).length}</b> markierte Blocker</p>`:'<p>Dein Kontoname lässt sich nicht eindeutig einem Jira-Assignee zuordnen. Öffne „Meine Aufgaben“ in Jira; Teamzahlen werden hier nicht als deine ausgegeben.</p>');
  const board=document.createElement('section');board.className='card';board.id='teamBoard';board.innerHTML='<h2>Arbeit im Fluss</h2><label>Ansicht <select id="boardScope"><option value="team">Team</option>'+(mine?'<option value="personal">Meine Arbeit</option>':'')+'</select></label><p class="hint">Offene importierte Arbeit · Karten öffnen Jira · maximal 20 pro Spalte</p><div id="boardColumns" style="display:grid;grid-template-columns:repeat(5,minmax(180px,1fr));gap:12px;overflow:auto;max-height:620px"></div>';$('homePersonal').closest('section').after(board);
  function renderBoard(){const rows=($('boardScope').value==='personal'?mine:work).filter(r=>column(r)!==5);$('boardColumns').innerHTML=data.meta.colNames.slice(0,5).map((name,c)=>{const selected=rows.filter(r=>column(r)===c);return `<section style="min-width:0;background:var(--bg);border-radius:8px;padding:12px"><h3>${esc(name)} · ${selected.length}</h3>${selected.slice(0,20).map(r=>`<p>${issue(r)}${r[7]?'<small>⚑ Blockiert</small>':''}</p>`).join('')}${selected.length>20?`<a href="${esc(jira(selected))}" target="_blank" rel="noopener">Alle ${selected.length} in Jira →</a>`:''}</section>`}).join('');}
  $('boardScope').onchange=renderBoard;renderBoard();
  function review(){const start=date(week().start)-Number($('homeReviewWeek').value)*7*DAY,end=start+7*DAY,personal=$('homeReviewScope').value==='personal';$('homeReviewPeriod').textContent='Abgeschlossene Kalenderwoche · '+day(start)+' bis '+day(end-DAY)+' · Europe/Berlin';
   if(personal&&!mine){$('homeReviewStories').textContent='Keine eindeutige persönliche Jira-Zuordnung. Bitte deinen Rückblick in Jira prüfen.';return;}
   const rows=(personal?mine:work).filter(r=>completed(r)&&date(r[5])>=start&&date(r[5])<end);$('homeReviewStories').innerHTML=`<h3>${rows.length} nachgewiesene Abschlüsse</h3><p>Lieferbelege sind ein Gesprächseinstieg; sie belegen noch keinen Kundennutzen.</p>${rows.slice(0,12).map(r=>'<p>'+issue(r)+'</p>').join('')}<a href="${esc(jira(rows))}" target="_blank" rel="noopener">Abschlüsse in Jira prüfen ↗</a>`;
  }
  $('homeReviewWeek').onchange=review;$('homeReviewScope').onchange=review;review();
 }catch{$('homePersonal').textContent='Jira-Daten konnten nicht geladen werden. Bitte das Board prüfen.';$('homeReviewStories').textContent='Ohne Import ist kein verlässlicher Rückblick verfügbar.';}
}
