/* ═══ va-fl.js — Flight Level 2+3 (Board STA) für das VA Flow Cockpit ═══
   Wird von build-va.ps1 NACH dem Cockpit-Hauptscript und VOR va-app.js eingebunden. Nutzt die globalen
   Bindings des Cockpits (RAW, RAWDATA, TO, dt, D1, colAt, isRealDone, tr, esc, CONFIG, PEOPLE, USER,
   drillShow). Der Tab „Flight Level 2+3“ ruft renderFL() → vaFL.render().

   Aufbau folgt dem Porsche-Programm-Board (UX-Fluss von oben nach unten):
     0 Auf einen Blick      — sechs Fragen, sechs Zahlen, Kachel springt in den Abschnitt
     1 Coach-Einschätzung   — regelbasierte Hinweise: jede Aussage nennt Zahl + Regel (kein Bauchgefühl, keine KI)
     2 Verantwortung & Pflege — wer pflegt welche Initiativen/Key Results? Pflege-Ampel je Vorgang,
                              Aufmerksamkeitsliste („diese Initiativen brauchen jetzt Pflege“), FL2+FL3-Rangliste
     3 Kennzahlen (Quartal)  — Fluss auf FL2 mit Δ zum Vorquartal
     4 Entwicklung           — Balken je Quartal (FL2 Initiativen) + dieselben Quartale eine Ebene tiefer (FL1 Stories)
     5 Strategische Themen → Initiativen · 6 Risiken · 7 Key Results (KPIs) · 8 Wie wird gerechnet?

   Datenquelle: RAWDATA.meta.fl aus scripts/fetch-va-data.mjs (stündlich). Alte Datenstände ohne
   Pflege-Felder/Historie werden erkannt → die Seite zeigt, was möglich ist, und sagt, was fehlt. */
(function(){
  'use strict';
  var VER='0818b';
  var T=function(d,e){ return (typeof tr==='function')?tr(d,e):d; };
  var E=function(s){ return (typeof esc==='function')?esc(s):String(s==null?'':s); };
  var jb=function(){ try{ return CONFIG.jiraBase.replace(/^https?:\/\//,''); }catch(e){ return 'vishnuartists.atlassian.net'; } };
  var link=function(k){ return '<a href="https://'+jb()+'/browse/'+E(k)+'" target="_blank" rel="noopener" style="font-weight:700;white-space:nowrap">'+E(k)+'</a>'; };
  var nn=function(s){return String(s||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();};
  var fmtD=function(iso){ return iso?String(iso).slice(0,10).split('-').reverse().join('.'):'—'; };
  var now=function(){ try{ return TO; }catch(e){ var t=new Date(); t.setUTCHours(0,0,0,0); return t; } };
  var days=function(a,b){ return Math.round((b-a)/86400000); };
  var D=function(s){ try{ return dt(s); }catch(e){ return new Date(s+'T00:00:00Z'); } };
  var pct=function(arr,p){ if(!arr.length)return null; var a=arr.slice().sort(function(x,y){return x-y;}); var i=Math.min(a.length-1,Math.max(0,Math.ceil(p/100*a.length)-1)); return a[i]; };
  var NOTDONE=/won.?t (do|fix)|duplicate|cannot reproduce|not required|rejected|declined|cancel|obsolete|invalid/i;

  /* ───────── Styles ───────── */
  var css=document.createElement('style'); css.id='vaFlCss';
  css.textContent=[
    /* Wegweiser: sticky Schrittleiste, aktueller Abschnitt hervorgehoben (Scroll-Spy) */
    '.vfl-nav{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 -4px 14px;padding:8px 4px;font-size:12px;background:var(--bg,#f0f0f0);border-bottom:1px solid var(--line,#e2e4e5)}',
    '.vfl-nav a{cursor:pointer;background:var(--card,#fff);border:1px solid var(--line,#e2e4e5);border-radius:20px;padding:3px 11px 3px 4px;font-weight:600;color:var(--sub,#5f6668);display:inline-flex;align-items:center;gap:6px;white-space:nowrap} .vfl-nav a b{display:inline-flex;width:18px;height:18px;border-radius:50%;background:var(--line,#e2e4e5);color:var(--ink,#0f1010);font-size:10.5px;align-items:center;justify-content:center} .vfl-nav a:hover{border-color:var(--brand,#89c527);color:var(--ink)} .vfl-nav a.on{border-color:var(--brand,#89c527);color:var(--ink,#0f1010)} .vfl-nav a.on b{background:var(--brand,#89c527);color:#fff}',
    '.vfl-nav .st{margin-left:auto;color:var(--sub,#5f6668)}',
    'h2.section.vfl-sec .no{display:inline-flex;width:20px;height:20px;border-radius:50%;background:var(--brand,#89c527);color:#fff;font-size:11px;align-items:center;justify-content:center;margin-right:8px;vertical-align:-3px;letter-spacing:0}',
    '.vfl-next{display:flex;justify-content:flex-end;margin:10px 0 4px;font-size:12px} .vfl-next span{cursor:pointer;color:var(--brand-dark,#5c9220);font-weight:700;background:var(--card,#fff);border:1px solid var(--line,#e2e4e5);border-radius:20px;padding:4px 12px} .vfl-next span:hover{border-color:var(--brand,#89c527)}',
    /* Einklappen (fold) + Anteasern (more) — ein Muster fuer alle Abschnitte */
    '.vfl-fold{border:1px solid var(--line,#e2e4e5);border-radius:10px;background:var(--card,#fff)} .vfl-fold .vfl-fs{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;font-size:13px;font-weight:700;user-select:none} .vfl-fold .vfl-fs:hover{background:var(--bg,#f7f8f4)} .vfl-fold .car{color:var(--sub,#5f6668);width:12px} .vfl-fold .fh{flex:1;min-width:0} .vfl-fold .fh .bd{font-weight:400;font-size:11.5px;color:var(--sub,#5f6668)} .vfl-fold .fx{font-size:11px;font-weight:600;color:var(--brand-dark,#5c9220);white-space:nowrap} .vfl-fold .vfl-fb{padding:4px 12px 12px;border-top:1px dashed var(--line,#e2e4e5)}',
    '.vfl-more{display:flex;justify-content:center;margin-top:8px} .vfl-more .subtab{font-size:11.5px;padding:3px 12px}',
    '#chartRail .rl-i.on{background:var(--bg,#f7f8f4);font-weight:700} #chartRail .rl-i .ic{font-size:11px;font-weight:800;color:var(--sub,#5f6668)} #chartRail .rl-i.on .ic{color:var(--brand-dark,#5c9220)}',
    'html[data-theme=dark] .vfl-nav{background:var(--bg,#0f1113)}',
    '.vfl-intro{font-size:12.5px;color:var(--sub,#5f6668);margin:-4px 0 12px}',
    '.vfl-head{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:6px}',
    '.vfl-hc{display:block;background:var(--card,#fff);border:1px solid var(--line,#e2e4e5);border-left:5px solid var(--grey,#97a0af);border-radius:12px;padding:12px 14px;cursor:pointer;text-decoration:none;color:inherit;transition:.12s;box-shadow:var(--shadow,none)}',
    '.vfl-hc:hover{transform:translateY(-1px);border-color:var(--brand,#89c527)}',
    '.vfl-hc .q{font-size:12px;font-weight:700;color:var(--sub,#5f6668)} .vfl-hc .v{font-size:26px;font-weight:800;margin:4px 0 2px;letter-spacing:-.3px} .vfl-hc .v .u{font-size:12px;font-weight:600;color:var(--sub,#5f6668);margin-left:4px} .vfl-hc .s{font-size:11.5px;color:var(--sub,#5f6668);line-height:1.45}',
    '.vfl-hc.h-green{border-left-color:var(--green,#36b37e)} .vfl-hc.h-yellow{border-left-color:var(--yellow,#ffab00)} .vfl-hc.h-red{border-left-color:var(--red,#ff5630)} .vfl-hc.h-blue{border-left-color:var(--brand,#89c527)}',
    '.vfl-dl{display:inline-block;font-size:11px;font-weight:700;border-radius:8px;padding:0 6px;margin-left:6px;vertical-align:middle} .vfl-dl.up{background:#e3fcef;color:#006644} .vfl-dl.down{background:#ffebe6;color:#bf2600} .vfl-dl.flat{background:#ebecf0;color:#5e6c84}',
    '.vfl-coach{background:var(--card,#fff);border:1px solid var(--line,#e2e4e5);border-radius:12px;padding:14px 18px;margin-bottom:6px}',
    '.vfl-coach .by{font-size:11.5px;color:var(--sub,#5f6668);margin-bottom:8px}',
    '.vfl-watch{border-left:4px solid var(--grey,#97a0af);background:var(--bg,#f7f8f4);border-radius:8px;padding:8px 12px;margin:8px 0;font-size:12.5px;line-height:1.5}',
    '.vfl-watch b{display:block;margin-bottom:2px} .vfl-watch.w-red{border-left-color:var(--red,#ff5630)} .vfl-watch.w-yellow{border-left-color:var(--yellow,#ffab00)} .vfl-watch .rule{font-size:11px;color:var(--sub,#5f6668);margin-top:3px} .vfl-watch .go{cursor:pointer;color:var(--brand-dark,#5c9220);font-weight:700;margin-left:6px;white-space:nowrap}',
    '.vfl-good{font-size:12.5px;margin-top:8px;color:#006644;background:#e3fcef;border-radius:8px;padding:7px 12px}',
    '.vfl-tab{width:100%;border-collapse:collapse;font-size:12.5px} .vfl-tab th{text-align:left;padding:7px 8px;border-bottom:2px solid var(--brand,#89c527);font-size:11px;text-transform:uppercase;letter-spacing:.3px;color:var(--sub,#5f6668);white-space:nowrap} .vfl-tab td{padding:6px 8px;border-bottom:1px solid var(--line,#e2e4e5);vertical-align:top} .vfl-tab tr:last-child td{border-bottom:0} .vfl-tab .num{text-align:right;font-variant-numeric:tabular-nums} .vfl-tab tr.cur td{background:var(--bg,#f7f8f4);font-weight:700}',
    '.vfl-tag{display:inline-block;font-size:10px;font-weight:700;border-radius:8px;padding:1px 7px;margin:1px 3px 1px 0;white-space:nowrap;background:#ebecf0;color:#5e6c84}',
    '.vfl-tag.g{background:#e3fcef;color:#006644} .vfl-tag.y{background:#fff7e6;color:#8a5a00} .vfl-tag.r{background:#ffebe6;color:#bf2600} .vfl-tag.b{background:#e9f2dc;color:#3f6b12}',
    '.vfl-own{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;background:var(--bg,#f7f8f4);border:1px solid var(--line,#e2e4e5);border-radius:14px;padding:2px 9px 2px 4px;white-space:nowrap} .vfl-own i{display:inline-flex;width:18px;height:18px;border-radius:50%;background:var(--brand,#89c527);color:#fff;font-style:normal;font-size:9.5px;align-items:center;justify-content:center;font-weight:800}',
    '.vfl-own.none{color:#bf2600;border-color:#ffbdad;background:#ffebe6} .vfl-own.none i{background:#bf2600}',
    '.vfl-lb{border:1px solid var(--line,#e2e4e5);border-radius:10px;overflow:hidden;background:var(--card,#fff)} .vfl-lb .r{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px dashed var(--line,#e2e4e5);font-size:12.5px} .vfl-lb .r:last-child{border-bottom:0} .vfl-lb .r.me{background:rgba(137,197,39,.10)} .vfl-lb .rk{width:26px;font-weight:800;text-align:center} .vfl-lb .nm{flex:1;font-weight:700;min-width:0} .vfl-lb .bd{font-size:11px;color:var(--sub,#5f6668);font-weight:400} .vfl-lb .m{font-size:11px;color:var(--sub,#5f6668);white-space:nowrap} .vfl-lb .sc{font-weight:800;min-width:46px;text-align:right}',
    '.vfl-bar{display:inline-block;width:70px;height:7px;background:var(--line,#e2e4e5);border-radius:4px;overflow:hidden;vertical-align:middle;margin-left:6px} .vfl-bar i{display:block;height:7px;background:var(--brand,#89c527)} .vfl-bar.y i{background:var(--yellow,#ffab00)} .vfl-bar.r i{background:var(--red,#ff5630)}',
    '.vfl-att{border:1px solid var(--line,#e2e4e5);border-left:4px solid var(--red,#ff5630);border-radius:10px;padding:10px 14px;background:var(--card,#fff)} .vfl-att .row{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px dashed var(--line,#e2e4e5);font-size:12.5px} .vfl-att .row:last-child{border-bottom:0} .vfl-att .why{font-size:11.5px;color:var(--sub,#5f6668);margin-top:2px}',
    '.vfl-filter{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px} .vfl-filter select{font:inherit;font-size:12px;padding:5px 8px;border:1px solid var(--line,#e2e4e5);border-radius:8px;background:var(--card,#fff);color:inherit} .vfl-filter label{color:var(--sub,#5f6668);font-weight:600} .vfl-filter .tg{cursor:pointer;border:1px solid var(--line,#e2e4e5);border-radius:20px;padding:4px 12px;font-weight:600;color:var(--sub,#5f6668);background:var(--card,#fff)} .vfl-filter .tg.on{background:var(--brand,#89c527);color:#fff;border-color:var(--brand,#89c527)}',
    '.vfl-mband{margin-bottom:12px} .vfl-mband .bl{font-size:12px;font-weight:800;color:var(--sub,#5f6668);margin:0 0 8px;text-transform:uppercase;letter-spacing:.4px}',
    '.vfl-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px} .vfl-chartc{background:var(--card,#fff);border:1px solid var(--line,#e2e4e5);border-radius:12px;padding:12px 14px} .vfl-chartc h4{margin:0 0 2px;font-size:13px} .vfl-chartc .d{font-size:11px;color:var(--sub,#5f6668);margin-bottom:6px;min-height:28px}',
    '.pbc{display:flex;align-items:stretch;gap:6px;padding:4px 2px 0} .pbc-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end} .pbc-val{font-size:12px;font-weight:800;line-height:1;margin-bottom:4px;font-variant-numeric:tabular-nums;white-space:nowrap} .pbc-track{flex:1 1 auto;width:100%;max-width:64px;display:flex;align-items:flex-end} .pbc-bar{width:100%;border-radius:4px 4px 2px 2px;transition:height .7s cubic-bezier(.2,.7,.2,1)} .pbc-pi{font-size:10.5px;color:var(--sub,#5f6668);margin-top:5px;font-variant-numeric:tabular-nums;text-align:center;line-height:1.15;white-space:nowrap} @media(prefers-reduced-motion:reduce){.pbc-bar{transition:none}}',
    '.vfl-init{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px dashed var(--line,#e2e4e5);font-size:12.5px;flex-wrap:wrap} .vfl-init:last-child{border-bottom:0} .vfl-init .t{flex:1;min-width:180px} .vfl-init .prog{width:150px;min-width:150px}',
    '.vfl-init .prog span.tr{display:block;background:var(--line,#e2e4e5);border-radius:4px;height:8px;overflow:hidden} .vfl-init .prog span.tr i{display:block;height:8px;border-radius:4px;background:var(--brand,#89c527)} .vfl-init .prog small{font-size:10.5px;color:var(--sub,#5f6668)}',
    '.vfl-init .hints{font-size:11px;color:#8a5a00;flex-basis:100%;padding-left:2px} .vfl-init.dim{opacity:.55}',
    'details.vfl-how summary{cursor:pointer;font-weight:700;font-size:12.5px;color:var(--brand-dark,#5c9220)} details.vfl-how table{width:100%;font-size:12px;border-collapse:collapse;margin-top:8px} details.vfl-how td{padding:5px 8px;border-bottom:1px solid var(--line,#e2e4e5);vertical-align:top} details.vfl-how td:first-child{font-weight:700;white-space:nowrap;width:180px}',
    '.vfl-nodata{border:1px dashed var(--line,#e2e4e5);border-radius:10px;padding:10px 14px;font-size:12.5px;color:var(--sub,#5f6668);background:var(--bg,#f7f8f4);margin:8px 0}',
    '.vfl-mine{background:linear-gradient(180deg,#f2f7ec,var(--card,#fff));border:1px solid #d8e2cc;border-radius:12px;padding:12px 16px;margin-bottom:12px}',
    'html[data-theme=dark] .vfl-mine{background:#1e2a14;border-color:#33452a} html[data-theme=dark] .vfl-good{background:#0f3d2a;color:#7ee2b8}'
  ].join('\n');
  document.head.appendChild(css);

  /* ───────── Datenzugriff ───────── */
  function fl(){ try{ return (RAWDATA&&RAWDATA.meta&&RAWDATA.meta.fl)||null; }catch(e){ return null; } }
  function hasFl(){ var f=fl(); return !!(f&&f.inits); }
  function hasCare(){ var f=fl(); return !!(f&&f.inits&&f.inits.length&&f.inits[0].length>7); }   /* Pflege-Felder ab 18.08.2026 */
  function hasHist(){ var f=fl(); return !!(f&&f.hist&&f.hist.length); }
  function isDoneRes(res){ return !(res&&NOTDONE.test(res)); }

  /* ───────── Quartale (Zeitfenster der FL2-Historie) ───────── */
  function qWin(y,q){ return {id:y+'-Q'+(q+1),y:y,q:q,start:new Date(Date.UTC(y,q*3,1)),end:new Date(Date.UTC(y,q*3+3,1))}; }
  function qOf(d){ return qWin(d.getUTCFullYear(),Math.floor(d.getUTCMonth()/3)); }
  function qShift(w,n){ var q=w.q+n, y=w.y; while(q<0){q+=4;y--;} while(q>3){q-=4;y++;} return qWin(y,q); }
  function qLabel(w){ var f=function(d){return String(d.getUTCDate()).padStart(2,'0')+'.'+String(d.getUTCMonth()+1).padStart(2,'0')+'.';}; var last=new Date(w.end-86400000); return 'Q'+(w.q+1)+' '+w.y+' · '+f(w.start)+'–'+f(last); };
  function qShort(w){ return 'Q'+(w.q+1)+' '+w.y; }
  function qList(n){ var cur=qOf(now()); var out=[]; for(var i=n-1;i>=0;i--)out.push(qShift(cur,-i)); return out; }
  function qProgress(w){ var t=+now(); return Math.max(0,Math.min(100,Math.round((t-w.start)/(w.end-w.start)*100))); }
  function elapsedWeeks(w){ return Math.max(0.15,(Math.min(+now()+86400000,+w.end)-+w.start)/(7*86400000)); }

  /* FL2-Kennzahlen je Quartal aus fl.hist  [key, created, started, done, resolution, owner, parent, status, summary] */
  function fl2Metrics(w,scope){
    var f=fl(); if(!f||!f.hist||!f.hist.length)return null;
    var H=f.hist.filter(function(x){return !scope||scope(x);});
    var cut=Math.min(+w.end,+now()+86400000);
    var inWin=function(s){ if(!s)return false; var d=+D(s); return d>=+w.start&&d<+w.end; };
    var doneIn=H.filter(function(x){return x[3]&&isDoneRes(x[4])&&inWin(x[3]);});
    var cyc=[],lead=[];
    doneIn.forEach(function(x){ var dn=+D(x[3]); if(x[2]&&+D(x[2])<=dn)cyc.push(days(+D(x[2]),dn)); if(x[1])lead.push(days(+D(x[1]),dn)); });
    var wip=H.filter(function(x){ if(!x[2])return false; var st=+D(x[2]); var dn=x[3]?+D(x[3]):null; return st<=cut&&(dn==null||dn>cut); }).length;
    var startedIn=H.filter(function(x){return inWin(x[2]);}).length;
    var createdIn=H.filter(function(x){return inWin(x[1]);}).length;
    var ew=elapsedWeeks(w), perW=doneIn.length/ew;
    var running=+now()>=+w.start&&+now()<+w.end;
    return {id:w.id,w:w,running:running,future:+now()<+w.start,elapsedWeeks:Math.round(ew*10)/10,
      throughput:doneIn.length,perWeek:Math.round(perW*10)/10,cycleP50:pct(cyc,50),cycleP85:pct(cyc,85),cycleN:cyc.length,
      leadP50:pct(lead,50),wip:wip,started:startedIn,created:createdIn,
      flowDebtWeeks:perW>0?Math.round(wip/perW*10)/10:null,doneKeys:doneIn.map(function(x){return x[0];})};
  }
  /* FL1-Kennzahlen je Quartal aus RAW (Story-Ebene) — Fenster vor doneWindowStart sind unvollständig (⚠) */
  function fl1Metrics(w){
    try{
      var cut=Math.min(+w.end-1,+now()); var cutD=new Date(cut);
      var dws=RAWDATA.meta.doneWindowStart?+D(RAWDATA.meta.doneWindowStart):null;
      if(dws!=null&&+w.end<=dws)return null;   /* Quartal liegt komplett vor dem Datenfenster: keine Aussage */
      var partial=dws!=null&&+w.start<dws;
      var doneIn=RAW.filter(function(i){ if(i[3]==='E'||!isRealDone(i))return false; var d=+D(i[5]); return d>=+w.start&&d<+w.end; });
      var cyc=[]; doneIn.forEach(function(i){ var st=null; (i[10]||[]).forEach(function(t){ if(st==null&&t[1]>=3)st=+D(t[0]); }); if(st!=null)cyc.push(days(st,+D(i[5]))); });
      var wip=RAW.filter(function(i){ if(i[3]==='E')return false; var c=colAt(i,cutD); return c>=1&&c<=4; }).length;
      return {id:w.id,w:w,partial:partial,throughput:doneIn.length,cycleP50:pct(cyc,50),cycleP85:pct(cyc,85),wip:wip};
    }catch(e){ return null; }
  }

  /* ───────── Pflege je Vorgang (Initiative / Key Result / Risiko) ───────── */
  /* inits: [key, summary, status, parent, nLinks, nDone, openKeys, owner, created, updated, due, started, descLen] */
  var STALE_Y=14, STALE_R=30, NEW_OLD=90, KPI_Y=90, KPI_R=180, RISK_Y=90;
  function initRow(x){
    var care=x.length>7, t=now();
    var r={key:x[0],title:x[1],status:x[2],theme:x[3]||'',nLinks:x[4]||0,nDone:x[5]||0,openKeys:x[6]||[],
      owner:care?(x[7]||''):null,created:care?x[8]:'',updated:care?x[9]:'',due:care?x[10]:'',started:care?x[11]:'',descLen:care?x[12]:null,
      inFlight:/in flight|in progress/i.test(x[2]),isNew:/new/i.test(x[2]),ready:/ready/i.test(x[2]),
      hints:[],pen:0,care:care};
    r.age=r.created?days(+D(r.created),+t):null; r.stale=r.updated?days(+D(r.updated),+t):null;
    var add=function(sev,code,txt,pen){ r.hints.push({sev:sev,code:code,txt:txt}); r.pen+=pen; };
    if(care){
      if(!r.owner)add('red','owner',T('ohne Verantwortliche:n — wer übernimmt?','no owner — who takes it?'),30);
      if(r.stale!=null){ if(r.stale>STALE_R)add('red','stale',T('seit '+r.stale+' Tagen nicht angefasst','untouched for '+r.stale+' days'),25);
        else if(r.stale>STALE_Y)add('yellow','stale',T('seit '+r.stale+' Tagen nicht angefasst','untouched for '+r.stale+' days'),10); }
      if(r.due&&+D(r.due)<+t)add('red','due',T('Termin '+fmtD(r.due)+' überschritten','due date '+fmtD(r.due)+' passed'),15);
      if(r.descLen!=null&&r.descLen<40)add('yellow','desc',T('keine Zielbeschreibung (Beschreibung leer)','no goal description (description empty)'),10);
    }
    if(r.inFlight&&r.nLinks>0&&r.nDone===r.nLinks)add('yellow','finish',T(r.nLinks===1?'das einzige Ticket ist erledigt — abschließen oder nächste Schritte anlegen':'alle '+r.nLinks+' Tickets erledigt — abschließen oder nächste Schritte anlegen',r.nLinks===1?'the only ticket is done — close it or add next steps':'all '+r.nLinks+' tickets done — close it or add next steps'),15);
    if(r.inFlight&&r.nLinks===0)add('yellow','nolinks',T('In Flight ohne verknüpfte VA-Tickets (FL1)','in flight without linked VA tickets (FL1)'),15);
    if(r.isNew&&r.age!=null&&r.age>NEW_OLD)add('yellow','decide',T('seit '+r.age+' Tagen „neu“ — starten oder verwerfen','"new" for '+r.age+' days — start it or drop it'),15);
    if(!r.theme)add('yellow','theme',T('kein strategisches Thema (FL3) zugeordnet','no strategic theme (FL3) assigned'),10);
    r.score=Math.max(0,100-r.pen); r.amp=r.score>=80?'green':r.score>=55?'yellow':'red';
    r.worst=r.hints.some(function(h){return h.sev==='red';})?'red':(r.hints.length?'yellow':'green');
    return r;
  }
  /* kpis: [key, summary, status, owner, updated, parent] — Key Results: Check-in = letzte Änderung */
  function kpiRow(x){
    var care=x.length>3, t=now();
    var r={key:x[0],title:x[1],status:x[2],owner:care?(x[3]||''):null,updated:care?x[4]:'',theme:care?(x[5]||''):'',hints:[],pen:0,care:care,kind:'kr'};
    r.stale=r.updated?days(+D(r.updated),+t):null;
    var add=function(sev,code,txt,pen){ r.hints.push({sev:sev,code:code,txt:txt}); r.pen+=pen; };
    if(care){
      if(!r.owner)add('red','owner',T('ohne Verantwortliche:n','no owner'),30);
      if(r.stale!=null){ if(r.stale>KPI_R)add('red','stale',T('kein Check-in seit '+r.stale+' Tagen','no check-in for '+r.stale+' days'),30);
        else if(r.stale>KPI_Y)add('yellow','stale',T('kein Check-in seit '+r.stale+' Tagen','no check-in for '+r.stale+' days'),15); }
    }
    r.score=Math.max(0,100-r.pen); r.amp=r.score>=80?'green':r.score>=55?'yellow':'red';
    r.worst=r.hints.some(function(h){return h.sev==='red';})?'red':(r.hints.length?'yellow':'green');
    return r;
  }
  /* risks: [key, summary, status, owner, updated] */
  function riskRow(x){
    var care=x.length>3, t=now();
    var r={key:x[0],title:x[1],status:x[2],owner:care?(x[3]||''):null,updated:care?x[4]:'',hints:[],pen:0,care:care,kind:'risk',open:/open/i.test(x[2])};
    r.stale=r.updated?days(+D(r.updated),+t):null;
    var add=function(sev,code,txt,pen){ r.hints.push({sev:sev,code:code,txt:txt}); r.pen+=pen; };
    if(care){
      if(r.open&&!r.owner)add('red','owner',T('offenes Risiko ohne Verantwortliche:n','open risk without owner'),30);
      if(r.open&&r.stale!=null&&r.stale>RISK_Y)add('yellow','stale',T('offen und seit '+r.stale+' Tagen nicht bewertet','open and not reviewed for '+r.stale+' days'),15);
    }
    r.score=Math.max(0,100-r.pen); r.amp=r.score>=80?'green':r.score>=55?'yellow':'red';
    r.worst=r.hints.some(function(h){return h.sev==='red';})?'red':(r.hints.length?'yellow':'green');
    return r;
  }
  var _m=null,_mKey='';
  function model(){
    var f=fl(); if(!f)return null;
    var k=(RAWDATA.meta.generatedAt||RAWDATA.meta.importDate||'')+'|'+(f.inits||[]).length+'|'+(+now());
    if(_m&&_mKey===k)return _m; _mKey=k;
    var m={themes:(f.themes||[]).map(function(x){return {key:x[0],title:x[1].replace(/^\[.*?\]\s*/,''),status:x[2],owner:x.length>3?(x[3]||''):null,updated:x.length>4?x[4]:''};}),
      inits:(f.inits||[]).map(initRow),kpis:(f.kpis||[]).map(kpiRow),risks:(f.risks||[]).map(riskRow),care:hasCare(),hist:hasHist()};
    m.inFlight=m.inits.filter(function(r){return r.inFlight;});
    m.pipe=m.inits.filter(function(r){return !r.inFlight;});
    m.unowned=m.inits.filter(function(r){return r.care&&!r.owner;});
    m.attention=m.inits.filter(function(r){return r.hints.length;}).sort(function(a,b){return a.score-b.score||b.hints.length-a.hints.length;});
    m.avgScore=m.inits.length?Math.round(m.inits.reduce(function(a,r){return a+r.score;},0)/m.inits.length):null;
    /* FL1→FL2-Abdeckung aus RAW (Feld 11 = STA-Link-Flag) */
    try{ var act=RAW.filter(function(i){return i[3]!=='E'&&(function(c){return c>=0&&c<=4;})(colAt(i,now()));}); var no=act.filter(function(i){return !i[11];});
      m.act=act.length; m.noLink=no.length; m.cov=act.length?Math.round((act.length-no.length)/act.length*100):100; }catch(e){ m.act=0;m.noLink=0;m.cov=null; }
    m.openRisks=m.risks.filter(function(r){return r.open;});
    m.orphans=m.inits.filter(function(r){return !r.theme||!m.themes.some(function(t){return t.key===r.theme;});});
    m.krFresh=m.kpis.filter(function(r){return r.care&&r.stale!=null&&r.stale<=KPI_Y;}).length;
    _m=m; return m;
  }

  /* ───────── Personen: Verantwortung, Pflege-Score, Rangliste (FL2+FL3-Wettbewerb) ───────── */
  function ownerOf(name){ return {name:name,inits:[],krs:[],risks:[]}; }
  function people(){
    var m=model(); if(!m||!m.care)return [];
    var byN={};
    var put=function(kind,r){ if(!r.owner)return; var k=nn(r.owner); if(!byN[k])byN[k]=ownerOf(r.owner); byN[k][kind].push(r); };
    m.inits.forEach(function(r){put('inits',r);}); m.kpis.forEach(function(r){put('krs',r);}); m.risks.forEach(function(r){put('risks',r);});
    var rows=Object.keys(byN).map(function(k){
      var p=byN[k], items=p.inits.concat(p.krs), all=items.concat(p.risks);
      var wsum=0,w=0; p.inits.forEach(function(r){wsum+=r.score;w+=1;}); p.krs.forEach(function(r){wsum+=r.score;w+=1;}); p.risks.forEach(function(r){wsum+=r.score*0.5;w+=0.5;});
      var avg=w?Math.round(wsum/w):0;
      var open=all.reduce(function(a,r){return a+r.hints.length;},0);
      var red=all.reduce(function(a,r){return a+r.hints.filter(function(h){return h.sev==='red';}).length;},0);
      var badges=[];
      if(p.inits.length&&p.inits.every(function(r){return r.stale!=null&&r.stale<=STALE_Y;}))badges.push(['🧭',T('Frisch','Fresh'),T('alle Initiativen in den letzten 14 T angefasst','all initiatives touched in the last 14 d')]);
      var inF=p.inits.filter(function(r){return r.inFlight;});
      if(inF.length&&inF.every(function(r){return r.nLinks>r.nDone;}))badges.push(['🔗',T('Verknüpft','Linked'),T('jede In-Flight-Initiative hat offene FL1-Tickets','every in-flight initiative has open FL1 tickets')]);
      if(p.inits.length&&p.inits.every(function(r){return r.theme&&r.descLen>=40;}))badges.push(['📝',T('Klar','Clear'),T('alle Initiativen mit Thema und Zielbeschreibung','all initiatives with theme and goal description')]);
      if(p.krs.length&&p.krs.every(function(r){return r.stale!=null&&r.stale<=KPI_Y;}))badges.push(['📐',T('Check-in','Check-in'),T('alle Key Results in den letzten 90 T aktualisiert','all key results updated in the last 90 d')]);
      if(open===0&&all.length)badges.push(['✨',T('Alles gepflegt','All maintained'),T('kein offener Hinweis','no open hint')]);
      /* Score fuer den Wettbewerb: Ø Pflege (0–100) + Verantwortungsbonus (bis +10 fuer Anzahl) − offene rote Hinweise */
      var comp=Math.max(0,Math.min(120,avg+Math.min(10,all.length*2)-red*3));
      return {n:p.name,inits:p.inits,krs:p.krs,risks:p.risks,count:all.length,avg:avg,open:open,red:red,badges:badges,score:comp};
    }).filter(function(r){return r.count;});
    if(rows.length){ var mx=Math.max.apply(null,rows.map(function(r){return r.count;})); rows.forEach(function(r){ if(r.count===mx&&mx>1)r.badges.push(['🏋️',T('Meiste Verantwortung','Most ownership'),r.count+T(' Vorgänge',' items')]); }); }
    rows.sort(function(a,b){return b.score-a.score||b.avg-a.avg||b.count-a.count;});
    return rows;
  }
  function personKey(name){ return nn(name); }
  function mine(name){
    var m=model(); if(!m||!m.care||!name)return null;
    var k=personKey(name);
    var inits=m.inits.filter(function(r){return r.owner&&nn(r.owner)===k;});
    var krs=m.kpis.filter(function(r){return r.owner&&nn(r.owner)===k;});
    var risks=m.risks.filter(function(r){return r.owner&&nn(r.owner)===k;});
    var att=inits.concat(krs).concat(risks).filter(function(r){return r.hints.length;}).sort(function(a,b){return a.score-b.score;});
    var rows=people(); var pos=-1; rows.forEach(function(r,i){if(nn(r.n)===k)pos=i;});
    return {inits:inits,krs:krs,risks:risks,attention:att,rank:pos>=0?pos+1:null,of:rows.length,row:pos>=0?rows[pos]:null};
  }
  function summary(){
    var m=model(); if(!m)return null;
    return {care:m.care,hist:m.hist,inits:m.inits.length,inFlight:m.inFlight.length,unowned:m.unowned.length,attention:m.attention.length,avg:m.avgScore,cov:m.cov,noLink:m.noLink,openRisks:m.openRisks.length,krs:m.kpis.length,krFresh:m.krFresh,themes:m.themes.length};
  }
  function ownerChip(name){ if(name==null)return ''; if(!name)return '<span class="vfl-own none"><i>?</i>'+T('offen','open')+'</span>';
    var ini=name.split(/\s+/).map(function(s){return s[0]||'';}).join('').slice(0,2).toUpperCase(); return '<span class="vfl-own" title="'+E(name)+'"><i>'+E(ini)+'</i>'+E(name.split(' ')[0])+'</span>'; }
  function badgesHtml(b){ return b.map(function(x){return '<span title="'+E(x[2])+'">'+x[0]+' '+E(x[1])+'</span>';}).join(' · '); }
  function ampTag(r){ var c=r.amp==='green'?'g':r.amp==='yellow'?'y':'r'; return '<span class="vfl-tag '+c+'" title="'+T('Pflege-Score','Care score')+' '+r.score+'/100">'+(r.amp==='green'?'🟢':r.amp==='yellow'?'🟡':'🔴')+' '+r.score+'</span>'; }
  function hintsHtml(r){ return r.hints.map(function(h){return (h.sev==='red'?'🔴 ':'🟡 ')+E(h.txt);}).join(' · '); }
  function delta(nowV,prevV,goodDown,unit){ if(nowV==null||prevV==null)return ''; var d=nowV-prevV; if(!d)return '<span class="vfl-dl flat">± 0</span>'; var better=goodDown?d<0:d>0; return '<span class="vfl-dl '+(better?'up':'down')+'" title="'+T('Veränderung zum Vorquartal','change vs. previous quarter')+'">'+(d>0?'▲ +':'▼ ')+(Math.round(d*10)/10)+(unit||'')+'</span>'; }
  function bars(series,key,opts){
    opts=opts||{}; var vals=series.map(function(s){return s&&s[key]!=null?s[key]:null;});
    var max=Math.max.apply(null,vals.filter(function(v){return v!=null;}).concat([1])); var h=opts.height||100, col=opts.color||'#89c527';
    var out=series.map(function(s,i){ var v=vals[i], last=i===series.length-1; var p=v==null?0:Math.max(2,Math.round(v/max*100));
      var label=v==null?'–':(Number.isInteger(v)?v:(Math.round(v*10)/10))+(opts.unit||'');
      return '<div class="pbc-col" title="'+E(qShort(s.w))+': '+(v==null?T('keine Daten','no data'):label)+(s.partial?' ⚠':'')+'"><div class="pbc-val">'+label+(s.partial?'<span title="'+T('Datenfenster unvollständig','data window incomplete')+'" style="color:var(--yellow,#ffab00)">⚠</span>':'')+'</div><div class="pbc-track"><div class="pbc-bar" data-h="'+p+'" style="height:0%;background:'+(last?col:'#d3dbc6')+'"></div></div><div class="pbc-pi">'+E(qShort(s.w))+'</div></div>'; }).join('');
    return '<div class="pbc" style="height:'+h+'px" role="img" aria-label="'+E(opts.label||key)+'">'+out+'</div>';
  }
  function animate(){ var nodes=document.querySelectorAll('#progview .pbc:not([data-anim])'); if(!nodes.length)return;
    /* Nur beim ersten Aufbau animieren — nach Ein-/Ausklappen (Re-Render) stehen die Balken sofort */
    if(ANIM_DONE){nodes.forEach(function(el){el.setAttribute('data-anim','1');el.querySelectorAll('.pbc-bar').forEach(function(b){b.style.transition='none';b.style.height=b.getAttribute('data-h')+'%';});});return;} ANIM_DONE=true;
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var grow=function(el){ el.setAttribute('data-anim','1'); el.querySelectorAll('.pbc-bar').forEach(function(b,i){ setTimeout(function(){b.style.height=b.getAttribute('data-h')+'%';},reduce?0:60+i*90); }); };
    if(!('IntersectionObserver' in window)){nodes.forEach(grow);return;} var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){grow(e.target);io.unobserve(e.target);}});},{threshold:0.3}); nodes.forEach(function(n){io.observe(n);}); }

  /* ───────── Coach-Einschätzung (regelbasiert) ───────── */
  function assess(){
    var m=model(); if(!m)return null;
    var out={watch:[],good:[]}; var add=function(sev,title,why,rule,anchor){out.watch.push({sev:sev,title:title,why:why,rule:rule,anchor:anchor});};
    var cur=qOf(now()), M=m.hist?fl2Metrics(cur):null, P=m.hist?fl2Metrics(qShift(cur,-1)):null;
    /* 1 · Fokus auf FL2 */
    var nIF=m.inFlight.length;
    if(nIF>8)add('red',T(nIF+' Initiativen gleichzeitig In Flight',nIF+' initiatives in flight at once'),T('Bei so vielen parallelen Initiativen wird keine schnell fertig — Risiko STA-377 („zu viele Initiativen auf einmal“) ist genau das.','With this many in parallel none finishes fast.'),T('Rot ab 9, gelb ab 6 Initiativen In Flight (Flight-Level-Faustregel: ≤ 5 für ein Team dieser Größe).','Red from 9, yellow from 6 in flight.'),'vfl-themes');
    else if(nIF>5)add('yellow',T(nIF+' Initiativen In Flight — Fokus prüfen',nIF+' initiatives in flight — check focus'),T('Mehr als fünf parallele Initiativen für ein Team dieser Größe. Welche zwei kann man zuerst fertig machen?','More than five parallel initiatives for a team this size.'),T('Gelb ab 6, rot ab 9 In Flight.','Yellow from 6, red from 9.'),'vfl-themes');
    else out.good.push(T('Fokus auf FL2 gehalten: '+nIF+' Initiativen In Flight (≤ 5).','FL2 focus kept: '+nIF+' initiatives in flight (≤ 5).'));
    /* 2 · Little's Law auf FL2 */
    if(M&&M.flowDebtWeeks!=null){ var restW=Math.max(0,13-M.elapsedWeeks);
      if(M.flowDebtWeeks>26)add('red',T('Mehr angefangen als abschließbar','More started than can be finished'),T(M.wip+' Initiativen in Arbeit, '+M.perWeek+' pro Woche fertig — der Bestand braucht rechnerisch '+M.flowDebtWeeks+' Wochen (≈ '+Math.round(M.flowDebtWeeks/13*10)/10+' Quartale).',M.wip+' in progress, '+M.perWeek+' done per week — the inventory needs '+M.flowDebtWeeks+' weeks.'),T('Rot, wenn der Bestand mehr als zwei Quartale braucht (Little’s Law: WIP ÷ Durchsatz).','Red when inventory needs more than two quarters.'),'vfl-kpi');
      else if(M.flowDebtWeeks>13)add('yellow',T('Bestand passt nicht in ein Quartal','Inventory does not fit into one quarter'),T(M.wip+' Initiativen brauchen bei '+M.perWeek+' pro Woche noch '+M.flowDebtWeeks+' Wochen.',M.wip+' initiatives need '+M.flowDebtWeeks+' more weeks at '+M.perWeek+' per week.'),T('Gelb, sobald der Bestand länger als ein Quartal (13 Wochen) braucht.','Yellow when inventory needs more than one quarter.'),'vfl-kpi'); }
    /* 3 · Durchlaufzeit-Trend */
    if(M&&P&&M.cycleP50!=null&&P.cycleP50!=null&&P.cycleP50>0){ var chg=Math.round((M.cycleP50-P.cycleP50)/P.cycleP50*100);
      if(chg>=25)add('yellow',T('Durchlaufzeit der Initiativen steigt','Initiative cycle time rising'),T('Cycle Time p50 '+P.cycleP50+' → '+M.cycleP50+' Tage (+'+chg+' %) gegenüber dem Vorquartal.','Cycle time p50 '+P.cycleP50+' → '+M.cycleP50+' days (+'+chg+' %).'),T('Gelb ab 25 % Verschlechterung im Median.','Yellow from 25 % worse median.'),'vfl-trend');
      else if(chg<=-20)out.good.push(T('Durchlaufzeit verbessert: p50 '+P.cycleP50+' → '+M.cycleP50+' Tage.','Cycle time improved: p50 '+P.cycleP50+' → '+M.cycleP50+' days.')); }
    /* 4 · Verantwortung */
    if(m.care){ var un=m.unowned.length, tot=m.inits.length;
      if(un){ var sev=un>tot/4?'red':'yellow'; add(sev,T(un+' von '+tot+' Initiativen ohne Verantwortliche:n',un+' of '+tot+' initiatives without owner'),T('Ohne Owner pflegt niemand Status, Tickets und Key Results — die Initiative verwaist. Wer übernimmt? (In Jira: Assignee setzen.)','Without an owner nobody maintains status, tickets and key results.'),T('Rot, wenn mehr als ein Viertel der Initiativen keinen Owner hat; gelb ab einer.','Red above a quarter without owner; yellow from one.'),'vfl-owner'); }
      else out.good.push(T('Jede Initiative hat eine:n Verantwortliche:n.','Every initiative has an owner.'));
      var stale=m.inits.filter(function(r){return r.stale!=null&&r.stale>STALE_R;}).length;
      if(stale)add(stale>=3?'red':'yellow',T(stale+(stale===1?' Initiative':' Initiativen')+' seit über 30 Tagen nicht angefasst',stale+(stale===1?' initiative':' initiatives')+' untouched for 30+ days'),T('Kein Statuswechsel, kein Kommentar, kein neues Ticket — auf FL2 heißt das meistens: die Arbeit läuft an der Initiative vorbei oder sie ist still gestorben.','No status change, comment or ticket in 30 days.'),T('Rot ab drei, gelb ab einer Initiative über 30 Tage ohne Aktualisierung.','Red from three, yellow from one.'),'vfl-owner');
      else out.good.push(T('Alle Initiativen wurden in den letzten 30 Tagen angefasst.','All initiatives touched within the last 30 days.'));
      var fin=m.inits.filter(function(r){return r.hints.some(function(h){return h.code==='finish';});}).length;
      if(fin)add('yellow',T(fin+(fin===1?' Initiative könnte':' Initiativen könnten')+' abgeschlossen werden',fin+(fin===1?' initiative':' initiatives')+' could be closed'),T('Alle verknüpften FL1-Tickets sind erledigt, die Initiative steht noch In Flight — entweder fertig melden oder die nächsten Tickets anlegen.','All linked FL1 tickets are done while the initiative is still in flight.'),T('Gelb ab einer In-Flight-Initiative ohne offenes Ticket.','Yellow from one in-flight initiative without open ticket.'),'vfl-owner');
    }
    /* 5 · FL1 → FL2 */
    if(m.cov!=null){ if(m.cov<60)add('red',T('Nur '+m.cov+' % der aktiven Tickets hängen an einer Initiative','Only '+m.cov+' % of active tickets hang off an initiative'),T(m.noLink+' aktive VA-Tickets ohne Initiative — diese Arbeit ist auf FL2 unsichtbar.',m.noLink+' active VA tickets without initiative.'),T('Rot unter 60 %, gelb unter 80 % FL1→FL2-Abdeckung.','Red below 60 %, yellow below 80 %.'),'vfl-head');
      else if(m.cov<80)add('yellow',T('FL1→FL2-Abdeckung bei '+m.cov+' %','FL1→FL2 coverage at '+m.cov+' %'),T(m.noLink+' aktive Tickets ohne Initiative — beim nächsten Weekly zuordnen (Ticket verlinken oder Parent setzen).',m.noLink+' active tickets without initiative.'),T('Gelb unter 80 %.','Yellow below 80 %.'),'vfl-head');
      else out.good.push(T('FL1→FL2-Abdeckung '+m.cov+' % — die operative Arbeit zahlt sichtbar auf Initiativen ein.','FL1→FL2 coverage '+m.cov+' %.')); }
    /* 6 · Strategie: Themen, Key Results, Risiken */
    if(m.orphans.length)add('yellow',T(m.orphans.length+(m.orphans.length===1?' Initiative':' Initiativen')+' ohne strategisches Thema',m.orphans.length+(m.orphans.length===1?' initiative':' initiatives')+' without strategic theme'),T('Diese Initiativen zahlen auf kein FL3-Thema nachvollziehbar ein — Parent setzen oder bewusst als „Betrieb“ kennzeichnen.','These initiatives do not traceably pay into an FL3 theme.'),T('Gelb ab einer Initiative ohne Thema.','Yellow from one.'),'vfl-themes');
    if(m.care&&m.kpis.length){ var kf=m.krFresh, kn=m.kpis.length; if(kf<kn)add(kf===0?'red':'yellow',T((kn-kf)+' von '+kn+' Key Results ohne Check-in seit 90 Tagen',(kn-kf)+' of '+kn+' key results without check-in for 90 days'),T('Ein Key Result ohne Messwert ist eine Absicht, kein Ergebnis — Wert eintragen (Kommentar/Beschreibung) und Owner prüfen.','A key result without a measurement is an intention, not a result.'),T('Gelb, sobald ein KR 90 Tage nicht aktualisiert wurde; rot, wenn keines aktuell ist.','Yellow from one KR stale 90 days; red if none is current.'),'vfl-kr'); else out.good.push(T('Alle '+kn+' Key Results wurden in den letzten 90 Tagen aktualisiert.','All '+kn+' key results updated in the last 90 days.')); }
    if(m.openRisks.length>3)add('yellow',T(m.openRisks.length+' offene Risiken',m.openRisks.length+' open risks'),T('Offen = weder gemildert noch akzeptiert noch übernommen. Im Monats-Check entscheiden.','Open = neither mitigated, accepted nor owned.'),T('Gelb ab vier offenen Risiken.','Yellow from four open risks.'),'vfl-risks');
    if(!m.care)add('yellow',T('Pflege-Daten fehlen noch','Care data still missing'),T('Owner, Aktualität und Historie der Initiativen kommen mit dem nächsten stündlichen Datenlauf (fetch-va-data.mjs seit 18.08.2026). Bis dahin: nur Struktur und Abdeckung.','Owner, freshness and history arrive with the next hourly data run.'),T('Hinweis, keine Bewertung.','Note, not a rating.'),'vfl-owner');
    var order={red:0,yellow:1}; out.watch.sort(function(a,b){return order[a.sev]-order[b.sev];});
    return out;
  }

  /* ───────── Rendering ─────────
     Muster (18.08., „Seite nicht überladen“): jeder Abschnitt zeigt eine Kopfzeile mit Zahlen; Details sind
     eingeklappt (fold) oder angeteasert (tease: 3 Einträge + „alle N anzeigen“). Zustand je Sitzung in
     sessionStorage.vaFlOpen. Wegweiser: sticky Schrittleiste 1–8 oben + linke Rail (#chartRail), Scroll-Spy
     markiert den aktuellen Abschnitt; jeder Abschnitt endet mit „Weiter: …“. */
  var F={owner:'',att:false,trendBack:0,open:{}}; var TREND_N=6, ANIM_DONE=false;
  try{ F.open=JSON.parse(sessionStorage.getItem('vaFlOpen')||'{}')||{}; }catch(e){ F.open={}; }
  function isOpen(id,def){ return F.open[id]!=null?!!F.open[id]:!!def; }
  function toggle(id,def){ F.open[id]=!isOpen(id,def); try{sessionStorage.setItem('vaFlOpen',JSON.stringify(F.open));}catch(e){} var y=window.pageYOffset; render(); window.scrollTo(0,y); }
  function go(id){ var e=document.getElementById(id); if(!e)return; var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; var bar=document.getElementById('vflNav'); var off=(bar?bar.getBoundingClientRect().height:0)+8; var top=Math.max(0,e.getBoundingClientRect().top+window.pageYOffset-off); window.scrollTo({top:top,behavior:reduce?'auto':'smooth'}); }
  function setOwner(v){ F.owner=v; render(); setTimeout(function(){go('vfl-themes');},30); }
  function toggleAtt(){ F.att=!F.att; render(); setTimeout(function(){go('vfl-themes');},30); }
  function trendBack(d){ F.trendBack=Math.max(0,F.trendBack+d); render(); setTimeout(function(){go('vfl-trend');},30); }
  /* Anteasern: die ersten n Eintraege, Rest hinter „alle N anzeigen“ */
  function tease(id,items,fn,n,more){
    var open=isOpen(id,false), shown=open?items:items.slice(0,n);
    var h=shown.map(fn).join('');
    if(items.length>n)h+='<div class="vfl-more"><span class="subtab" onclick="vaFL.toggle(\''+id+'\')">'+(open?'▴ '+T('weniger anzeigen','show less'):'▾ '+(more||T('alle '+items.length+' anzeigen','show all '+items.length)))+'</span></div>';
    return h;
  }
  /* Einklappen: Kopfzeile immer sichtbar (mit Zahlen), Inhalt nur wenn offen */
  function fold(id,head,body,def){ var open=isOpen(id,def); return '<div class="vfl-fold'+(open?' open':'')+'"><div class="vfl-fs" onclick="vaFL.toggle(\''+id+'\','+(def?'true':'false')+')"><span class="car">'+(open?'▾':'▸')+'</span><span class="fh">'+head+'</span><span class="fx">'+(open?T('einklappen','collapse'):T('ausklappen','expand'))+'</span></div>'+(open?'<div class="vfl-fb">'+body+'</div>':'')+'</div>'; }
  var STEPS=[['vfl-head',T('Auf einen Blick','At a glance'),'👀'],['vfl-coach',T('Einschätzung','Assessment'),'🧭'],['vfl-owner',T('Verantwortung & Pflege','Ownership & care'),'🙋'],['vfl-kpi',T('Kennzahlen','Metrics'),'📐'],['vfl-trend',T('Entwicklung','Trend'),'📈'],['vfl-themes',T('Themen & Initiativen','Themes & initiatives'),'🎯'],['vfl-risks',T('Risiken','Risks'),'⚠️'],['vfl-kr','Key Results','🏁'],['vfl-how',T('Wie wird gerechnet?','How is it calculated?'),'ℹ️']];
  function sec(i,extra){ var s=STEPS[i]; return '<h2 class="section vfl-sec" id="'+s[0]+'" data-step="'+(i+1)+'"><span class="no">'+(i+1)+'</span>'+s[1]+(extra?' <span style="text-transform:none;letter-spacing:0;font-weight:400">'+extra+'</span>':'')+'</h2>'; }
  function next(i){ var s=STEPS[i+1]; if(!s)return ''; return '<div class="vfl-next"><span onclick="vaFL.go(\''+s[0]+'\')">'+T('Weiter','Next')+': '+(i+2)+' · '+s[1]+' →</span></div>'; }
  var HOW=[
    [T('Durchsatz (FL2)','Throughput (FL2)'),T('Initiativen (STA), die im Quartal auf Done gingen — erster Statuswechsel in eine Done-Kategorie, sonst Resolution-Datum. Won’t Do / Duplicate zählen nicht.','Initiatives moved to Done in the quarter (first move to a Done category, else resolution date). Won’t Do / Duplicate don’t count.')],
    [T('Cycle Time','Cycle time'),T('Arbeitsbeginn (erster Wechsel nach In Flight) → Done in Tagen. p50 = Hälfte war schneller, p85 = die belastbare Zusage-Größe.','Start (first move to In Flight) → Done in days. p50 = half were faster, p85 = the reliable promise.')],
    [T('WIP / Bestand','WIP / inventory'),T('Initiativen, die am Quartalsende begonnen und noch nicht erledigt waren. Bestand in Wochen = WIP ÷ Durchsatz pro Woche (Little’s Law).','Initiatives started and not done at quarter end; weeks = WIP ÷ throughput per week (Little’s Law).')],
    [T('FL1→FL2-Abdeckung','FL1→FL2 coverage'),T('Anteil der aktiven VA-Tickets, die (selbst oder über ihr Parent) mit einer STA-Initiative verlinkt sind.','Share of active VA tickets linked (directly or via parent) to an STA initiative.')],
    [T('Pflege-Score','Care score'),T('Je Initiative 100 Punkte minus: ohne Owner −30 · >30 T unverändert −25 (>14 T −10) · Termin überschritten −15 · In Flight ohne offene Tickets −15 · alle Tickets fertig, aber nicht abgeschlossen −15 · >90 T „neu“ −15 · kein Thema −10 · keine Beschreibung −10. Grün ≥ 80, gelb ≥ 55. Key Results: ohne Owner −30, kein Check-in >90 T −15 / >180 T −30.','100 points per initiative minus: no owner −30 · untouched >30 d −25 (>14 d −10) · overdue −15 · in flight without open tickets −15 · all tickets done but not closed −15 · “new” >90 d −15 · no theme −10 · no description −10. Green ≥ 80, yellow ≥ 55. Key results: no owner −30, no check-in >90 d −15 / >180 d −30.')],
    [T('FL2+FL3-Rangliste','FL2+FL3 leaderboard'),T('Je Person: Ø Pflege-Score der eigenen Initiativen, Key Results (Risiken halb gewichtet) + bis zu 10 Punkte Verantwortungsbonus (2 je Vorgang) − 3 je rotem Hinweis. Gleiche Formel für alle, Owner = Assignee in Jira. Gedacht als Gesprächsanlass, nicht als Bewertung.','Per person: average care score of own initiatives and key results (risks half weight) + up to 10 ownership bonus (2 per item) − 3 per red hint. Same formula for everyone; owner = Jira assignee. A conversation starter, not a rating.')],
    [T('Quartale','Quarters'),T('Kalenderquartale (Q1 = Jan–Mär). Das laufende Quartal ist anteilig: Durchsatz pro Woche bezieht sich auf die verstrichenen Wochen. FL1-Fenster vor dem Datenfenster (26 Wochen erledigte Tickets) sind mit ⚠ markiert.','Calendar quarters (Q1 = Jan–Mar). The running quarter is prorated. FL1 windows before the 26-week done window are marked ⚠.')]
  ];
  function render(){
    var pv=document.getElementById('progview'); if(!pv)return;
    var m=model();
    if(!m){ pv.innerHTML='<div class="vfl-nodata">ℹ️ '+T('Flight-Level-Daten (Board STA) kommen mit dem nächsten stündlichen Datenlauf.','Flight level data (board STA) arrives with the next hourly data run.')+'</div>'; return; }
    var me=(function(){try{return (USER&&USER.name)||'';}catch(e){return '';}})();
    var cur=qOf(now()), M=m.hist?fl2Metrics(cur):null, P=m.hist?fl2Metrics(qShift(cur,-1)):null;
    var stand=(function(){try{return fmtD(RAWDATA.meta.importDate);}catch(e){return '';}})();
    var h='';
    /* Wegweiser (sticky) */
    h+='<div class="vfl-nav" id="vflNav">'+STEPS.map(function(s,i){return '<a data-step="'+s[0]+'" onclick="vaFL.go(\''+s[0]+'\')"><b>'+(i+1)+'</b>'+s[1]+'</a>';}).join('')+'<span class="st">Board STA · '+T('Datenstand','data as of')+' '+stand+' <span class="chip live">● LIVE</span></span></div>';

    /* 0 · Auf einen Blick */
    h+=sec(0,'· '+E(qLabel(cur))+' · '+qProgress(cur)+' % '+T('des Quartals vorbei','of the quarter elapsed'));
    h+='<div class="vfl-intro">'+T('Sechs Fragen, sechs Zahlen: Liefern wir auf Strategie-Ebene? Wie schnell? Wie viel parallel? Kommt die Team-Arbeit oben an? Wird gepflegt? Sind Ziele und Risiken aktuell? — Kachel anklicken führt in den Abschnitt.','Six questions, six numbers — click a tile to jump to its section.')+'</div>';
    var card=function(cls,q,val,unit,sub,secId,dl){ return '<a class="vfl-hc h-'+cls+'" onclick="vaFL.go(\''+secId+'\')"><div class="q">'+q+'</div><div class="v">'+val+(unit?'<span class="u">'+unit+'</span>':'')+(dl||'')+'</div><div class="s">'+sub+'</div></a>'; };
    h+='<div class="vfl-head">';
    h+=card(M?'blue':'grey',T('Wie viele Initiativen wurden dieses Quartal fertig?','How many initiatives got done this quarter?'),M?M.throughput:'—',M?T(' Initiativen',' initiatives'):'',M?(M.perWeek+T(' pro Woche · Vorquartal ',' per week · previous quarter ')+(P?P.throughput:'—')):T('FL2-Historie kommt mit dem nächsten Datenlauf.','FL2 history arrives with the next data run.'),'vfl-kpi',M&&P?delta(M.throughput,P.throughput,false):'');
    var cp=M?M.cycleP85:null, pp=P?P.cycleP85:null;
    h+=card(cp==null?'grey':(pp!=null&&cp>pp*1.4)?'red':(pp!=null&&cp>pp*1.15)?'yellow':'green',T('Wie lange dauert eine Initiative?','How long does an initiative take?'),cp!=null?cp:'—',cp!=null?T(' Tage',' days'):'',T('Cycle Time p85 — die Zahl, die man zusagen kann','Cycle time p85 — the number you can promise')+(M&&M.cycleP50!=null?' · p50 '+M.cycleP50+T(' T',' d'):''),'vfl-trend',delta(cp,pp,true,T(' T',' d')));
    var nIF=m.inFlight.length;
    h+=card(nIF<=5?'green':nIF<=8?'yellow':'red',T('Wie viel läuft parallel?','How much runs in parallel?'),nIF,T(' In Flight',' in flight'),(M&&M.flowDebtWeeks!=null?T('Bestand braucht bei heutigem Tempo ','Inventory needs ')+'<b>'+M.flowDebtWeeks+'</b>'+T(' Wochen',' weeks')+' · ':'')+m.pipe.length+T(' in der Pipeline',' in the pipeline'),'vfl-themes');
    h+=card(m.cov==null?'grey':m.cov>=80?'green':m.cov>=60?'yellow':'red',T('Kommt die Team-Arbeit oben an?','Does team work reach FL2?'),m.cov!=null?m.cov:'—','%',m.noLink+T(' aktive VA-Tickets ohne Initiative',' active VA tickets without initiative')+' <span class="subtab" style="padding:1px 8px;font-size:10.5px" onclick="event.stopPropagation();drillShow(\'nolink\')">'+T('anzeigen','show')+'</span>','vfl-kpi');
    h+=card(!m.care?'grey':m.avgScore>=80?'green':m.avgScore>=55?'yellow':'red',T('Wie gut sind die Initiativen gepflegt?','How well are initiatives maintained?'),m.care?m.avgScore:'—',m.care?'/100':'',m.care?(m.unowned.length+T(' ohne Owner · ',' without owner · ')+m.attention.length+T(' mit Pflege-Hinweis',' with a care hint')):T('Pflege-Daten kommen mit dem nächsten Datenlauf.','Care data arrives with the next data run.'),'vfl-owner');
    var krTxt=m.care?(m.krFresh+' / '+m.kpis.length+T(' Key Results mit Check-in · ',' key results with check-in · ')):(m.kpis.length+' Key Results · ');
    h+=card(m.openRisks.length>3?'yellow':'green',T('Sind Ziele und Risiken aktuell?','Are goals and risks current?'),m.themes.length,T(' Themen',' themes'),krTxt+m.openRisks.length+' / '+m.risks.length+T(' Risiken offen',' risks open'),'vfl-kr');
    h+='</div>'+next(0);

    /* 1 · Coach-Einschätzung — Kopfzeile mit Zählern, Hinweise eingeklappt */
    var A=assess()||{watch:[],good:[]};
    var nRed=A.watch.filter(function(w){return w.sev==='red';}).length, nYel=A.watch.length-nRed;
    h+=sec(1,'· '+T('Einschätzung aus Coach-Sicht','coach assessment'));
    h+='<div class="vfl-coach"><div class="by">'+T('Regelbasiert aus Board STA und Board VA — jede Aussage nennt Zahl und Regel. Kein Bauchgefühl, keine KI.','Rule-based from boards STA and VA — every statement names the number and the rule.')+'</div>';
    var watchBody='';
    A.watch.forEach(function(w){ watchBody+='<div class="vfl-watch w-'+w.sev+'"><b>'+(w.sev==='red'?'🔴 ':'🟡 ')+E(w.title)+'</b>'+E(w.why)+' <span class="go" onclick="vaFL.go(\''+w.anchor+'\')">→ '+T('ansehen','look')+'</span><div class="rule">'+T('Regel','Rule')+': '+E(w.rule)+'</div></div>'; });
    if(!A.watch.length)watchBody='<div class="vfl-watch">'+T('Keine Auffälligkeit oberhalb der Schwellenwerte.','Nothing above the thresholds.')+'</div>';
    h+=fold('coach',T('Worauf jetzt zu achten ist','What to watch now')+' <span class="vfl-tag r">🔴 '+nRed+'</span><span class="vfl-tag y">🟡 '+nYel+'</span>'+(A.good.length?' <span class="vfl-tag g">✅ '+A.good.length+' '+T('läuft','working')+'</span>':'')+(A.watch.length?' <span class="bd">· '+E(A.watch[0].title)+(A.watch.length>1?' …':'')+'</span>':''),watchBody+(A.good.length?'<div class="vfl-good"><b>'+T('Läuft','Working well')+':</b> '+A.good.map(E).join(' · ')+'</div>':''),false);
    h+='</div>'+next(1);

    /* 2 · Verantwortung & Pflege */
    h+=sec(2,'· '+(m.care?(m.unowned.length+T(' ohne Owner · ',' without owner · ')+m.attention.length+T(' mit Hinweis',' with a hint')):T('Pflege-Daten folgen','care data pending')));
    h+='<div class="vfl-intro">'+T('Jede Initiative hat eine:n Verantwortliche:n (Assignee in Jira), der Status, verknüpfte Tickets und die daraus abgeleiteten Key Results pflegt. Die Pflege-Ampel zeigt, wo das gerade nicht passiert — die Rangliste macht daraus einen freundlichen Wettbewerb.','Every initiative has an owner (Jira assignee) who maintains status, linked tickets and the derived key results.')+'</div>';
    if(!m.care)h+='<div class="vfl-nodata">ℹ️ '+T('Owner, Aktualität und Historie je Initiative kommen mit dem nächsten stündlichen Datenlauf.','Owner, freshness and history arrive with the next hourly data run.')+'</div>';
    var attRow=function(r,noOwner){ return '<div class="row"><div style="flex:1;min-width:0">'+link(r.key)+' <span>'+E(r.title)+'</span>'+(r.status?' <span class="vfl-tag">'+E(r.status)+'</span>':'')+'<div class="why">'+hintsHtml(r)+'</div></div><div style="text-align:right;white-space:nowrap">'+(noOwner?'':ownerChip(r.owner)+'<br>')+ampTag(r)+'</div></div>'; };
    var my=me?mine(me):null;
    if(my&&(my.inits.length||my.krs.length||my.risks.length)){
      h+='<div class="vfl-mine"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><b style="font-size:14px">🙋 '+T('Deine Verantwortung','Your ownership')+'</b><span style="font-size:12.5px">'+my.inits.length+T(' Initiativen',' initiatives')+' · '+my.krs.length+' Key Results · '+my.risks.length+T(' Risiken',' risks')+(my.rank?' · 🏆 '+T('Platz ','rank ')+my.rank+'/'+my.of+(my.row?' · Ø '+my.row.avg+'/100':''):'')+(my.attention.length?' · <b style="color:#bf2600">🔔 '+my.attention.length+' '+T('Hinweise','hints')+'</b>':' · ✨ '+T('alles gepflegt','all maintained'))+'</span></div>';
      if(my.attention.length)h+='<div class="vfl-att" style="margin-top:8px;border-left-color:var(--yellow,#ffab00)">'+tease('mine',my.attention,function(r){return attRow(r,true);},3,T('alle '+my.attention.length+' Hinweise anzeigen','show all '+my.attention.length+' hints'))+'</div>';
      h+='</div>';
    } else if(me&&m.care){ h+='<div class="vfl-mine" style="font-size:12.5px">🙋 <b>'+E(me.split(' ')[0])+'</b>, '+T('dir ist noch keine Initiative zugeordnet. ','no initiative is assigned to you yet. ')+(m.unowned.length?T(m.unowned.length+' Initiativen suchen eine:n Verantwortliche:n — in Jira den Assignee setzen, dann erscheinen sie hier.',m.unowned.length+' initiatives are looking for an owner — set the assignee in Jira.'):'')+'</div>'; }
    h+='<div class="grid"><div class="card span6"><h3>🔔 '+T('Diese Initiativen brauchen Pflege','These initiatives need care')+' <span class="amp amp-red">'+m.attention.length+'</span></h3><div class="desc">'+T('Schlechteste zuerst — jeder Hinweis nennt, was fehlt.','Worst first — every hint says what is missing.')+'</div>';
    h+=m.attention.length?'<div class="vfl-att">'+tease('att',m.attention,attRow,3)+'</div>':'<div class="vfl-good">✨ '+T('Alle Initiativen sind gepflegt.','All initiatives maintained.')+'</div>';
    h+='</div><div class="card span6"><h3>🏆 '+T('FL2+FL3-Rangliste','FL2+FL3 leaderboard')+'</h3><div class="desc">'+T('Wer pflegt Initiativen & Key Results am besten? Gleiche Formel für alle — Pflege zählt, nicht Menge.','Who maintains initiatives & key results best? Same formula for everyone.')+'</div>'+boardHtml(me,5,'lb')+'</div></div>';
    if(m.care){
      var rows=people(); var tbl='<div style="overflow-x:auto"><table class="vfl-tab"><tr><th>'+T('Person','Person')+'</th><th class="num">'+T('Initiativen','Initiatives')+'</th><th class="num">In Flight</th><th class="num">Key Results</th><th class="num">'+T('Risiken','Risks')+'</th><th class="num">Ø '+T('Pflege','Care')+'</th><th class="num">'+T('Hinweise','Hints')+'</th><th>'+T('Ältester Stand','Oldest update')+'</th><th>'+T('Auszeichnungen','Badges')+'</th></tr>';
      rows.forEach(function(p){ var oldest=null; p.inits.concat(p.krs).forEach(function(r){ if(r.stale!=null&&(oldest==null||r.stale>oldest))oldest=r.stale; }); var bc=p.avg>=80?'':p.avg>=55?' y':' r';
        tbl+='<tr'+(nn(p.n)===nn(me)?' class="cur"':'')+'><td><a style="cursor:pointer;font-weight:700" onclick="vaFL.setOwner(\''+E(p.n).replace(/'/g,'&#39;')+'\')">'+E(p.n)+'</a></td><td class="num">'+p.inits.length+'</td><td class="num">'+p.inits.filter(function(r){return r.inFlight;}).length+'</td><td class="num">'+p.krs.length+'</td><td class="num">'+p.risks.length+'</td><td class="num">'+p.avg+'<span class="vfl-bar'+bc+'"><i style="width:'+p.avg+'%"></i></span></td><td class="num">'+(p.open?(p.red?'<span style="color:#bf2600;font-weight:700">'+p.red+' 🔴</span> · ':'')+p.open:'✨ 0')+'</td><td>'+(oldest!=null?oldest+T(' T',' d'):'—')+'</td><td style="font-size:11px;color:var(--sub)">'+badgesHtml(p.badges)+'</td></tr>'; });
      if(m.unowned.length)tbl+='<tr><td><span class="vfl-own none"><i>?</i>'+T('ohne Owner','no owner')+'</span></td><td class="num" style="color:#bf2600;font-weight:700">'+m.unowned.length+'</td><td class="num">'+m.unowned.filter(function(r){return r.inFlight;}).length+'</td><td class="num">'+m.kpis.filter(function(r){return r.care&&!r.owner;}).length+'</td><td class="num">'+m.risks.filter(function(r){return r.care&&!r.owner&&r.open;}).length+'</td><td class="num">—</td><td colspan="3" style="color:#bf2600;font-size:12px">'+T('Verwaist — in Jira Assignee setzen. ','Orphaned — set the assignee in Jira. ')+'<a style="cursor:pointer;font-weight:700" onclick="vaFL.setOwner(\'__none__\')">'+T('Liste anzeigen','show list')+'</a></td></tr>';
      tbl+='</table></div>';
      h+='<div style="margin-top:14px">'+fold('ownertab','👥 '+T('Verantwortung im Team — Tabelle','Ownership in the team — table')+' <span class="bd">· '+rows.length+T(' Personen',' people')+(m.unowned.length?' · <span style="color:#bf2600">'+m.unowned.length+T(' Initiativen ohne Owner',' initiatives without owner')+'</span>':'')+'</span>',tbl,false)+'</div>';
    }
    h+=next(2);

    /* 3 · Kennzahlen (Quartal) */
    h+=sec(3,'· '+E(qShort(cur))+' · Δ = '+T('zum Vorquartal','vs. previous quarter'));
    var kpi=function(lbl,val,sub,s,dl,drill){ return '<div class="kpi k-'+s+(drill?' drillable':'')+'"'+(drill?' onclick="drillShow(\''+drill+'\')" style="cursor:pointer"':'')+'><div class="lbl">'+lbl+' <span class="chip live">● LIVE</span></div><div class="val">'+val+(dl||'')+'</div><div class="trend flat">'+sub+'</div></div>'; };
    var u=function(t){return ' <span style="font-size:13px;font-weight:600;color:var(--sub)">'+t+'</span>';};
    h+='<div class="vfl-mband"><div class="bl">'+T('Fluss auf FL2 — wie schnell und wie viel liefert die Strategie-Ebene?','Flow on FL2 — how fast and how much does the strategy level deliver?')+'</div><div class="kpis">';
    if(M){
      h+=kpi(T('Durchsatz','Throughput'),M.throughput+u(T('Initiativen','initiatives')),M.perWeek+T(' pro Woche über ',' per week across ')+M.elapsedWeeks+T(' Wochen',' weeks'),'grey',delta(M.throughput,P&&P.throughput,false));
      h+=kpi(T('Cycle Time p50','Cycle time p50'),(M.cycleP50!=null?M.cycleP50:'—')+u(T('Tage','days')),'p85 '+(M.cycleP85!=null?M.cycleP85+T(' T',' d'):'—')+' · '+T('Basis ','base ')+M.cycleN+T(' erledigte',' done'),M.cycleP50==null?'grey':M.cycleP50<=45?'green':M.cycleP50<=90?'yellow':'red',delta(M.cycleP50,P&&P.cycleP50,true,T(' T',' d')));
      h+=kpi(T('Lead Time p50','Lead time p50'),(M.leadP50!=null?M.leadP50:'—')+u(T('Tage','days')),T('Anlage bis Done — Differenz zur Cycle Time = Wartezeit vor dem Start','Created to done — gap to cycle time = waiting before start'),'grey',delta(M.leadP50,P&&P.leadP50,true,T(' T',' d')));
      h+=kpi('WIP',M.wip+u(T('in Arbeit','in progress')),M.flowDebtWeeks!=null?T('Bestand braucht ','Inventory needs ')+'<b>'+M.flowDebtWeeks+'</b>'+T(' Wochen bei heutigem Tempo',' weeks at today’s pace'):T('kein Durchsatz im Fenster','no throughput in window'),M.flowDebtWeeks==null?'grey':M.flowDebtWeeks<=13?'green':M.flowDebtWeeks<=26?'yellow':'red',delta(M.wip,P&&P.wip,true));
      h+=kpi(T('Neu gestartet','Newly started'),M.started,T('im Quartal In Flight gegangen · angelegt: ','moved to in flight this quarter · created: ')+M.created,'grey',delta(M.started,P&&P.started,true));
    } else h+='<div class="vfl-nodata" style="grid-column:1/-1"><b>'+T('Fluss-Kennzahlen auf FL2 sind noch nicht verfügbar.','FL2 flow metrics are not available yet.')+'</b> '+T('Sie kommen aus der Initiativen-Historie (Jira-Changelog), die der stündliche Datenlauf mitschreibt.','They come from the initiative history written by the hourly data run.')+'</div>';
    h+='</div></div>';
    h+='<div class="vfl-mband"><div class="bl">'+T('Verbindung & Risiko — hält die Strategie mit dem Betrieb Schritt?','Connection & risk — does strategy keep pace with operations?')+'</div><div class="kpis">';
    h+=kpi(T('FL1→FL2-Abdeckung','FL1→FL2 coverage'),(m.cov!=null?m.cov:'—')+' %',m.noLink+T(' aktive Tickets ohne Initiative — klicken',' active tickets without initiative — click'),m.cov==null?'grey':m.cov>=80?'green':m.cov>=60?'yellow':'red','','nolink');
    var unops=m.inits.filter(function(r){return r.nLinks===0;}).length;
    h+=kpi(T('Initiativen ohne FL1-Tickets','Initiatives without FL1 tickets'),unops,unops?T('noch nicht operationalisiert','not yet operationalised'):T('alle operationalisiert','all operationalised'),unops===0?'green':unops<=3?'yellow':'red');
    h+=kpi(T('Offene Risiken','Open risks'),m.openRisks.length,m.risks.length+T(' Risiken insgesamt',' risks in total'),m.openRisks.length===0?'green':m.openRisks.length<=3?'yellow':'red');
    if(m.care)h+=kpi(T('Pflege-Score Ø','Care score Ø'),m.avgScore+u('/100'),m.unowned.length+T(' ohne Owner · ',' without owner · ')+m.inits.filter(function(r){return r.stale>STALE_R;}).length+T(' > 30 T unverändert',' untouched > 30 d'),m.avgScore>=80?'green':m.avgScore>=55?'yellow':'red');
    h+='</div></div>'+next(3);

    /* 4 · Entwicklung */
    var qs=qList(TREND_N+F.trendBack).slice(0,TREND_N);
    h+=sec(4,'· '+E(qShort(qs[0]))+' – '+E(qShort(qs[qs.length-1]))+' <span class="subtab" style="margin-left:8px" onclick="vaFL.trendBack(1)">◀ '+T('früher','earlier')+'</span> <span class="subtab" onclick="vaFL.trendBack(-1)"'+(F.trendBack<=0?' style="opacity:.4"':'')+'>'+T('später','later')+' ▶</span>');
    if(m.hist){
      var S=qs.map(function(w){return fl2Metrics(w);});
      h+='<div class="vfl-charts">'
        +'<div class="vfl-chartc"><h4>'+T('Durchsatz (Initiativen)','Throughput (initiatives)')+'</h4><div class="d">'+T('Erledigte Initiativen je Quartal. Steigend ist gut.','Initiatives done per quarter. Rising is good.')+'</div>'+bars(S,'throughput',{color:'#89c527',label:'Durchsatz'})+'</div>'
        +'<div class="vfl-chartc"><h4>Cycle Time p50</h4><div class="d">'+T('In Flight → Done, Median in Tagen. Fallend ist gut.','In flight → done, median days. Falling is good.')+'</div>'+bars(S,'cycleP50',{unit:T(' T',' d'),color:'#00b8d9',label:'Cycle p50'})+'</div>'
        +'<div class="vfl-chartc"><h4>Cycle Time p85</h4><div class="d">'+T('Die Zusage-Größe. Läuft sie weg, während p50 ruhig bleibt, liegen einzelne Initiativen lange fest.','The promise. If it runs away while p50 stays calm, single initiatives are stuck.')+'</div>'+bars(S,'cycleP85',{unit:T(' T',' d'),color:'#ffab00',label:'Cycle p85'})+'</div>'
        +'<div class="vfl-chartc"><h4>WIP</h4><div class="d">'+T('Gleichzeitig laufende Initiativen am Quartalsende.','Initiatives in flight at quarter end.')+'</div>'+bars(S,'wip',{color:'#6554c0',label:'WIP'})+'</div>'
        +'</div>';
      var tb='<div style="overflow-x:auto"><table class="vfl-tab"><tr><th>'+T('Quartal','Quarter')+'</th><th>'+T('Zeitraum','Period')+'</th><th class="num">'+T('Durchsatz','Throughput')+'</th><th class="num">'+T('pro Woche','per week')+'</th><th class="num">Cycle p50</th><th class="num">Cycle p85</th><th class="num">Lead p50</th><th class="num">WIP</th><th class="num">'+T('gestartet','started')+'</th></tr>';
      S.forEach(function(s){ tb+='<tr'+(s.id===cur.id?' class="cur"':'')+'><td>'+E(qShort(s.w))+(s.running?' <span class="chip live">● '+T('läuft','running')+'</span>':'')+'</td><td>'+E(qLabel(s.w).split(' · ')[1])+'</td><td class="num">'+s.throughput+'</td><td class="num">'+s.perWeek+'</td><td class="num">'+(s.cycleP50!=null?s.cycleP50:'—')+'</td><td class="num">'+(s.cycleP85!=null?s.cycleP85:'—')+'</td><td class="num">'+(s.leadP50!=null?s.leadP50:'—')+'</td><td class="num">'+s.wip+'</td><td class="num">'+s.started+'</td></tr>'; });
      tb+='</table></div><div class="explain">'+T('Lesehilfe: Mehr Durchsatz bei gleichzeitig steigender Cycle Time heißt meistens, dass mehr parallel angefangen wurde — nicht, dass das System schneller wurde.','Read together: more throughput with rising cycle time usually means more was started in parallel.')+'</div>';
      h+='<div style="margin-top:10px">'+fold('trendtab','📋 '+T('Zahlen je Quartal — Tabelle','Numbers per quarter — table'),tb,false)+'</div>';
    } else h+='<div class="vfl-nodata"><b>'+T('Die Initiativen-Ebene (FL2) hat noch keine Historie.','FL2 has no history yet.')+'</b> '+T('Sie wird mit dem nächsten stündlichen Datenlauf aus dem Jira-Changelog aufgebaut.','It is built from the Jira changelog with the next hourly run.')+'</div>';
    var S1=qs.map(fl1Metrics).filter(Boolean);
    if(S1.length){
      var b1='<div class="vfl-charts">'
        +'<div class="vfl-chartc"><h4>'+T('Durchsatz (Tickets)','Throughput (tickets)')+'</h4><div class="d">'+T('Erledigte VA-Tickets je Quartal — der Motor hinter den Initiativen.','Tickets done per quarter — the engine behind the initiatives.')+'</div>'+bars(S1,'throughput',{color:'#00b8d9',label:'FL1 Durchsatz'})+'</div>'
        +'<div class="vfl-chartc"><h4>Cycle Time p50</h4><div class="d">'+T('In Progress → Done, Median.','In progress → done, median.')+'</div>'+bars(S1,'cycleP50',{unit:T(' T',' d'),color:'#36b37e',label:'FL1 Cycle p50'})+'</div>'
        +'<div class="vfl-chartc"><h4>Cycle Time p85</h4><div class="d">'+T('Die Zusage-Größe auf Team-Ebene.','The team-level promise.')+'</div>'+bars(S1,'cycleP85',{unit:T(' T',' d'),color:'#ffab00',label:'FL1 Cycle p85'})+'</div>'
        +'<div class="vfl-chartc"><h4>WIP</h4><div class="d">'+T('Aktive Tickets am Quartalsende.','Active tickets at quarter end.')+'</div>'+bars(S1,'wip',{color:'#6554c0',label:'FL1 WIP'})+'</div>'
        +'</div><div class="explain">'+T('FL1 erklärt FL2: Steigt hier die Cycle Time, kommen die Initiativen oben später an. ⚠ = Quartal liegt teilweise vor dem Datenfenster (26 Wochen).','FL1 explains FL2. ⚠ = quarter partly before the 26-week data window.')+'</div>';
      var last1=S1[S1.length-1];
      h+='<div style="margin-top:10px">'+fold('fl1','🔎 '+T('Dieselben Quartale eine Ebene tiefer','The same quarters one level down')+' <span class="bd">· Flight Level 1 · Board VA · '+E(qShort(last1.w))+': '+last1.throughput+T(' Tickets erledigt',' tickets done')+(last1.cycleP85!=null?' · p85 '+last1.cycleP85+T(' T',' d'):'')+'</span>',b1,false)+'</div>';
    }
    h+=next(4);

    /* 5 · Themen & Initiativen */
    var ownersAll=[]; m.inits.forEach(function(r){ if(r.owner&&ownersAll.indexOf(r.owner)<0)ownersAll.push(r.owner); }); ownersAll.sort();
    h+=sec(5,'· '+m.themes.length+T(' Themen · ',' themes · ')+m.inits.length+T(' Initiativen',' initiatives'));
    h+='<div class="vfl-filter"><label>'+T('Verantwortung','Owner')+'</label><select onchange="vaFL.setOwner(this.value)"><option value="">'+T('alle','all')+'</option>'+(me&&m.care?'<option value="'+E(me)+'"'+(F.owner===me?' selected':'')+'>'+T('nur meine','only mine')+'</option>':'')+ownersAll.map(function(o){return '<option value="'+E(o)+'"'+(F.owner===o?' selected':'')+'>'+E(o)+'</option>';}).join('')+(m.care?'<option value="__none__"'+(F.owner==='__none__'?' selected':'')+'>'+T('ohne Owner','no owner')+'</option>':'')+'</select>'
      +'<span class="tg'+(F.att?' on':'')+'" onclick="vaFL.toggleAtt()">🔔 '+T('nur mit Pflege-Hinweisen','only with care hints')+'</span>'
      +((F.owner||F.att)?'<span class="tg" onclick="vaFL.clear()">✕ '+T('Filter zurücksetzen','Clear filters')+'</span>':'')+'</div>';
    var pass=function(r){ if(F.att&&!r.hints.length)return false; if(F.owner==='__none__')return !r.owner; if(F.owner)return r.owner&&nn(r.owner)===nn(F.owner); return true; };
    var stChip=function(st){var c=/in flight/i.test(st)?'#ffab00':/ready/i.test(st)?'#4c9aff':'#97a0af';return '<span style="display:inline-block;background:'+c+'22;color:'+c+';border:1px solid '+c+'66;border-radius:10px;padding:1px 8px;font-size:10px;font-weight:700;white-space:nowrap">'+E(st)+'</span>';};
    var initRowHtml=function(r){ var p=r.nLinks?Math.round(r.nDone/r.nLinks*100):0;
      return '<div class="vfl-init">'+link(r.key)+'<span class="t">'+E(r.title)+'</span>'+stChip(r.status)+(r.care?ownerChip(r.owner):'')+ampTag(r)
        +'<span class="prog"><span class="tr"><i style="width:'+p+'%"></i></span><small>'+(r.nLinks?r.nDone+' / '+r.nLinks+T(' Tickets',' tickets'):T('keine FL1-Tickets','no FL1 tickets'))+(r.stale!=null?' · '+r.stale+T(' T alt',' d old'):'')+'</small></span>'
        +(r.hints.length?'<div class="hints">'+hintsHtml(r)+'</div>':'')+'</div>'; };
    var filt=!!(F.owner||F.att);
    h+='<div class="grid">';
    m.themes.forEach(function(t){ var inits=m.inits.filter(function(r){return r.theme===t.key;}); var shown=filt?inits.filter(pass):inits;
      if(filt&&!shown.length)return;
      var tot=inits.reduce(function(a,r){return a+r.nLinks;},0), don=inits.reduce(function(a,r){return a+r.nDone;},0);
      var worst=inits.some(function(r){return r.worst==='red';})?'red':inits.some(function(r){return r.worst==='yellow';})?'yellow':'green';
      shown=shown.slice().sort(function(a,b){return (b.inFlight?1:0)-(a.inFlight?1:0)||a.score-b.score;});
      h+='<div class="card span6"><h3>🎯 '+link(t.key)+' · '+E(t.title)+' <span class="amp amp-'+worst+'" title="'+T('Pflege-Stand der Initiativen','Care state of the initiatives')+'">'+(worst==='green'?'🟢':worst==='yellow'?'🟡':'🔴')+'</span>'+(t.owner?' '+ownerChip(t.owner):'')+'</h3><div class="desc">'+inits.length+T(' Initiativen · ',' initiatives · ')+inits.filter(function(r){return r.inFlight;}).length+' In Flight · '+don+' / '+tot+T(' FL1-Tickets erledigt',' FL1 tickets done')+'</div>'
        +(shown.length?tease('th-'+t.key,shown,initRowHtml,3):'<div class="explain">'+T('Keine aktiven Initiativen unter diesem Thema.','No active initiatives under this theme.')+'</div>')+'</div>'; });
    var orph=filt?m.orphans.filter(pass):m.orphans;
    if(orph.length)h+='<div class="card span6"><h3>🧩 '+T('Initiativen ohne strategisches Thema','Initiatives without strategic theme')+' <span class="amp amp-yellow">🟡 '+orph.length+'</span></h3><div class="desc">'+T('Bitte einem FL3-Thema zuordnen (Parent in Jira).','Please assign to an FL3 theme (parent in Jira).')+'</div>'+tease('th-orph',orph,initRowHtml,3)+'</div>';
    h+='</div>'+next(5);

    /* 6 · Risiken — offene zuerst, 3 angeteasert */
    h+=sec(6,'· '+m.openRisks.length+T(' offen von ',' open of ')+m.risks.length);
    if(m.risks.length){ var rs=m.risks.slice().sort(function(a,b){return (b.open?1:0)-(a.open?1:0)||a.score-b.score;});
      var riskRow=function(r){ return '<tr><td>'+link(r.key)+'</td><td>'+E(r.title)+'</td><td>'+stChip(r.status)+'</td>'+(m.care?'<td>'+ownerChip(r.owner)+'</td><td>'+(r.updated?fmtD(r.updated)+' ('+r.stale+T(' T',' d')+')':'—')+'</td><td style="font-size:11.5px">'+(r.hints.length?hintsHtml(r):'✨')+'</td>':'')+'</tr>'; };
      var open=isOpen('risks',false), shownR=open?rs:rs.slice(0,3);
      h+='<div class="card span12"><div style="overflow-x:auto"><table class="vfl-tab"><tr><th>Key</th><th>'+T('Risiko','Risk')+'</th><th>Status</th>'+(m.care?'<th>Owner</th><th>'+T('Zuletzt bewertet','Last reviewed')+'</th><th>'+T('Hinweis','Hint')+'</th>':'')+'</tr>'+shownR.map(riskRow).join('')+'</table></div>'
        +(rs.length>3?'<div class="vfl-more"><span class="subtab" onclick="vaFL.toggle(\'risks\')">'+(open?'▴ '+T('weniger anzeigen','show less'):'▾ '+T('alle '+rs.length+' Risiken anzeigen','show all '+rs.length+' risks'))+'</span></div>':'')+'</div>'; }
    else h+='<div class="vfl-nodata">'+T('Keine Risiken erfasst.','No risks recorded.')+'</div>';
    h+=next(6);

    /* 7 · Key Results */
    h+=sec(7,'· '+(m.care?m.krFresh+' / ':'')+m.kpis.length+(m.care?T(' mit Check-in (90 T)',' with check-in (90 d)'):''));
    h+='<div class="vfl-intro">'+T('Jedes Key Result braucht eine:n Owner und einen regelmäßigen Check-in (Wert eintragen, Kommentar) — sonst bleibt es eine Absicht.','Every key result needs an owner and a regular check-in — otherwise it stays an intention.')+'</div>';
    if(m.kpis.length){ h+='<div class="card span12"><div style="overflow-x:auto"><table class="vfl-tab"><tr><th>Key</th><th>Key Result</th><th>'+T('Thema','Theme')+'</th>'+(m.care?'<th>Owner</th><th>'+T('Letzter Check-in','Last check-in')+'</th><th>'+T('Pflege','Care')+'</th>':'')+'</tr>';
      m.kpis.slice().sort(function(a,b){return a.score-b.score;}).forEach(function(r){ var th=m.themes.find(function(t){return t.key===r.theme;}); h+='<tr><td>'+link(r.key)+'</td><td>'+E(r.title)+'</td><td style="font-size:11.5px">'+(th?E(th.title):(r.theme?E(r.theme):'—'))+'</td>'+(m.care?'<td>'+ownerChip(r.owner)+'</td><td>'+(r.updated?fmtD(r.updated)+' ('+r.stale+T(' T',' d')+')':'—')+'</td><td>'+ampTag(r)+(r.hints.length?' <span style="font-size:11px;color:var(--sub)">'+hintsHtml(r)+'</span>':'')+'</td>':'')+'</tr>'; });
      h+='</table></div></div>'; }
    else h+='<div class="vfl-nodata">'+T('Keine Key Results (Issue-Typ „KPIs“ in STA) erfasst.','No key results (issue type “KPIs” in STA) recorded.')+'</div>';
    h+=next(7);

    /* 8 · Wie wird gerechnet */
    h+=sec(8);
    h+=fold('how','📖 '+T('Definitionen & Regeln','Definitions & rules')+' <span class="bd">· '+HOW.length+T(' Begriffe',' terms')+'</span>','<table class="vfl-tab">'+HOW.map(function(r){return '<tr><td style="font-weight:700;white-space:nowrap">'+E(r[0])+'</td><td>'+E(r[1])+'</td></tr>';}).join('')+'</table>',false);
    h+='<div class="vfl-next"><span onclick="vaFL.go(\'vfl-head\')">↑ '+T('Zurück nach oben','Back to top')+'</span></div>';
    pv.innerHTML=h;
    setTimeout(function(){animate();spy();rail();},50);
  }
  /* Scroll-Spy: aktuellen Abschnitt in Wegweiser + Rail markieren */
  var SPY=null;
  function spy(){
    if(SPY){try{SPY.disconnect();}catch(e){}}
    var secs=document.querySelectorAll('#progview .vfl-sec'); if(!secs.length||!('IntersectionObserver' in window))return;
    var mark=function(id){ document.querySelectorAll('#vflNav a[data-step],#chartRail .rl-i[data-step]').forEach(function(a){a.classList.toggle('on',a.getAttribute('data-step')===id);}); };
    SPY=new IntersectionObserver(function(es){ var vis=es.filter(function(e){return e.isIntersecting;}); if(vis.length)mark(vis[0].target.id); },{rootMargin:'-80px 0px -70% 0px',threshold:0});
    secs.forEach(function(s){SPY.observe(s);});
  }
  /* Linke Rail (#chartRail, ab 1700px sichtbar): Wegweiser statt leerer Diagrammliste */
  function rail(){
    var r=document.getElementById('chartRail'); if(!r)return; var pv=document.getElementById('progview'); if(!pv||pv.style.display==='none')return;
    var h='<div class="rl-h">🛫 '+T('FL2+3 · Wegweiser','FL2+3 · guide')+'</div>';
    STEPS.forEach(function(s,i){ h+='<div class="rl-i" data-step="'+s[0]+'" onclick="vaFL.go(\''+s[0]+'\')"><span class="ic">'+(i+1)+'</span><span>'+s[1]+'</span></div>'; });
    h+='<div style="font-size:10.5px;color:var(--sub);margin-top:8px;line-height:1.5">'+T('Von oben nach unten lesen: erst der Blick aufs Ganze, dann Einschätzung, dann Verantwortung — Details sind eingeklappt.','Read top to bottom: overview first, then assessment, then ownership — details are folded.')+'</div>';
    r.innerHTML=h;
  }
  /* buildChartRail des Cockpits umhuellen: nach dem Original die FL-Rail einsetzen, wenn der FL-Tab aktiv ist */
  try{ if(typeof window.buildChartRail==='function'&&!window.buildChartRail.__vaFl){ var _bcr=window.buildChartRail; var w=function(){ _bcr.apply(this,arguments); try{rail();}catch(e){} }; w.__vaFl=true; window.buildChartRail=w; } }catch(e){}
  function boardHtml(me,limit,teaseId){
    var m=model(); if(!m||!m.care)return '<div class="vfl-nodata">'+T('Rangliste erscheint, sobald Owner-Daten vorliegen (nächster Datenlauf).','Leaderboard appears once owner data is available (next data run).')+'</div>';
    var rows=people(); if(!rows.length)return '<div class="vfl-nodata">'+T('Noch niemand trägt eine Initiative — in Jira Assignee setzen.','Nobody owns an initiative yet — set the assignee in Jira.')+'</div>';
    var open=teaseId?isOpen(teaseId,false):false; var lim=open?rows.length:(limit||rows.length);
    var h='<div class="vfl-lb">';
    rows.slice(0,lim).forEach(function(r,i){ var medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1); var isMe=me&&nn(r.n)===nn(me);
      h+='<div class="r'+(isMe?' me':'')+'"><span class="rk">'+medal+'</span><span class="lbn"><span class="nm">'+E(r.n)+(isMe?' <span class="du">('+T('du','you')+')</span>':'')+'</span><span class="bd">'+(r.badges.length?badgesHtml(r.badges):'')+'</span></span><span class="m">'+r.inits.length+T(' Init.',' init.')+' · '+r.krs.length+' KR · Ø <b>'+r.avg+'</b>'+(r.open?' · 🔔 '+r.open:' · ✨')+'</span><span class="sc">'+r.score+'</span></div>'; });
    h+='</div>';
    if(teaseId&&rows.length>(limit||0))h+='<div class="vfl-more"><span class="subtab" onclick="vaFL.toggle(\''+teaseId+'\')">'+(open?'▴ '+T('weniger anzeigen','show less'):'▾ '+T('alle '+rows.length+' anzeigen','show all '+rows.length))+'</span></div>';
    if(m.unowned.length)h+='<div class="explain" style="color:#bf2600">🔔 '+m.unowned.length+T(' Initiativen ohne Verantwortliche:n — wer übernimmt, steigt in der Rangliste.',' initiatives without owner — take one and climb the leaderboard.')+'</div>';
    h+='<div class="explain">'+T('Punkte: Ø Pflege-Score der eigenen Initiativen & Key Results (Risiken halb) + 2 je Vorgang (max. 10) − 3 je rotem Hinweis. Gleiche Formel für alle.','Points: average care score of own initiatives & key results (risks half) + 2 per item (max 10) − 3 per red hint. Same formula for everyone.')+'</div>';
    return h;
  }
  window.vaFL={render:render,go:go,toggle:toggle,setOwner:setOwner,toggleAtt:toggleAtt,clear:function(){F.owner='';F.att=false;render();},trendBack:trendBack,model:model,people:people,mine:mine,summary:summary,boardHtml:boardHtml,assess:assess,fl2Metrics:fl2Metrics,fl1Metrics:fl1Metrics,qOf:qOf,rail:rail,ver:VER};
})();
