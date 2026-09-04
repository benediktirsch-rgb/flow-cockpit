/* ═══ VA Flow Cockpit — Team-Login, Startansicht, Ranglisten (Gamification), Willkommens-Banner ═══
   Wird von build-va.ps1 nach va-fl.js und vor pb-ui.js eingebunden. Läuft NACH dem Cockpit-Hauptscript
   (RAW/REAL/PDATA/PEOPLE/USER/renderPersonal/computeAssess sind globale Bindings).
   Startansicht (seit 18.08.2026): zwei Ranglisten — Flow (FL1, PDATA) und FL2+FL3-Pflege (window.vaFL aus
   va-fl.js: Verantwortung für Initiativen & Key Results), persönliche Aufmerksamkeitsliste, kompaktes Panel.
   Auth ist clientseitig (Pilot wie Porsche): Name (gegen die Jira-Assignees) + Team-Passwort (Salted-SHA-256).
   Neues Passwort setzen: in der Konsole  vaApp.hash('neuesPasswort').then(console.log)  → VA_PW_HASH unten ersetzen.
   Einstiegspunkte (seit 19.08.2026, für den persönlichen „Vishnu Flow Compass"):
     ?go=start|me|team|aging|fl2|ziff  → springt nach dem Login direkt an die Stelle;
     ?compass=<http(s)-URL>            → merkt sich den Rücksprung („🧭 Flow Compass" im Banner);
     ?theme=dark|light                 → Farbschema (pbTheme in pb-ui.js); eingebettet nur für diese Sitzung, sonst persistiert;
     eingebettet (iframe): meldet vaCockpitReady an den Parent und nimmt {type:'compass-go',go} sowie
     {type:'compass-theme',theme} per postMessage an. */
(function(){
  'use strict';
  var VA_PW_HASH='da277872e63dfcd629c1378efa86c72f534ef24190c1afa550fbe5d594982250'; /* Salted-SHA-256 des Team-Passworts (rotiert 25.08.2026, VA-13506 — der alte Hash stand oeffentlich und gilt als kompromittiert) */
  var SALT='va::flowcockpit::';
  var AUTH_KEY='vaAuth_va2', AUTH_DAYS=30, VER='0831a'; /* AUTH_KEY-Wechsel = alle vor der Rotation gespeicherten Logins verfallen */
  var COMPASS_KEY='vaCompassUrl';
  function compassUrl(){ var u=localStorage.getItem(COMPASS_KEY)||''; return /^https?:\/\//.test(u)?u:''; }
  /* FL2+3-Schicht (site/va/va-fl.js): Pflege-Rangliste, persoenliche Verantwortung, Aufmerksamkeitsliste */
  var FL=function(){ return window.vaFL||null; };
  var de=function(){return (typeof LANG==='undefined'||LANG==='de');};
  var T=function(d,e){return de()?d:e;};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};

  /* ───────── Styles ───────── */
  var css=document.createElement('style');
  css.textContent=[
    '.vaov{position:fixed;inset:0;z-index:2000;background:rgba(12,16,19,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}',
    '.vabox{background:var(--card,#fff);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.35);border-top:5px solid var(--brand,#89c527);width:100%;max-width:520px;padding:26px 30px;color:var(--ink,#0f1010)}',
    '.vabox h2{margin:0 0 4px;font-size:20px} .vabox .sub{color:var(--sub,#5f6668);font-size:13px;margin-bottom:14px}',
    '.vabox label{display:block;font-size:12.5px;font-weight:600;color:var(--sub,#5f6668);margin:10px 0 0}',
    '.vabox input{display:block;width:100%;margin-top:4px;padding:10px 12px;border:1px solid var(--line,#e2e4e5);border-radius:8px;font:inherit;font-size:14px}',
    '.vabox .btn{display:inline-block;margin-top:16px;background:var(--brand,#89c527);color:#fff;font-weight:800;border:0;border-radius:10px;padding:11px 18px;cursor:pointer;font:inherit;font-size:14px}',
    '.vabox .btn.sec{background:var(--bg,#f0f0f0);color:var(--ink,#0f1010);font-weight:600}',
    '.vabox .err{color:#c9372c;font-size:12.5px;margin-top:8px;min-height:16px}',
    '.vabox .hint{font-size:11.5px;color:var(--sub,#5f6668);margin-top:12px;line-height:1.5}',
    /* Kompakt (18.08.): breit statt hoch — drei Spalten ab 1000px, kleinere Kacheln, Listen scrollen intern,
       Panel passt ohne Seiten-Scroll auf einen Laptop-Screen; Meeting-Guide eingeklappt */
    '.vastart{max-width:1180px;width:100%;max-height:calc(100vh - 24px);overflow:auto;padding:14px 20px 12px}',
    '.vastart h2{font-size:17px} .vastart .sub{margin-bottom:8px;font-size:12px}',
    '.vastart details.fold summary{cursor:pointer;font-size:13px;font-weight:800;margin:10px 0 4px;list-style:none;display:flex;align-items:center;gap:6px} .vastart details.fold summary::-webkit-details-marker{display:none} .vastart details.fold summary::after{content:"▸";color:var(--sub,#5f6668);font-weight:400;margin-left:auto} .vastart details.fold[open] summary::after{content:"▾"}',
    '.vastart .lb.scroll{max-height:236px;overflow:auto}',
    '.vastart .k.click{cursor:pointer;transition:.12s} .vastart .k.click:hover{outline:2px solid var(--brand,#89c527);outline-offset:-2px} .vastart .k .go{font-size:10px;color:var(--brand-dark,#5c9220);font-weight:700}',
    '.vastart .att{background:linear-gradient(180deg,#fff7e6,#fff);border:1px solid #ffe380;border-left:4px solid #ffab00;border-radius:12px;padding:10px 14px;font-size:12.5px;line-height:1.5} .vastart .att .i{padding:4px 0;border-bottom:1px dashed var(--line,#e2e4e5)} .vastart .att .i:last-child{border-bottom:0} .vastart .att .w{font-size:11.5px;color:var(--sub,#5f6668)}',
    '.vastart .att.ok{background:linear-gradient(180deg,#e3fcef,#fff);border-color:#abf5d1;border-left-color:#36b37e}',
    'html[data-theme=dark] .vastart .att{background:#3a2d0a;border-color:#5b4610} html[data-theme=dark] .vastart .att.ok{background:#0f3d2a;border-color:#1f6b4a}',
    '.vastart .kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin:8px 0}',
    '.vastart .k{background:var(--bg,#f0f0f0);border-radius:10px;padding:7px 10px} .vastart .k .l{font-size:9.5px;text-transform:uppercase;letter-spacing:.3px;color:var(--sub,#5f6668);white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .vastart .k .v{font-size:17px;font-weight:800}',
    '.vastart .cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px} @media(min-width:1000px){.vastart .cols{grid-template-columns:1fr 1fr 1fr}} @media(max-width:760px){.vastart .cols{grid-template-columns:1fr}}',
    '.vastart .sec-t{font-size:13px;font-weight:800;margin:10px 0 5px;display:flex;align-items:center;gap:6px}',
    /* Datenstand + Demo-Warnung (31.08.2026): ohne va-data.json zeigt das Cockpit synthetische Tickets —
       das muss in der Startansicht stehen, nicht nur als Badge im Kopfbereich. */
    '.vastart .vastand{font-size:11.5px;color:var(--sub,#5f6668);margin:2px 0 6px}',
    '.vastart .vawarn{background:linear-gradient(180deg,#ffebe6,#fff);border:1px solid #ffbdad;border-left:4px solid #c9372c;border-radius:10px;padding:8px 12px;font-size:12.5px;line-height:1.5;margin:4px 0 8px}',
    '.vastart .vawarn.alt{background:linear-gradient(180deg,#fff7e6,#fff);border-color:#ffe380;border-left-color:#ffab00}',
    '.vastart .vawarn code{background:rgba(0,0,0,.06);border-radius:4px;padding:0 4px}',
    'html[data-theme=dark] .vastart .vawarn{background:#4a1d16;border-color:#7a2e22} html[data-theme=dark] .vastart .vawarn.alt{background:#3a2d0a;border-color:#5b4610}',
    'html[data-theme=dark] .vastart .vawarn code{background:rgba(255,255,255,.12)}',
    /* Umschaltbare Team-Ranglisten (Flow · Abschlüsse · Erstellt · Blocker · Frische · Lead Time) */
    '.vastart .tbtabs{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 5px}',
    '.vastart .tbt{font-size:11px;font-weight:700;border:1px solid var(--line,#e2e4e5);border-radius:999px;padding:3px 9px;cursor:pointer;background:var(--card,#fff);white-space:nowrap}',
    '.vastart .tbt:hover{border-color:var(--brand,#89c527)}',
    /* Aktiver Reiter: dunkle Schrift auf Markengruen (#0c1013 auf #89c527 ~ 10:1); weiss waere 2,3:1 und faellt im Kontrast-Audit durch. */
    '.vastart .tbt.an{background:var(--brand,#89c527);border-color:var(--brand,#89c527);color:#0c1013}',
    '.vastart .tbd{font-size:11px;color:var(--sub,#5f6668);margin:0 0 5px}',
    /* Zustandsmeldungen der Ranglisten (Daten fehlen, Zeitraum leer) — eigene Klasse, weil der Lean-Modus
       des Cockpits alle .explain ausblendet und dann eine leere Liste ohne Begründung stünde. */
    '.vastart .vahint{font-size:11.5px;color:var(--sub,#5f6668);line-height:1.5;margin-top:6px}',
    'html[data-theme=dark] .vastart .tbt{background:transparent}',
    /* Eine Klasse mehr als noetig: der Auto-Dark-Patcher in pb-ui.js erzeugt fuer jede Regel mit dunkler
       Schrift ein Dark-Gegenstueck (er sieht hinter var(--brand) keinen gruenen Grund und hellt auf).
       Seine Regel haette dieselbe Spezifitaet und stuende spaeter im Head — .tbtabs sticht sie. */
    'html[data-theme=dark] .vastart .tbtabs .tbt.an{background:var(--brand,#89c527);color:#0c1013}',
    '.vastart .lb{border:1px solid var(--line,#e2e4e5);border-radius:10px;overflow:hidden} .vastart .lb .r{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px dashed var(--line,#e2e4e5);font-size:12.5px} .vastart .lb .r:last-child{border-bottom:0}',
    '.vastart .lb .r.me{background:rgba(137,197,39,.10)} .vastart .lb .rk{width:26px;font-weight:800;text-align:center} .vastart .lb .nm{flex:1;font-weight:700} .vastart .lb .bd{font-size:11px;color:var(--sub,#5f6668)} .vastart .lb .sc{font-weight:800;min-width:46px;text-align:right}',
    '.vastart .lb .m{font-size:11px;color:var(--sub,#5f6668);white-space:nowrap}',
    '.vastart .meet{font-size:12.5px;line-height:1.55} .vastart .meet b{color:var(--brand-dark,#5c9220)} .vastart .meet div{padding:5px 0;border-bottom:1px dashed var(--line,#e2e4e5)} .vastart .meet div:last-child{border-bottom:0}',
    '.vastart .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}',
    '.vastart .lvl{display:flex;align-items:center;gap:10px;background:linear-gradient(180deg,#f2f7ec,#fff);border:1px solid #d8e2cc;border-radius:12px;padding:6px 12px;font-size:12.5px}',
    '.vastart .lvl .ch{font-size:24px} .vastart .lvl .bar{height:6px;background:var(--line,#e2e4e5);border-radius:4px;overflow:hidden;margin-top:4px} .vastart .lvl .bar i{display:block;height:6px;background:var(--brand,#89c527)}',
    /* Ziffs Challenge folgt dem Farbschema: im hellen Cockpit eine helle Karte mit Markenrand,
       nur im Dark Mode die dunkle Tafel. Vorher war sie fest #0c1013 — ein schwarzer Kasten
       mitten in der hellen Startansicht, aus dem der graue „Mehr Challenges“-Button herausfiel
       (Bene, 21.08.2026; gleiche Korrektur wie in pb-start.js). */
    '.vastart .ziff{background:var(--bg,#f0f0f0);color:var(--ink,#0f1010);border:1px solid var(--line,#e2e4e5);border-left:3px solid var(--brand,#89c527);border-radius:12px;padding:11px 13px;font-size:12px;line-height:1.5} .vastart .ziff b{color:var(--brand-dark,#5c9220)} .vastart .ziff .zq{margin-top:6px;font-style:italic;opacity:.85}',
    /* Buttons als eigene Zeile (Flex) statt inline im Fließtext — sonst klebt „Antwort prüfen“ am Fragezeichen. */
    '.vastart .ziff .zb{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px} .vastart .ziff .btn{margin-top:0;padding:6px 10px;font-size:12px}',
    /* Kopfzeile der Challenge: Absender · Stufen-Chip · Stufenwechsel. Der Link nimmt ein dunkleres
       Grün als --brand-dark (#5c9220 ergibt auf der hellen Karte nur 3,3:1) — WCAG AA bei 11 px. */
    '.vastart .ziff .zh{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:5px}',
    '.vastart .ziff .zt{font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:var(--sub,#5f6668);border:1px solid var(--line,#e2e4e5);border-radius:999px;padding:1px 8px;cursor:help}',
    '.vastart .ziff .zx{margin-left:auto;background:none;border:0;color:#456e18;font:inherit;font-size:11px;font-weight:700;cursor:pointer;padding:0}',
    '.vastart .ziff .zx:hover{text-decoration:underline}',
    'html[data-theme=dark] .vastart .ziff .zt{border-color:#2a3038;color:#9aa3ad} html[data-theme=dark] .vastart .ziff .zx{color:#bfe37a}',
    '.vastart .ziff .btn.sec{background:var(--card,#fff);border:1px solid var(--line,#e2e4e5)}',
    'html[data-theme=dark] .vastart .ziff{background:#0c1013;color:#fff;border-color:#2a3038;border-left-color:#a7dc4a} html[data-theme=dark] .vastart .ziff b{color:#bfe37a}',
    'html[data-theme=dark] .vastart .ziff .btn.sec{background:#1c2026;color:#fff;border-color:#2a3038}',
    '.vastart .acts .btn{padding:8px 14px;font-size:13px}',
    /* Formel-Erklaerungen der Ranglisten im Start-Panel ausblenden (stehen im FL2+3-Tab / unter der Liste im Cockpit) */
    '.vastart .cols .explain:not(.keep){display:none}',
    /* Produktleiste „Vishnu Flow“ (Cockpit ⇄ Flow Compass) — läuft durch beide Produkte */
    '.vasuite{margin-top:10px;border-top:1px dashed var(--line,#e2e4e5);padding-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px}',
    '.vasuite .pl{font-weight:800;letter-spacing:.3px;color:var(--sub,#5f6668)}',
    '.vasuite .prod{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 11px;font-weight:700;border:1px solid var(--line,#e2e4e5);background:var(--card,#fff);text-decoration:none;color:inherit}',
    '.vasuite .prod.here{background:var(--brand,#89c527);border-color:var(--brand,#89c527);color:#fff}',
    '.vasuite a.prod:hover,.vasuite a.ep:hover{border-color:var(--brand,#89c527)}',
    '.vasuite .ep{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line,#e2e4e5);border-radius:8px;padding:3px 9px;background:var(--card,#fff);text-decoration:none;color:inherit;font-size:12px}',
    '.vasuite .ep i{font-style:normal;color:var(--sub,#5f6668);font-weight:400}',
    '.vasuite .cta{background:var(--brand,#89c527);color:#fff;border:0;border-radius:8px;padding:5px 12px;font-weight:800;cursor:pointer;font:inherit;font-size:12px}',
    '.vasuite .cta.sec{background:var(--bg,#f0f0f0);color:var(--ink,#0f1010);font-weight:700}',
    '.vasuite .st{color:var(--sub,#5f6668)} .vasuite .st b{color:var(--ink,#0f1010)}',
    'html[data-theme=dark] .vasuite .ep,html[data-theme=dark] .vasuite .prod{background:transparent}',
    '.vabox textarea{display:block;width:100%;margin-top:4px;padding:10px 12px;border:1px solid var(--line,#e2e4e5);border-radius:8px;font:inherit;font-size:14px;min-height:68px;resize:vertical}',
    '.vabox .ok{color:#1f7a4d;font-size:12.5px;margin-top:8px}',
    '.vabox .steps{background:var(--bg,#f0f0f0);border-radius:10px;padding:10px 14px;font-size:12.5px;line-height:1.6;margin-top:10px}',
    '.vabox .steps b{color:var(--brand-dark,#5c9220)}',
    /* Ausgegrauter Compass (kein eigener freigegebener Compass): Teaser, kein Werkzeug */
    '.vasuite .prod.aus,.vasuite .ep.aus{filter:grayscale(1);opacity:.55;cursor:pointer}',
    '.vasuite .prod.aus:hover,.vasuite .ep.aus:hover{opacity:.85}',
    /* Eingebetteter Compass im Cockpit (Vollbild-Ebene mit Kopfleiste) */
    '.vacp{position:fixed;inset:0;z-index:2100;background:var(--bg,#f0f0f0);display:flex;flex-direction:column}',
    '.vacp .cph{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 14px;background:var(--card,#fff);border-bottom:1px solid var(--line,#e2e4e5);font-size:12.5px}',
    '.vacp .cph b{font-size:14px}',
    '.vacp .cph .ep{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line,#e2e4e5);border-radius:8px;padding:3px 9px;background:var(--bg,#f0f0f0);text-decoration:none;color:inherit;font-size:12px;cursor:pointer}',
    '.vacp .cph .ep:hover,.vacp .cph .ep.an{border-color:var(--brand,#89c527)}',
    '.vacp .cph .ep.an{background:var(--brand,#89c527);color:#fff}',
    '.vacp .cpf{flex:1;position:relative;min-height:0}',
    '.vacp iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}',
    '.vacp.grau iframe{filter:grayscale(1) opacity(.45);pointer-events:none;user-select:none}',
    '.vacp .cpt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}',
    'html[data-theme=dark] .vacp iframe{background:#0c1013}',
    'html.va-locked .wrap,html.va-locked #chartRail,html.va-locked #ctrlRail,html.va-locked .fab,html.va-locked .fab-bubble,html.va-locked .fmfab,html.va-locked #vaWelcome{filter:blur(8px);pointer-events:none;user-select:none}',
    '#vaWelcome .wb{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px} #vaWelcome .wb span{cursor:pointer}',
    '#vaStartBtn{cursor:pointer}'
  ].join('\n');
  document.head.appendChild(css);

  /* ───────── Auth ───────── */
  function auth(){ try{var a=JSON.parse(localStorage.getItem(AUTH_KEY)||'null'); if(a&&a.name&&a.exp>Date.now())return a;}catch(e){} return null; }
  function hash(pw){
    var data=new TextEncoder().encode(SALT+String(pw||''));
    return crypto.subtle.digest('SHA-256',data).then(function(buf){return Array.from(new Uint8Array(buf)).map(function(b){return ('0'+b.toString(16)).slice(-2);}).join('');});
  }
  var nn=function(s){return String(s||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();};
  function matchPerson(raw){
    var P=(typeof PEOPLE!=='undefined'&&PEOPLE)||[]; raw=String(raw||'').trim(); if(!raw)return null;
    var c=nn(raw),rev=c.split(' ').reverse().join(' ');
    var p=P.find(function(x){return x[0].toLowerCase()===raw.toLowerCase();})
      ||P.find(function(x){return nn(x[0])===c;})||P.find(function(x){return nn(x[0])===rev;});
    if(!p){var sf=P.filter(function(x){var parts=nn(x[0]).split(' ');return parts[0]===c||parts.indexOf(c)>=0;}); if(sf.length===1)p=sf[0];}
    if(!p){var sf2=P.filter(function(x){var parts=nn(x[0]).split(' ');return parts.some(function(w){return w.length>=4&&c.indexOf(w)>=0;});}); if(sf2.length===1)p=sf2[0];}
    return p||null;
  }
  /* Ein Login für beide Werkzeuge (27.08.2026): dieselben Schlüssel, die auch das Compass-Gate
     schreibt (dashboard.html › vaAnmelden). Live liegen /va/ und /compass/ auf einer Herkunft —
     wer sich hier anmeldet, ist drüben angemeldet, und umgekehrt. */
  function anmelden(name,tuer){
    localStorage.setItem(AUTH_KEY,JSON.stringify({name:name,exp:Date.now()+AUTH_DAYS*86400000,ts:Date.now(),tuer:!!tuer}));
    localStorage.setItem('vaUser_va',JSON.stringify({name:name,role:'Coach'}));
    try{
      localStorage.setItem('compassGate',JSON.stringify({h:VA_PW_HASH,bis:Date.now()+AUTH_DAYS*86400000}));
      localStorage.setItem('compassUser',JSON.stringify({name:name,seit:Date.now()}));
    }catch(e){}
    sessionStorage.removeItem('vaStartSeen');
  }
  /* Anmelde-Link + Passwort-vergessen laufen über flow-login.php (Variante F, CORS offen).
     Der Endpunkt schickt nur an freigegebene Adressen — die Antwort ist immer „ok“. */
  var LOGIN_API='https://vishnuartists.com/flow-login.php';
  /* ── Die Tür (04.09.2026): liegt das Cockpit hinter gate.php (ein Konto von vishnuartists.com für alle
     Produkt-Subdomains), kennt der Server die Person schon — das Team-Passwort wäre ein zweites Login für
     dieselbe Sitzung. ?wer=1 sagt, wer da ist (Vorname, Mail). Der Jira-Name wird aus dem Vornamen gesucht;
     ist er nicht eindeutig, bleibt nur die Namensfrage — ohne Passwort. Antwortet die Tür nicht (lokal,
     Basic-Auth-Instanz, Netz weg), läuft der alte Weg. ── */
  var TUER=null;
  function tuerFragen(){
    var u=''; try{ u=new URL('/gate.php?wer=1',location.href).href; }catch(e){}
    if(!/^https:/.test(u)) return Promise.resolve(null);
    var spaet=new Promise(function(r){ setTimeout(function(){ r(null); },4000); });
    var frage=fetch(u,{credentials:'same-origin',cache:'no-store'})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(j){ return (j&&j.ok)?j:null; })
      .catch(function(){ return null; });
    return Promise.race([frage,spaet]);
  }
  /* ── Windows Hello / Fingerabdruck / Face: derselbe Geräte-Eintrag (compassBio) wie im
     Compass-Gate. Geräte-Komfort hinter der OS-Sperre, kein Server-Beweis — gespeichert sind
     nur Name, Credential-ID und der Gate-Hash. Angeboten wird der Knopf nur, wenn der Eintrag
     zum aktuellen Team-Passwort gehört (nach einer Rotation verfällt er von selbst). ── */
  var BIO_KEY='compassBio', BIO_NIE='compassBioNie';
  function bioKann(){ return !!(window.PublicKeyCredential&&window.isSecureContext&&window.crypto&&crypto.subtle); }
  function bioEintrag(){ try{var e=JSON.parse(localStorage.getItem(BIO_KEY)||'null'); return (e&&e.id&&e.h===VA_PW_HASH)?e:null;}catch(e){ return null; } }
  function bioRnd(n){ var b=new Uint8Array(n); crypto.getRandomValues(b); return b; }
  function bioB64(buf){ var s=''; new Uint8Array(buf).forEach(function(x){s+=String.fromCharCode(x);}); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function bioUnb64(t){ t=t.replace(/-/g,'+').replace(/_/g,'/'); while(t.length%4)t+='='; var bin=atob(t),b=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i); return b; }
  function bioVerknuepfen(){
    var a=auth(); if(!bioKann()||!a) return Promise.resolve(false);
    return navigator.credentials.create({publicKey:{challenge:bioRnd(32),rp:{name:'Vishnu Flow Compass'},
      user:{id:new TextEncoder().encode(a.name),name:a.name,displayName:a.name},
      pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},
      timeout:60000,attestation:'none'}})
      .then(function(c){ if(!c)return false; localStorage.setItem(BIO_KEY,JSON.stringify({name:a.name,id:bioB64(c.rawId),h:VA_PW_HASH})); localStorage.removeItem(BIO_NIE); return true; })
      .catch(function(){ return false; });
  }
  function bioLogin(){
    var e=bioEintrag(); if(!e) return Promise.resolve(false);
    return navigator.credentials.get({publicKey:{challenge:bioRnd(32),
      allowCredentials:[{type:'public-key',id:bioUnb64(e.id),transports:['internal']}],userVerification:'required',timeout:60000}})
      .then(function(c){ if(!c)return false; anmelden(e.name); location.reload(); return true; })
      .catch(function(){ return false; });
  }
  /* Nach der Anmeldung einmalig anbieten, dieses Gerät zu verknüpfen (gleiches Muster wie im Compass). */
  function bioAngebot(){
    var a0=auth(); if(!bioKann()||!a0||a0.tuer)return;   /* durch die Tür angemeldet: Passkeys gehören zum Konto */
    try{ if(JSON.parse(localStorage.getItem(BIO_KEY)||'null'))return; }catch(e){}
    if(localStorage.getItem(BIO_NIE)||sessionStorage.getItem('vaBioGefragt'))return;
    sessionStorage.setItem('vaBioGefragt','1');
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(function(ok){
      if(!ok||document.getElementById('vaBioToast'))return;
      var t=document.createElement('div'); t.id='vaBioToast';
      t.style.cssText='position:fixed;right:16px;bottom:16px;z-index:9999;max-width:320px;background:#1c2431;color:#f1f4f9;border:1px solid #3a4557;border-radius:12px;padding:14px;box-shadow:0 8px 26px rgba(0,0,0,.35);font-size:13px;line-height:1.45';
      t.innerHTML='<b style="color:#ffffff">'+T('Schneller anmelden?','Sign in faster?')+'</b><br>'+T('Dieses Gerät per Fingerabdruck / Windows Hello / Face verknüpfen — gilt für Cockpit und Compass, beim nächsten Mal genügt ein Tipp.','Link this device via fingerprint / Windows Hello / Face — works for cockpit and Compass, next time one tap is enough.')
        +'<div style="margin-top:10px;display:flex;gap:8px">'
        +'<button id="vaBioJa" style="flex:1;padding:8px;border:none;border-radius:8px;background:#3d63ff;color:#ffffff;font-weight:700;cursor:pointer">'+T('Verknüpfen','Link')+'</button>'
        +'<button id="vaBioSp" style="padding:8px 10px;border:1px solid #556174;border-radius:8px;background:transparent;color:#f1f4f9;cursor:pointer">'+T('Später','Later')+'</button>'
        +'<button id="vaBioNie" style="padding:8px 10px;border:none;background:transparent;color:#9aa3b2;cursor:pointer">'+T('Nie','Never')+'</button></div>';
      document.body.appendChild(t);
      document.getElementById('vaBioJa').onclick=function(){ bioVerknuepfen().then(function(ok){ t.innerHTML=ok?'✅ '+T('Verknüpft — nächste Anmeldung per Fingertipp.','Linked — next sign-in is one tap.'):T('Hat nicht geklappt (abgebrochen?).','Did not work (cancelled?).'); setTimeout(function(){t.remove();},3500); }); };
      document.getElementById('vaBioSp').onclick=function(){t.remove();};
      document.getElementById('vaBioNie').onclick=function(){ localStorage.setItem(BIO_NIE,'1'); t.remove(); };
    }).catch(function(){});
  }
  function loginShow(msg){
    if(document.getElementById('vaLogin'))return;
    var a=auth(), bio=bioEintrag();
    /* Namensvorschläge: dieselbe Liste, gegen die der Login prüft (Jira-Assignees aus va-data.json) */
    var namen=((typeof PEOPLE!=='undefined'&&PEOPLE)||[]).map(function(x){return x[0];}).filter(istAktiv);
    var ov=document.createElement('div'); ov.className='vaov'; ov.id='vaLogin';
    ov.innerHTML='<div class="vabox">'
      +'<h2>🔐 '+T('Vishnu Artists · Flow Cockpit','Vishnu Artists · Flow Cockpit')+'</h2>'
      +'<div class="sub">'+(TUER
        ?T('Du bist angemeldet als '+(TUER.mail||TUER.name||'')+'. Unter welchem Namen stehst du in Jira? Danach bist du drin — ohne Passwort.','You are signed in as '+(TUER.mail||TUER.name||'')+'. Which name are you in Jira? Then you are in — no password needed.')
        :T('Team-Login — gilt zugleich für deinen persönlichen Flow Compass (eine Anmeldung für beide Werkzeuge).','Team login — also signs you into your personal Flow Compass (one sign-in for both tools).'))+'</div>'
      +'<label>'+T('Dein Name','Your name')+'<input id="vaLName" autocomplete="username" list="vaLNamen" placeholder="'+T('z. B. Vorname reicht, wenn eindeutig','e.g. first name is enough if unique')+'" value="'+esc(a?a.name:(TUER&&TUER.name)||'')+'"></label>'
      +'<datalist id="vaLNamen">'+namen.map(function(n){return '<option value="'+esc(n)+'">';}).join('')+'</datalist>'
      +'<div class="hint" id="vaLWer" style="margin-top:4px;min-height:14px"></div>'
      +(TUER?'':'<label>'+T('Team-Passwort','Team password')+'<input id="vaLPw" type="password" autocomplete="current-password"></label>')
      +'<div class="err" id="vaLErr">'+esc(msg||'')+'</div>'
      +'<button class="btn" id="vaLBtn">'+T('Anmelden →','Sign in →')+'</button>'
      +(bio?' <button class="btn sec" id="vaLBio">🔓 '+T('Als ','Sign in as ')+esc(bio.name)+T(' anmelden (Hello / Face)',' (Hello / Face)')+'</button>':'')
      +(a?' <button class="btn sec" id="vaLCancel">'+T('Abbrechen','Cancel')+'</button>':'')
      +'<div class="hint" style="margin-top:12px'+(TUER?';display:none':'')+'">'
      +'<a href="#" id="vaLLink" style="color:var(--brand-dark,#5c9220);font-weight:700">📧 '+T('Anmelde-Link per Mail','Email me a sign-in link')+'</a>'
      +' · <a href="#" id="vaLReset" style="color:var(--brand-dark,#5c9220);font-weight:700">'+T('Passwort vergessen?','Forgot the password?')+'</a></div>'
      +'<div id="vaLMailRow" style="display:none">'
      +'<label>'+T('Deine E-Mail','Your email')+'<input id="vaLMail" type="email" autocomplete="email" placeholder="du@vishnuartists.com"></label>'
      +'<button class="btn sec" id="vaLMailGo" style="margin-top:8px"></button>'
      +'<div class="hint" id="vaLMailInfo"></div></div>'
      +'<div class="hint">'+T('Alle im Team sind Coaches: nach der Anmeldung siehst du alle Diagramme, die persönliche Übersicht aller Personen und die Team-Rangliste. Die Anmeldung gilt 30 Tage auf diesem Gerät — im Cockpit und im Compass.','Everyone on the team is a coach: after signing in you see all charts, everyone’s personal view and the team leaderboard. Sign-in lasts 30 days on this device — in the cockpit and the Compass.')+'</div>'
      +'</div>';
    document.body.appendChild(ov);
    var go=function(){
      var pwEl=document.getElementById('vaLPw');
      var name=document.getElementById('vaLName').value, pw=pwEl?pwEl.value:'', err=document.getElementById('vaLErr');
      var p=matchPerson(name);
      if(!p){err.textContent=T('Name nicht erkannt — bitte wie in Jira schreiben (Vorname reicht, wenn eindeutig).','Name not recognised — type it as in Jira (first name is enough if unique).');return;}
      /* Ausgeschieden (ROSTER.weg): kein Zugang mehr, aber eine Meldung, die den Weg zeigt —
         eine stumme Ablehnung würde nach einem Fehler des Cockpits aussehen. */
      if(!istAktiv(p[0])){err.textContent=T('Für '+p[0]+' ist der Zugang beendet'+(wegSeit(p[0])?' ('+wegSeit(p[0])+')':'')+'. Wenn das nicht stimmt: bei Benedikt melden.','Access for '+p[0]+' has ended. If that is wrong, tell Benedikt.');return;}
      if(TUER){ anmelden(p[0],true); location.reload(); return; }   /* die Tür hat die Person schon geprüft */
      hash(pw).then(function(h){
        if(h!==VA_PW_HASH){err.textContent=T('Team-Passwort stimmt nicht.','Wrong team password.');return;}
        anmelden(p[0]);
        location.reload();
      });
    };
    document.getElementById('vaLBtn').onclick=go;
    ['vaLName','vaLPw'].forEach(function(id){var el=document.getElementById(id); if(el)el.onkeydown=function(e){if(e.key==='Enter')go();};});
    var cx=document.getElementById('vaLCancel'); if(cx)cx.onclick=function(){ov.remove();};
    var bb=document.getElementById('vaLBio'); if(bb)bb.onclick=function(){ bioLogin().then(function(ok){ if(!ok)bb.textContent=T('Nicht geklappt — bitte Team-Passwort nutzen.','Did not work — please use the team password.'); }); };
    /* Vorschlag unter dem Namensfeld: wer wird das, und in welcher Rolle? */
    var nameEl=document.getElementById('vaLName'), wer=document.getElementById('vaLWer');
    var werZeigen=function(){
      var v=nameEl.value.trim();
      if(!v){ wer.textContent=''; return; }
      if(v.indexOf('@')>=0){ wer.textContent=T('Bitte deinen Namen, keine E-Mail-Adresse — die gehört zum Anmelde-Link unten.','Your name, not an email address — that belongs to the sign-in link below.'); return; }
      var p=matchPerson(v);
      wer.textContent=p?('✓ '+T('Anmeldung als: ','Signing in as: ')+p[0]+' · '+T('Rolle: Coach','Role: coach'))
        :T('Noch kein Treffer — Vorschläge stehen in der Liste am Feld.','No match yet — suggestions are in the list on the field.');
    };
    nameEl.addEventListener('input',werZeigen); werZeigen();
    /* Anmelde-Link / Passwort vergessen: E-Mail-Zeile aufklappen und an flow-login.php schicken */
    var mailArt='link';
    var mailZeigen=function(art){
      mailArt=art;
      document.getElementById('vaLMailRow').style.display='block';
      document.getElementById('vaLMailGo').textContent=art==='reset'?T('Link schicken & Benedikt Bescheid geben →','Send link & tell Benedikt →'):T('Anmelde-Link schicken →','Send sign-in link →');
      document.getElementById('vaLMailInfo').textContent=art==='reset'
        ?T('Das Team-Passwort kann nur Benedikt neu setzen — er bekommt eine Meldung. Mit dem Link kommst du sofort wieder rein.','Only Benedikt can rotate the team password — he gets a note. The link signs you in right away.')
        :T('Der Link gilt 30 Minuten, genau einmal, und geht nur an freigegebene Team-Adressen.','The link is valid for 30 minutes, exactly once, and only goes to approved team addresses.');
      setTimeout(function(){try{document.getElementById('vaLMail').focus();}catch(e){}},60);
    };
    document.getElementById('vaLLink').onclick=function(e){e.preventDefault();mailZeigen('link');};
    document.getElementById('vaLReset').onclick=function(e){e.preventDefault();mailZeigen('reset');};
    document.getElementById('vaLMailGo').onclick=function(){
      var mail=document.getElementById('vaLMail').value.trim(), info=document.getElementById('vaLMailInfo');
      var p=matchPerson(nameEl.value), nm=p?p[0]:nameEl.value.trim();
      if(!nm){ info.textContent=T('Bitte oben zuerst deinen Namen eintragen.','Please enter your name above first.'); return; }
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){ info.textContent=T('Bitte eine gültige E-Mail-Adresse angeben.','Please enter a valid email address.'); return; }
      var btn=this; btn.disabled=true;
      fetch(LOGIN_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aktion:mailArt,name:nm,mail:mail,ziel:'va'})})
        .then(function(r){return r.json();})
        .then(function(){ info.textContent='✅ '+T('Wenn die Adresse freigegeben ist, liegt der Link in wenigen Minuten im Postfach (auch im Spam nachsehen).','If the address is approved, the link arrives within minutes (check spam too).'); })
        .catch(function(){ btn.disabled=false; info.textContent=T('Gerade keine Verbindung — bitte später noch einmal.','No connection right now — please try again later.'); });
    };
    setTimeout(function(){try{document.getElementById((a&&!TUER)?'vaLPw':'vaLName').focus();}catch(e){}},60);
  }
  function logout(){
    /* Kam die Person durch die Tür, heißt Abmelden: Türcookie weg und das Konto der Website abmelden —
       sonst stünde sie nach dem Neuladen in derselben Sekunde wieder drin. */
    var a=auth(), tuer=!!(a&&a.tuer);
    ['vaUser_va','compassGate','compassUser'].forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
    localStorage.removeItem(AUTH_KEY); sessionStorage.removeItem('vaStartSeen');
    if(tuer){ location.href=new URL('/gate.php?raus=1',location.href).href; return; }
    location.reload();
  }

  /* ───────── Team-Besetzung (31.08.2026) ─────────
     Wer heute im Team ist, steht hier — nicht in den Jira-Daten. Jira kennt nur Assignees, und ein
     Assignee bleibt stehen, wenn jemand geht: Yasmine und Nayab standen deshalb noch in der Rangliste.
     Regel: nur `aktiv` erscheint in Ranglisten, Personen-Kennzahlen und Login. Wer geht, kommt nach
     `weg` (mit Monat) — die offenen Tickets bleiben sichtbar, aber gebündelt als „herrenlos“.
     Taucht ein Assignee auf, der in keiner der beiden Listen steht, meldet die Startansicht das
     („Neu in den Daten“) — so verrottet die Liste nicht still weiter. */
  var ROSTER={
    aktiv:['Benedikt Irsch','philipp','Jan Edinger','florian.rister','Domingo Lopez','Marwan EL KHALIL'],
    weg:[['Yasmine','08/2026'],['Nayab Schneider','06/2026'],['Kavita Patil',''],['Leonard von Stengel',''],['Alberto Golmar','']]
  };
  var nkey=function(n){return String(n==null?'':n).trim().toLowerCase();};
  var AKTIV={}, WEG={};
  ROSTER.aktiv.forEach(function(n){AKTIV[nkey(n)]=n;});
  ROSTER.weg.forEach(function(r){WEG[nkey(r[0])]=r[1]||'';});
  function istAktiv(n){return !!AKTIV[nkey(n)];}
  function istWeg(n){return WEG.hasOwnProperty(nkey(n));}
  function wegSeit(n){return WEG[nkey(n)]||'';}
  /* Automaten sind keine Kolleg:innen: „Automation for Jira" legt Tickets an und taucht damit als
     Reporter auf — in einer Liste „neu im Team?" wäre das nur Rauschen. */
  var BOT=/\bautomation\b|\bbot\b|atlassian|addon|system user|jira (outlook|service)/i;
  /* Assignees/Reporter aus den Daten, die weder aktiv noch als ausgeschieden eingetragen sind */
  function unbekannte(){
    var seen={}, out=[];
    RAWS().forEach(function(i){
      [i[8],(i.length>15?i[15]:'')].forEach(function(n){
        if(!n||seen[nkey(n)]||istAktiv(n)||istWeg(n)||BOT.test(n))return; seen[nkey(n)]=1; out.push(n);
      });
    });
    return out;
  }

  /* ───────── Datenstand: echte Zahlen oder Demo? ─────────
     Ohne erreichbare va-data.json erzeugt das Cockpit 170 synthetische Tickets (DEMOGEN) und verteilt
     sie auf CONFIG.people — die Ranglisten sehen dann echt aus, sind es aber nicht (Bene, 31.08.2026:
     „im Cockpit stimmen die Zahlen nicht“). Der Hinweis dazu stand bisher nur als kleiner Badge im
     Kopfbereich; in der Startansicht war er unsichtbar. Deshalb hier prominent. */
  function stand(){
    try{
      var m=(typeof RAWDATA!=='undefined'&&RAWDATA&&RAWDATA.meta)?RAWDATA.meta:null;
      if(!m)return null;
      var alter=null;
      if(m.importDate){ alter=Math.round((Date.now()-new Date(m.importDate+'T00:00:00Z'))/864e5); }
      /* Stundengenaues Alter aus meta.generatedAt (VA-13495): importDate kennt nur den Tag, ein
         ausgefallener Datenlauf faellt damit erst nach Tagen auf. */
      var std=null;
      if(m.generatedAt){ var t=Date.parse(m.generatedAt); if(!isNaN(t))std=(Date.now()-t)/36e5; }
      return {demo:!!m.demo,datum:m.importDate||'',alter:alter,stunden:std,n:RAWS().length,puffer:m.puffer||null};
    }catch(e){ return null; }
  }
  function standHtml(){
    var s=stand(); if(!s)return '';
    if(s.demo)return '<div class="vawarn"><b>⚠ '+T('Demo-Daten — das sind keine Zahlen aus eurem Jira.','Demo data — these are not numbers from your Jira.')+'</b>'
      +'<div>'+T('Das Cockpit konnte <code>va-data.json</code> nicht laden und zeigt 170 erfundene Tickets. Namen und Werte in den Ranglisten sind ausgedacht.','The cockpit could not load <code>va-data.json</code> and is showing 170 invented tickets. Names and values in the leaderboards are made up.')
      +'<span id="vaDiag"> '+T('Grund wird geprüft …','Checking the reason …')+'</span></div></div>';
    /* Puffer (04.09.2026): die Datei war nicht erreichbar oder leer, angezeigt wird der letzte
       echte Stand aus diesem Browser. Besser als Demo-Zahlen — aber es muss dranstehen. */
    if(s.puffer){
      var geholt=(typeof s.puffer==='string')?new Date(s.puffer):null;
      var gtxt=(geholt&&!isNaN(geholt))?(' ('+T('zuletzt geholt','last fetched')+' '+geholt.toLocaleString(de()?'de-DE':'en-GB',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+')'):'';
      return '<div class="vawarn"><b>📦 '+T('Aus dem Puffer in diesem Browser — Datenstand '+dDE(s.datum)+'.','From this browser buffer — data as of '+s.datum+'.')+'</b>'
        +'<div>'+T('<code>va-data.json</code> ist gerade nicht erreichbar oder enthält keinen einzigen Vorgang. Angezeigt wird der letzte echte Stand'+gtxt+' — keine erfundenen Zahlen, aber möglicherweise nicht von heute. Ein Neuladen holt echte Daten, sobald der stündliche Datenlauf wieder liefert.','<code>va-data.json</code> is unreachable or contains no work items. Showing the last real data'+gtxt+' — nothing invented, but possibly not from today.')+'</div></div>';
    }
    /* Alters-Ampel (VA-13495): unter 2 h gruen, bis 24 h gelb, darueber rot. Ein still stehen
       gebliebener Datenlauf sieht sonst aus wie eine Aussage ueber das Team. */
    var h=s.stunden;
    if(h!=null&&h>24)return '<div class="vawarn"><b>🔴 '+T('Daten sind '+altText(h)+' alt — der Import läuft vermutlich nicht.','Data is '+altText(h)+' old — the import is probably not running.')+'</b>'
      +'<div>'+T('Der stündliche Datenlauf (GitHub-Workflow „VA-Board Daten aktualisieren“) hat seitdem nichts Neues geliefert. Die Zahlen unten sind der alte Stand, keine Aussage über das Team.','The hourly data run has not delivered anything newer since then. The numbers below are the old state, not a statement about the team.')+'</div></div>';
    if(h!=null&&h>2)return '<div class="vawarn alt"><b>🟡 '+T('Daten sind '+altText(h)+' alt.','Data is '+altText(h)+' old.')+'</b>'
      +'<div>'+T('Der stündliche Datenlauf hat seitdem nichts Neues geliefert — meist harmlos, ab 24 Stunden wird hier rot.','The hourly data run has not delivered anything newer since then — usually harmless; above 24 hours this turns red.')+'</div></div>';
    if(s.alter!=null&&s.alter>2&&h==null)return '<div class="vawarn alt"><b>🕓 '+T('Datenstand '+dDE(s.datum)+' — '+s.alter+' Tage alt.','Data as of '+s.datum+' — '+s.alter+' days old.')+'</b>'
      +'<div>'+T('Der stündliche Datenlauf (GitHub-Workflow „VA-Board Daten aktualisieren“) hat seitdem nichts Neues geliefert.','The hourly data run has not delivered anything newer since then.')+'</div></div>';
    return '<div class="vastand">🟢 '+T('Datenstand','Data as of')+' <b>'+dDE(s.datum)+'</b>'+(h!=null?' · '+altText(h)+T(' alt',' old'):'')+' · '+s.n+T(' Tickets',' tickets')+'</div>';
  }
  function dDE(s){ return (de()&&/^\d{4}-\d{2}-\d{2}$/.test(s||''))?(s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4)):(s||'—'); }
  /* Alter in Worten: Minuten unter einer Stunde, Stunden bis zwei Tage, danach Tage. */
  function altText(h){
    if(h<1){ var m=Math.max(1,Math.round(h*60)); return m+(de()?' Minuten':' minutes'); }
    if(h<48){ var st=Math.round(h); return st+(de()?(st===1?' Stunde':' Stunden'):(st===1?' hour':' hours')); }
    var t=Math.round(h/24); return t+(de()?' Tage':' days');
  }
  /* Wenn Demo laeuft: nachfragen, WARUM die Datei fehlt. Ein 401 (Zugangsschutz greift auch fuer die
     JSON) sieht im Ergebnis genauso aus wie ein 404 (Datenlauf hat nichts hochgeladen) — die Ursache
     ist aber eine voellig andere. Laeuft nach dem Einhaengen der Startansicht und schreibt in #vaDiag. */
  function demoDiagnose(){
    var s=stand(); if(!s||!s.demo)return;
    var el=document.getElementById('vaDiag'); if(!el||!window.fetch)return;
    var sag=function(txt){ var e=document.getElementById('vaDiag'); if(e)e.innerHTML=' <b>'+esc(txt)+'</b>'; };
    fetch('va-data.json?ts='+Date.now(),{cache:'no-store'}).then(function(r){
      if(r.status===401||r.status===403)return sag(T('Grund: HTTP '+r.status+' — der Zugangsschutz (.htaccess) sperrt auch die Datendatei, nicht nur die Seite.','Reason: HTTP '+r.status+' — the access protection blocks the data file too.'));
      if(r.status===404)return sag(T('Grund: HTTP 404 — die Datei liegt nicht neben der Seite. Der stündliche Datenlauf hat sie nicht hochgeladen.','Reason: HTTP 404 — the file is not next to the page.'));
      if(!r.ok)return sag(T('Grund: HTTP '+r.status+'.','Reason: HTTP '+r.status+'.'));
      return r.text().then(function(t){
        try{ var d=JSON.parse(t); sag(d&&d.issues&&d.issues.length
          ? T('Die Datei ist da und lesbar (Stand '+dDE(d.meta&&d.meta.importDate)+') — ein Neuladen der Seite sollte die echten Zahlen bringen.','The file is there and readable — reload the page.')
          : T('Die Datei ist da, enthält aber keine Tickets.','The file is there but contains no tickets.')); }
        catch(e){ sag(T('Die Datei ist da, aber kein gültiges JSON (' +t.slice(0,20).replace(/\s+/g,' ')+ '…).','The file is there but is not valid JSON.')); }
      });
    }).catch(function(){ sag(T('Grund: keine Antwort auf va-data.json (Netzwerk oder Server).','Reason: no response for va-data.json.')); });
  }

  /* ───────── Rangliste (Gamification) aus PDATA — gleiche Werte fuer alle (rein datenbasiert) ───────── */
  function board(){
    if(typeof PDATA==='undefined'||!PDATA)return [];
    var rows=Object.keys(PDATA).map(function(n){
      var d=PDATA[n]||{}, wip=d.wip||0, done=d.doneP||0, d7=d.done7||0, blk=d.flagged||0, old=d.oldestDays||0;
      var s=done*8+d7*5;
      s+= wip===0?0:(wip<=2?15:-6*(wip-2));
      s+= blk?-8*blk:8;
      s+= old===0?0:(old<30?10:(old>365?-40:(old>90?-25:0)));
      var badges=[];
      return {n:n,score:s,done:done,d7:d7,wip:wip,blk:blk,old:old,badges:badges,pd:d};
    }).filter(function(r){return (r.done||r.wip)&&istAktiv(r.n);});
    if(!rows.length)return rows;
    var mx=function(k){return Math.max.apply(null,rows.map(function(r){return r[k];}));};
    var maxDone=mx('done');
    rows.forEach(function(r){
      if(r.done===maxDone&&maxDone>0)r.badges.push(['🏁',T('Finisher','Finisher'),T('meiste Abschlüsse im Zeitraum','most completions in period')]);
      if(r.wip>0&&r.wip<=2)r.badges.push(['🎯',T('Fokus','Focus'),T('WIP ≤ 2','WIP ≤ 2')]);
      if(r.blk===0&&r.wip>0)r.badges.push(['🟢',T('Blockerfrei','Blocker-free'),T('kein geblocktes Ticket','no blocked ticket')]);
      if(r.old>0&&r.old<30)r.badges.push(['🧹',T('Frisch','Fresh'),T('kein Ticket älter als 30 T','no ticket older than 30 d')]);
      if(r.d7>0)r.badges.push(['⚡',T('Diese Woche','This week'),r.d7+T(' erledigt',' done')]);
    });
    rows.sort(function(a,b){return b.score-a.score||b.done-a.done||a.wip-b.wip;});
    return rows;
  }
  function boardHtml(limit){
    var rows=board(); var me=(typeof USER!=='undefined'&&USER&&USER.name)||'';
    if(!rows.length)return '<div class="vahint">'+T('Noch keine persönlichen Werte im Datenstand.','No personal values in this data set yet.')+'</div>';
    var h='<div class="lb">';
    rows.slice(0,limit||rows.length).forEach(function(r,i){
      var medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
      h+='<div class="r'+(r.n===me?' me':'')+'"><span class="rk">'+medal+'</span><span class="nm">'+esc(r.n)+(r.n===me?' <span class="bd">('+T('du','you')+')</span>':'')
        +'<div class="bd">'+r.badges.map(function(b){return '<span title="'+esc(b[2])+'">'+b[0]+' '+esc(b[1])+'</span>';}).join(' · ')+'</div></span>'
        +'<span class="m">'+T('erledigt','done')+' <b>'+r.done+'</b> · WIP <b>'+r.wip+'</b> · '+T('ältestes','oldest')+' <b>'+r.old+' '+T('T','d')+'</b>'+(r.blk?' · 🚩 '+r.blk:'')+'</span>'
        +'<span class="sc">'+r.score+'</span></div>';
    });
    h+='</div><div class="explain" style="margin-top:6px">'+T('Punkte: +8 je erledigtes Ticket im Zeitraum, +5 je Abschluss diese Woche, +15 bei WIP ≤ 2 (−6 je Ticket darüber), +8 blockerfrei (−8 je Blocker), +10 wenn nichts älter als 30 T (−25 ab 90 T, −40 ab 1 Jahr). Gleiche Formel für alle — der Zeitraum oben rechts wirkt mit.','Points: +8 per ticket done in period, +5 per completion this week, +15 for WIP ≤ 2 (−6 per ticket above), +8 blocker-free (−8 per blocker), +10 if nothing older than 30 d (−25 from 90 d, −40 from 1 year). Same formula for everyone — the period selector applies.')+'</div>';
    return h;
  }

  /* ═══════════ Team-Kennzahlen je Person (aus RAW, nicht aus PDATA) ═══════════
     PDATA kennt nur Assignee-Werte. „Wer hat erstellt?“ braucht den Reporter (Feld 15, seit
     31.08.2026 in scripts/fetch-va-data.mjs) — deshalb rechnet diese Schicht direkt auf RAW.
     Alle Listen benutzen denselben Zeitraum wie das Cockpit (FROM/TO, Auswahl oben rechts).
     Feldbelegung: 0 key · 3 Typ (E = Epic, fliegt raus) · 4 angelegt · 5 erledigt · 7 Blocker
     · 8 Assignee · 10 Spalten-Historie · 12 Resolution · 13 Titel · 15 Reporter. */
  function RAWS(){ return (typeof RAW!=='undefined'&&RAW&&RAW.length)?RAW:[]; }
  function hatReporter(){ return RAWS().some(function(i){return i.length>15&&i[15];}); }
  function d0(s){ return new Date(String(s).slice(0,10)+'T00:00:00Z'); }
  function alterT(s,bis){ return Math.max(0,Math.round((+bis-+d0(s))/864e5)); }
  function median(a){ if(!a.length)return null; var b=a.slice().sort(function(x,y){return x-y;}); var m=b.length>>1;
    return b.length%2?b[m]:Math.round((b[m-1]+b[m])/2); }
  /* Kennzahlen je Person im gewählten Zeitraum. herrenlos = offene Tickets ohne aktive:n Verantwortliche:n. */
  function personen(){
    var R=RAWS(); if(!R.length)return null;
    var bis=(typeof TO!=='undefined'&&TO)?TO:new Date(), von=(typeof FROM!=='undefined'&&FROM)?FROM:new Date(+bis-28*864e5);
    var spalte=(typeof colAt==='function')?colAt:null;
    var fertig=(typeof isRealDone==='function')?isRealDone:function(i){return !!i[5];};
    var P={}, herren=[], g=function(n){ return P[n]||(P[n]={n:n,offen:0,wip:0,blk:0,alt:0,done:0,neu:0,lead:[],blkKeys:[]}); };
    R.forEach(function(i){
      if(i[3]==='E')return;                               /* Epics sind Container, kein Fluss */
      var wer=i[8]||'', c=spalte?spalte(i,bis):0;
      if(fertig(i)&&i[5]){
        var r=d0(i[5]);
        if(r>=von&&r<=bis&&wer){ var p=g(wer); p.done++; p.lead.push(alterT(i[4],r)); }
      }else if(c>=0&&c<=4){
        if(wer){ var q=g(wer); q.offen++; if(c>=1&&c<=4)q.wip++;
          if(i[7]){ q.blk++; q.blkKeys.push(i[0]); }
          var a=alterT(i[4],bis); if(a>q.alt)q.alt=a; }
        /* Herrenlos ist nicht dasselbe wie unzugewiesen: ein Backlog-Ticket ohne Assignee ist normal,
           ein laufendes (WIP) ohne Assignee dagegen nicht — und alles, was auf jemandem liegt, der nicht
           mehr im Team ist, sowieso. Nur diese beiden Fälle kommen in die Karte. */
        var lauft=(c>=1&&c<=4);
        if(wer?!istAktiv(wer):lauft)herren.push({key:i[0],wer:wer,titel:(i.length>13?i[13]:'')||'',alt:alterT(i[4],bis),wip:lauft,blk:!!i[7]});
      }
      var rep=(i.length>15?i[15]:'')||'';
      if(rep){ var cd=d0(i[4]); if(cd>=von&&cd<=bis)g(rep).neu++; }
    });
    Object.keys(P).forEach(function(n){ P[n].p50=median(P[n].lead); });
    herren.sort(function(a,b){return b.alt-a.alt;});
    return {p:P,liste:Object.keys(P).map(function(n){return P[n];}).filter(function(r){return istAktiv(r.n);}),herrenlos:herren};
  }

  /* Die Listen. `wert` liefert die Zahl, `zeile` den erklärenden Text rechts daneben,
     `hoch` sagt, ob groß = gut. Wer für eine Liste keine Grundlage hat, fällt raus (raus()). */
  var TB=[
    {id:'flow', ic:'🏆', t:['Flow-Rangliste','Flow leaderboard'],
     d:['wer hat gerade die besten Flow-Kennzahlen?','who has the best flow metrics right now?']},
    {id:'done', ic:'🏁', t:['Meiste Abschlüsse','Most completions'], hoch:1,
     d:['erledigte Tickets im gewählten Zeitraum','tickets finished in the selected period'],
     wert:function(r){return r.done;}, raus:function(r){return !r.done;},
     zeile:function(r){return T('Lead Time p50 ','lead time p50 ')+(r.p50!=null?r.p50+' '+T('T','d'):'—')+' · WIP '+r.wip;}},
    {id:'neu', ic:'✍️', t:['Meiste Tickets erstellt','Most tickets created'], hoch:1,
     d:['wer füllt das Board? (Reporter im gewählten Zeitraum)','who fills the board? (reporter in the selected period)'],
     wert:function(r){return r.neu;}, raus:function(r){return !r.neu;},
     zeile:function(r){return T('selbst erledigt ','finished themselves ')+r.done+' · '+T('offen ','open ')+r.offen;},
     braucht:function(){return hatReporter();},
     fehlt:['Wer welches Ticket angelegt hat, steht erst im nächsten Datenlauf zur Verfügung (Reporter-Feld, seit 31.08.2026). Danach erscheint die Liste hier von selbst.','The reporter field arrives with the next data run.']},
    {id:'blk', ic:'🚩', t:['Wenigste Blocker','Fewest blockers'], hoch:0,
     d:['geflaggte oder wartende Tickets — weniger ist besser','flagged or waiting tickets — fewer is better'],
     wert:function(r){return r.blk;}, raus:function(r){return !r.offen;}, zweit:function(r){return -r.offen;},
     zeile:function(r){return r.blk?'🚩 '+r.blkKeys.slice(0,3).join(', ')+(r.blkKeys.length>3?' +'+(r.blkKeys.length-3):''):T('kein Ticket hängt','nothing stuck')+' · '+r.offen+T(' offen',' open');}},
    {id:'alt', ic:'🧹', t:['Frischestes Board','Freshest board'], hoch:0, einheit:[' T',' d'],
     d:['Alter des ältesten offenen Tickets — Alter ist Risiko','age of the oldest open ticket — age is risk'],
     wert:function(r){return r.alt;}, raus:function(r){return !r.offen;},
     zeile:function(r){return r.offen+T(' offen · WIP ',' open · WIP ')+r.wip;}},
    {id:'p50', ic:'⏱', t:['Kürzeste Lead Time','Shortest lead time'], hoch:0, einheit:[' T',' d'],
     d:['Median vom Anlegen bis Erledigt, eigene Tickets im Zeitraum','median from created to done, own tickets in the period'],
     wert:function(r){return r.p50;}, raus:function(r){return r.p50==null||r.done<2;},
     zeile:function(r){return r.done+T(' erledigt · längstes ',' done · longest ')+Math.max.apply(null,r.lead.concat([0]))+T(' T',' d');}}
  ];
  function tbAktiv(){ return sessionStorage.getItem('vaTB')||'flow'; }
  function tbHtml(){
    var cur=tbAktiv(), def=TB.filter(function(x){return x.id===cur;})[0]||TB[0];
    var h='<div class="tbtabs">'+TB.map(function(x){
      return '<span class="tbt'+(x.id===def.id?' an':'')+'" onclick="vaApp.tboard(\''+x.id+'\')" title="'+esc(T(x.d[0],x.d[1]))+'">'+x.ic+' '+esc(T(x.t[0],x.t[1]))+'</span>';
    }).join('')+'</div>';
    h+='<div class="tbd">'+esc(T(def.d[0],def.d[1]))+'</div>';
    if(def.id==='flow')return '<div id="vaTB">'+h+boardHtml(6).replace('<div class="lb">','<div class="lb scroll">')+'</div>';
    if(def.braucht&&!def.braucht())return '<div id="vaTB">'+h+'<div class="vahint">'+T(def.fehlt[0],def.fehlt[1])+'</div></div>';
    var st=personen();
    if(!st)return '<div id="vaTB">'+h+'<div class="vahint">'+T('Noch keine Ticketdaten geladen.','No ticket data loaded yet.')+'</div></div>';
    var rows=st.liste.filter(function(r){return !def.raus(r);});
    if(!rows.length)return '<div id="vaTB">'+h+'<div class="vahint">'+T('Im gewählten Zeitraum gibt es dafür keine Werte.','No values for this in the selected period.')+'</div></div>';
    var zw=def.zweit||function(){return 0;};
    rows.sort(function(a,b){ var x=def.wert(a),y=def.wert(b); return (def.hoch?y-x:x-y)||(zw(a)-zw(b))||a.n.localeCompare(b.n); });
    /* Gleicher Wert = gleicher Platz. Ohne das bekämen fünf blockerfreie Personen Gold, Silber, Bronze
       und zwei Nieten — eine Rangfolge, die die Zahl gar nicht hergibt. */
    var platz=[], letzte=null, p=0;
    rows.forEach(function(r,i){ var v=def.wert(r); if(letzte===null||v!==letzte){p=i+1;letzte=v;} platz.push(p); });
    var me=(typeof USER!=='undefined'&&USER&&USER.name)||'', ein=def.einheit?T(def.einheit[0],def.einheit[1]):'';
    h+='<div class="lb scroll">'+rows.slice(0,8).map(function(r,i){
      var pz=platz[i], medal=pz===1?'🥇':pz===2?'🥈':pz===3?'🥉':String(pz);
      return '<div class="r'+(r.n===me?' me':'')+'"><span class="rk">'+medal+'</span>'
        +'<span class="nm">'+esc(r.n)+(r.n===me?' <span class="bd">('+T('du','you')+')</span>':'')+'<div class="bd">'+esc(def.zeile(r))+'</div></span>'
        +'<span class="sc">'+def.wert(r)+ein+'</span></div>';
    }).join('')+'</div>';
    return '<div id="vaTB">'+h+'</div>';
  }
  function tboard(id){ try{sessionStorage.setItem('vaTB',id);}catch(e){} var el=document.getElementById('vaTB'); if(el)el.outerHTML=tbHtml(); }

  /* Herrenlose Tickets: offen, aber niemand aus dem aktiven Team trägt sie. Das ist der ehrliche
     Gegenpol zum Ausblenden — die Tickets verschwinden nicht aus den Team-Zahlen, sie bekommen
     eine Adresse. Ohne das hätte „Yasmine raus“ nur bedeutet, dass ihre 7 offenen Tickets
     unsichtbar weiterzählen. */
  function herrenlosHtml(){
    var st=personen(); if(!st||!st.herrenlos.length)return '';
    var L=st.herrenlos, wip=L.filter(function(r){return r.wip;}).length;
    var nach={}; L.forEach(function(r){ var k=r.wer||T('niemand zugewiesen (läuft aber)','unassigned (but running)'); nach[k]=(nach[k]||0)+1; });
    var jb=(typeof CONFIG!=='undefined'&&CONFIG.jiraBase)?CONFIG.jiraBase:'';
    var wen=Object.keys(nach).sort(function(a,b){return nach[b]-nach[a];});
    return '<div class="att" style="margin-top:8px"><b>🧭 '+L.length+T(' herrenlose Tickets',' orphaned tickets')+'</b> · '+wip+T(' davon aktiv (WIP)',' of them active (WIP)')
      +'<div class="w" style="margin-top:2px">'+T('offen auf Personen, die nicht (mehr) im Team sind, plus laufende Tickets ohne Verantwortliche:n — sie zählen weiter in WIP, Aging und Lead Time. Neu zuweisen oder schließen.','open on people no longer on the team, plus running tickets with no assignee — they still count in WIP, aging and lead time.')+'</div>'
      +wen.slice(0,6).map(function(k){
        var seit=istWeg(k)?wegSeit(k):'';
        return '<div class="i">'+esc(k)+(seit?' <span class="w">('+T('bis ','until ')+esc(seit)+')</span>':'')+' — <b>'+nach[k]+'</b>'+T(' Tickets',' tickets')+'</div>';
      }).join('')
      +'<div class="i">'+L.slice(0,4).map(function(r){
        return (jb?'<a href="'+esc(jb)+'/browse/'+esc(r.key)+'" target="_blank" rel="noopener" style="font-weight:700">'+esc(r.key)+'</a>':'<b>'+esc(r.key)+'</b>')
          +' <span class="w">'+esc(String(r.titel).slice(0,44))+' · '+r.alt+T(' T alt',' d old')+'</span>';
      }).join('<br>')+(L.length>4?'<div class="w">+ '+(L.length-4)+T(' weitere',' more')+'</div>':'')+'</div>'
      +'<div style="margin-top:6px"><span class="subtab" style="cursor:pointer" onclick="vaApp.drill(\'wipcol\')">'+T('Im Cockpit ansehen →','Show in cockpit →')+'</span></div></div>';
  }
  /* Assignees, die in ROSTER fehlen — damit die Liste gepflegt bleibt statt still zu veralten. */
  function neuHtml(){
    var u=unbekannte(); if(!u.length)return '';
    return '<div class="att" style="margin-top:8px"><b>🆕 '+T('Neu in den Daten','New in the data')+'</b>'
      +'<div class="w">'+T('Diese Namen stehen in Jira, aber in keiner Team-Liste — bis jemand sie einträgt, bleiben sie aus den Ranglisten draußen: ','These names are in Jira but on no team list yet: ')+'<b>'+u.slice(0,6).map(esc).join(', ')+'</b>'
      +(u.length>6?' +'+(u.length-6):'')+'<br>'+T('Eintragen in site/va/va-app.js → ROSTER.','Add them in site/va/va-app.js → ROSTER.')+'</div></div>';
  }

  /* ───────── Team-Kennzahlen (aus REAL) ───────── */
  function teamKv(){
    try{
      var R=(typeof REAL!=='undefined'&&REAL)?REAL:null; if(!R)return null;
      var A=computeAssess('gesamt',R); var NF={casFR:1,casRT:1,casSplit:1,miniboard:1,wsjf:1,wsjfdist:1,pi:1};
      var g=0,y=0,r=0; Object.keys(A).forEach(function(k){if(NF[k])return;var s=A[k].s;if(s==='green')g++;else if(s==='yellow')y++;else if(s==='red')r++;});
      var sc=Math.round(100*(g+0.5*y)/((g+y+r)||1));
      var done=R.kt!=null?R.kt:(R.through||[]).reduce(function(a,b){return a+b;},0);
      var wip=R.kw!=null?R.kw:(R.wip||[]).reduce(function(a,b){return a+b;},0);
      var blk=R.kb!=null?R.kb:0;
      var p50=(R.p50!=null)?R.p50:null, p85=(R.p85!=null)?R.p85:null;
      var th=R.through||[], tp8=th.length?th.slice(-8).reduce(function(a,b){return a+b;},0):null;
      return {score:sc,done:done,wip:wip,blk:blk,p50:p50,p85:p85,tp8:tp8,red:r,yellow:y,green:g,A:A};
    }catch(e){return null;}
  }

  /* ───────── Startansicht ───────── */
  /* Ziffs Challenge in drei Schwierigkeitsstufen (21.08.2026, gleicher Fragenkatalog wie im
     Porsche-Cockpit / pb-start.js): gestellt wird die Stufe, die zum Level passt — Flow-Starter →
     Grundlagen, Flow-Mover → Fortgeschritten, ab Flow-Profi → Profi. Über „⬆ schwerer“ schaltet
     jede:r selbst hoch (sessionStorage vaChTier); die Antwort gibt XP nach Stufe: 5 · 8 · 12. */
  var CTIER=[[T('Grundlagen','Basics'),5],[T('Fortgeschritten','Advanced'),8],[T('Profi','Pro'),12]];
  var CHALL=[
   [ /* ── Stufe 1: das Board lesen ── */
    [T('Euer WIP steht bei <b>{wip}</b> und ihr schließt rund <b>{tp}</b> Tickets pro Woche ab. Was sagt Little’s Law über die zu erwartende Durchlaufzeit?','Your WIP is <b>{wip}</b> and you finish about <b>{tp}</b> tickets per week. What does Little’s Law say about expected lead time?'),
     T('≈ {ll} Wochen — WIP ÷ Durchsatz. Wer die Durchlaufzeit halbieren will, halbiert den WIP, nicht die Pausen.','≈ {ll} weeks — WIP ÷ throughput. Halve WIP, not the breaks, if you want to halve lead time.')],
    [T('Warum ist das Aging Board im Daily wichtiger als die Frage „woran arbeitest du?“','Why is the aging board more important in the daily than “what are you working on?”'),
     T('Weil Alter Risiko ist: das älteste laufende Ticket entscheidet, ob euer 85-%-Versprechen hält. Rechts nach links: fertig machen vor anfangen.','Because age is risk: the oldest running ticket decides whether your 85% promise holds. Right to left: finish before starting.')],
    [T('Ein Ticket ist geblockt und ihr wartet auf eine Rückmeldung. Zählt die Wartezeit zur Durchlaufzeit?','A ticket is blocked and you wait for a reply. Does the waiting time count towards lead time?'),
     T('Ja — der Kunde erlebt Kalenderzeit. Deshalb ist Flow Efficiency meist 15–40 %: der Hebel liegt im Warten, nicht im Arbeiten.','Yes — the customer experiences calendar time. That is why flow efficiency is usually 15–40%: the lever is in the waiting, not the working.')],
    [T('Warum begrenzt ein Kanban-Board die <b>Spalten</b> und nicht die Menschen?','Why does a kanban board limit <b>columns</b> and not people?'),
     T('Weil das Board den Fluss steuert, nicht die Auslastung. Ein Spalten-Limit erzwingt Pull: Neues kommt erst nach, wenn Platz frei wird. Ohne Limit wächst der Bestand (bei euch {wip} laufende Tickets) — und mit ihm die Durchlaufzeit.','Because the board steers flow, not utilisation. A column limit enforces pull: new work only enters when space frees up. Without a limit the inventory grows ({wip} items in progress here) — and lead time grows with it.')],
    [T('Im CFD wird ein Band von Woche zu Woche breiter. Was sagt euch das?','A band in the CFD keeps getting wider week by week. What does that tell you?'),
     T('Die Breite eines Bandes ist der Bestand in dieser Spalte, die waagerechte Strecke die ungefähre Durchlaufzeit. Breiter werdend heißt: es kommt mehr rein als raus — genau dort staut es, genau dort gehört das nächste WIP-Limit hin.','The width of a band is the inventory in that column, the horizontal distance the approximate lead time. Getting wider means more comes in than goes out — that is where the queue builds, and that is where the next WIP limit belongs.')]
   ],
   [ /* ── Stufe 2: Verteilungen, Zusagen, Forecast ── */
    [T('Euer p85 liegt deutlich über dem p50. Was bedeutet ein großer Abstand für Zusagen an Stakeholder?','Your p85 is far above the p50. What does a wide gap mean for commitments to stakeholders?'),
     T('Große Streuung = wenig Vorhersagbarkeit. Zusagen auf p85 (nicht auf den Median) und die Ausreißer im Aging Board früh angehen.','Wide spread = low predictability. Commit on p85 (not the median) and tackle the outliers early on the aging board.')],
    [T('Eure Lead Time liegt bei p50 <b>{p50}</b> und p85 <b>{p85}</b> Tagen. Wie klingt daraus eine belastbare Zusage?','Your lead time is p50 <b>{p50}</b> and p85 <b>{p85}</b> days. What does a reliable commitment sound like?'),
     T('Als Service Level Expectation mit Wahrscheinlichkeit: „85 % unserer Tickets sind in ≤ {p85} Tagen fertig.“ Kein Einzeldatum, sondern eine Verteilung — und dann täglich im Aging Board verteidigt (KMM ML3).','As a service level expectation with a probability: “85% of our items finish within {p85} days.” Not a single date but a distribution — defended daily on the aging board (KMM ML3).')],
    [T('Warum sagt ein Monte-Carlo-Forecast aus eurem Durchsatz mehr als eine Aufwandsschätzung in Story Points?','Why does a Monte Carlo forecast from your throughput say more than an effort estimate in story points?'),
     T('Weil er mit der echten Streuung der letzten Wochen rechnet statt mit Wunschzahlen: gezogen wird aus eurer Durchsatzhistorie (~{tp8} Tickets in 8 Wochen), heraus kommt eine Wahrscheinlichkeit („85 % bis …“). Bedingung: das System bleibt, wie es war — gleiche Leute, gleiche Ticketgrößen, gleiche Blocker.','Because it uses the real spread of the last weeks instead of wishful numbers: it samples your throughput history (~{tp8} items in 8 weeks) and returns a probability (“85% by …”). Condition: the system stays as it was — same people, same item sizes, same blockers.')],
    [T('Was passiert mit der Durchlaufzeit aller anderen Tickets, wenn ihr eine zweite Expedite-Spur aufmacht?','What happens to everyone else’s lead time when you open a second expedite lane?'),
     T('Sie steigt. Jede Sonderspur ist Kapazität, die anderswo fehlt — Expedite verdrängt, es beschleunigt nicht. Deshalb: höchstens eine Expedite gleichzeitig, feste Klassen (Standard · Fixed Date · Expedite) und für jede eine explizite Policy.','It goes up. Every special lane is capacity taken from somewhere else — expedite displaces, it does not accelerate. So: at most one expedite at a time, fixed classes (standard · fixed date · expedite), and an explicit policy for each.')],
    [T('Ein Ticket war <b>{p50}</b> Tage unterwegs, echte Arbeitszeit rund 2 Tage. Wie hoch ist die Flow Efficiency — und was folgt daraus?','An item took <b>{p50}</b> days, with about 2 days of actual work. What is the flow efficiency — and what follows from it?'),
     T('≈ 2 ÷ {p50} der Zeit wurde gearbeitet, der Rest war Warten; typisch sind 15–40 %. Der Hebel liegt also nicht im schneller Arbeiten, sondern im Wegräumen von Übergaben, Freigaben und Warteschlangen.','About 2 ÷ {p50} of the time was work, the rest was waiting; 15–40% is typical. So the lever is not working faster, it is removing handovers, approvals and queues.')]
   ],
   [ /* ── Stufe 3: Systemdesign, Kopplung, Portfolio ── */
    [T('Warum wird ein zu 90 % ausgelastetes Team langsamer als eines mit 70 %?','Why does a team running at 90% utilisation get slower than one at 70%?'),
     T('Warteschlangentheorie (Kingman): die Wartezeit wächst mit ρ ÷ (1 − ρ) — ab etwa 80 % Auslastung explodiert sie. Variabilität plus hohe Auslastung ergibt lange Durchlaufzeit. Etwas Luft im System ist kein Verlust, sondern der Preis für Vorhersagbarkeit.','Queueing theory (Kingman): waiting time grows with ρ ÷ (1 − ρ) — beyond roughly 80% utilisation it explodes. Variability plus high utilisation equals long lead time. Slack is not waste, it is the price of predictability.')],
    [T('Unter welchen Bedingungen gilt Little’s Law (L = λ × W) überhaupt?','Under which conditions does Little’s Law (L = λ × W) actually hold?'),
     T('Nur im stabilen System über einen längeren Zeitraum: Zufluss ≈ Abfluss, kein wachsender Rückstand, angefangene Arbeit wird auch beendet, alle Größen in denselben Einheiten. Wer bei wachsendem WIP damit rechnet, rechnet sich die Zukunft schön.','Only in a stable system over a longer period: arrivals ≈ departures, no growing backlog, started work actually finishes, all quantities in the same units. Applying it while WIP grows just flatters the forecast.')],
    [T('Ihr habt WIP-Limits und explizite Policies (KMM ML2). Was fehlt zu ML3?','You have WIP limits and explicit policies (KMM ML2). What is missing for ML3?'),
     T('Der Sprung vom eigenen Board zum zugesagten Service: Service Level Expectations definieren und messen („85 % in X Tagen“), Ältestes zuerst, Klassen von Serviceleveln, Nachfrage und Kapazität balancieren. Gesteuert wird nach Kundenerwartung, nicht nach Team-Bequemlichkeit.','The step from your own board to a promised service: define and measure service level expectations (“85% within X days”), oldest first, classes of service, balance demand against capability. Steering follows the customer’s expectation, not the team’s comfort.')],
    [T('Wo liegt der Commitment Point — und warum ist der Backlog davor kein Bestand?','Where is the commitment point — and why is the backlog before it not inventory?'),
     T('Commitment ist der Punkt, ab dem ihr verbindlich liefert. Davor sind es Optionen: sie kosten nichts, altern billig und dürfen verfallen. Danach zählt jede Stunde in eure Durchlaufzeit. Also spät committen, dann schnell fließen — genau dafür gibt es Upstream-/Discovery-Kanban.','Commitment is the point from which you deliver reliably. Before it there are only options: they cost nothing, age cheaply and may expire. After it, every hour counts towards lead time. So commit late, then flow fast — that is what upstream/discovery kanban is for.')],
    [T('Warum ist eine Abhängigkeit zu einem anderen Team teurer als die Arbeitszeit, die sie kostet?','Why is a dependency on another team more expensive than the working time it costs?'),
     T('Weil jede Übergabe eine neue Warteschlange erzeugt: warten auf das andere Team, Kontextwechsel, Re-Synchronisation. Zwei hoch ausgelastete Systeme in Reihe warten nicht doppelt, sondern deutlich länger. Deshalb zählen im Flight Level 2+3 Abhängigkeiten und Risiken — nicht Aufwände.','Because every handover creates a new queue: waiting for the other team, context switching, re-synchronisation. Two highly utilised systems in series do not wait twice as long, they wait far longer. That is why flight level 2+3 counts dependencies and risks — not effort.')],
    [T('Warum priorisiert WSJF nach Cost of Delay ÷ Job Size und nicht nach ROI?','Why does WSJF prioritise by cost of delay ÷ job size instead of ROI?'),
     T('Weil in einem Fluss-System die Zeit die knappe Ressource ist. Nutzen pro Zeit maximiert, wer kurze Jobs mit hohen Verzögerungskosten zuerst zieht (Weighted Shortest Job First). ROI ignoriert, wie lange ein Brocken den Fluss für alle anderen blockiert.','Because in a flow system time is the scarce resource. Value per unit of time is maximised by pulling short jobs with high delay cost first (weighted shortest job first). ROI ignores how long a big item blocks the flow for everyone else.')]
   ]
  ];
  /* Stufe: manuell gewählt (Session) oder aus dem Level abgeleitet (4 Level in der VA-Instanz). */
  function chTier(lv){
    var s=sessionStorage.getItem('vaChTier');
    if(s!=null&&s!=='')return Math.max(0,Math.min(CHALL.length-1,+s));
    return lv?(lv.ix<=0?0:lv.ix<=1?1:2):0;
  }
  function myLevel(){ try{ var a=auth(); return (a&&typeof pLevel==='function')?pLevel(a.name):null; }catch(e){return null;} }
  function ziffChallenge(){
    var ti=chTier(myLevel()), pool=CHALL[ti], c=pool[new Date().getDate()%pool.length], kv=teamKv();
    var wip=kv?kv.wip:'?', tp=kv?Math.max(1,Math.round(kv.done/8)):'?', ll=(kv&&tp!=='?')?(Math.round(kv.wip/tp*10)/10):'?';
    var p50=(kv&&kv.p50!=null)?kv.p50:'?', p85=(kv&&kv.p85!=null)?kv.p85:'?', tp8=(kv&&kv.tp8!=null)?kv.tp8:'?';
    var fill=function(s){ return String(s).replace(/\{wip\}/g,wip).replace(/\{tp8\}/g,tp8).replace(/\{tp\}/g,tp).replace(/\{ll\}/g,ll).replace(/\{p50\}/g,p50).replace(/\{p85\}/g,p85); };
    return {q:fill(c[0]),a:fill(c[1]),tier:ti,tn:CTIER[ti][0],xp:CTIER[ti][1],n:pool.length};
  }
  /* Die Karte wird beim Stufenwechsel neu gezeichnet — deshalb eigene Funktion mit fester id. */
  function ziffCard(){
    var a=auth(), name=a?a.name:'', ch=ziffChallenge();
    var onXp=name?'try{pAddXp(\''+esc(name).replace(/'/g,"\\'")+'\','+ch.xp+');}catch(e){}':'';
    return '<div class="ziff" id="vaZiff">'
      +'<div class="zh"><b>Ziff · '+T('Mentor-Coach','mentor coach')+'</b>'
      +'<span class="zt" title="'+T('Fragen passend zu deinem Level — Stufe frei wählbar','Questions matching your level — tier freely selectable')+'">'+ch.tn+' · '+T('Stufe','tier')+' '+(ch.tier+1)+'/'+CHALL.length+'</span>'
      +'<button class="zx" onclick="vaApp.chNext()">'+(ch.tier<CHALL.length-1?'⬆ '+T('schwerer','harder'):'↩ '+T('von vorn','back to basics'))+'</button></div>'
      +'<div class="zqq">'+ch.q+'</div><div class="zq" id="vaChA" style="display:none">'+ch.a+'</div>'
      /* VA-13496: Erwartung geradeziehen — Ziff ist ein fester Katalog, kein Sprachmodell. */
      +'<div style="font-size:11px;color:var(--sub);margin:2px 0 6px">'+T('Ziff arbeitet aus einem festen Fragenkatalog, gerechnet mit euren echten Zahlen — kein Sprachmodell, freie Fragen beantwortet er nicht.','Ziff works from a fixed question catalogue, computed with your real numbers — not a language model; it does not answer free-form questions.')+'</div>'
      +'<div class="zb"><button class="btn" onclick="var x=document.getElementById(\'vaChA\');x.style.display=\'block\';this.style.display=\'none\';'+onXp+'">'+T('Antwort prüfen','Check answer')+(name?' (+'+ch.xp+' XP)':'')+'</button>'
      +'<button class="btn sec" onclick="vaApp.startClose();if(window.pbFlow){pbFlow.open();setTimeout(function(){pbFlow.challenge&&pbFlow.challenge();},250);}">'+T('Mehr Challenges mit Ziff →','More challenges with Ziff →')+'</button></div></div>';
  }
  /* Stufe weiterschalten (Grundlagen → Fortgeschritten → Profi → Grundlagen) und Karte neu zeichnen. */
  function chNext(){
    var t=(chTier(myLevel())+1)%CHALL.length; sessionStorage.setItem('vaChTier',t);
    var el=document.getElementById('vaZiff'); if(el)el.outerHTML=ziffCard();
  }
  function startShow(){
    if(document.getElementById('vaStart'))return;
    var a=auth(); if(!a)return;
    var name=a.name, first=name.split(' ')[0];
    var lv=null; try{lv=pLevel(name);}catch(e){}
    var kv=teamKv();
    var fs=null,my=null; try{ if(FL()){fs=vaFL.summary(); my=vaFL.mine(name);} }catch(e){}
    var ov=document.createElement('div'); ov.className='vaov'; ov.id='vaStart';
    ov.addEventListener('click',function(e){if(e.target===ov)startClose();});
    /* Kacheln sind klickbar: Zahl → passendes Diagramm/Drilldown im Cockpit bzw. Abschnitt im FL2+3-Tab */
    var tile=function(lbl,val,go,title){ return '<div class="k click" title="'+esc(title||T('Klick: Details anzeigen','Click: show details'))+'" onclick="'+go+'"><div class="l">'+lbl+' <span class="go">→</span></div><div class="v">'+val+'</div></div>'; };
    var kvH=kv?'<div class="kv">'
      +tile(T('Team-Flow-Score','Team flow score'),kv.score+'/100 '+(kv.score>=70?'🟢':kv.score>=40?'🟡':'🔴'),"vaApp.jump('kpis')",T('Kern-Kennzahlen mit Ampeln öffnen','Open key values with signals'))
      +tile(T('Erledigt (Zeitraum)','Done (period)'),kv.done,"vaApp.drill('through')",T('Erledigte Tickets im Zeitraum anzeigen','Show tickets done in the period'))
      +tile('WIP',kv.wip,"vaApp.drill('wipcol')",T('Aktive Tickets (WIP) anzeigen','Show active tickets (WIP)'))
      +tile(T('Blocker','Blockers'),kv.blk,"vaApp.drill('blocked')",T('Geflaggte / wartende Tickets anzeigen','Show flagged / waiting tickets'))
      +(kv.p50!=null?tile(T('Lead Time p50','Lead time p50'),kv.p50+' '+T('T','d'),"vaApp.drill('scatter')",T('Erledigte Tickets mit Lead Time anzeigen','Show done tickets with lead time')):'')
      +(fs&&fs.care?tile(T('FL2 Pflege Ø','FL2 care Ø'),fs.avg+'/100 '+(fs.avg>=80?'🟢':fs.avg>=55?'🟡':'🔴'),"vaApp.openFL('vfl-owner')",T('FL2: Verantwortung & Pflege öffnen','FL2: open ownership & care')):'')
      +(fs?tile(T('Initiativen In Flight','Initiatives in flight'),fs.inFlight+(fs.inFlight>8?' 🔴':fs.inFlight>5?' 🟡':' 🟢'),"vaApp.openFL('vfl-themes')",T('FL2: Themen & Initiativen öffnen','FL2: open themes & initiatives')):'')
      +'</div>':'';
    var meet='<div class="meet">'
      +'<div><b>'+T('Daily (10 Min):','Daily (10 min):')+'</b> '+T('Aging Board rechts nach links, Blocker (🚩) zuerst, jede Person checkt ihre „nächsten Schritte“ in der persönlichen Übersicht.','Aging board right to left, blockers (🚩) first, everyone checks their “next steps” in the personal view.')+'</div>'
      +'<div><b>'+T('Weekly Flow Review (Mo, 30 Min):','Weekly flow review (Mon, 30 min):')+'</b> '+T('Kern-Kennzahlen + Ampeln, CFD, Durchsatz, Lead-Time-Scatter, beide Ranglisten — eine Verbesserung für die Woche festlegen. FL2-Pflege-Hinweise abarbeiten (5 Min).','Key values + signals, CFD, throughput, lead-time scatter, both leaderboards — agree on one improvement for the week; clear FL2 care hints (5 min).')+'</div>'
      +'<div><b>'+T('Retro (2-wöchentlich):','Retro (bi-weekly):')+'</b> '+T('Flow Efficiency, Lead-Time-Histogramm, Monte-Carlo-Forecast, Ziffs Challenge als Einstieg.','Flow efficiency, lead-time histogram, Monte-Carlo forecast, Ziff’s challenge as opener.')+'</div>'
      +'<div><b>'+T('Strategie / FL2+3 (monatlich):','Strategy / FL2+3 (monthly):')+'</b> '+T('Tab „Flight Level 2+3“ — Coach-Einschätzung, Initiativen In Flight, Entwicklung je Quartal, Verantwortung & Pflege, Risiken, Key Results.','Tab “Flight level 2+3” — coach assessment, initiatives in flight, quarterly trend, ownership & care, risks, key results.')+'</div>'
      +'</div>';
    /* FL2+FL3: persönliche Verantwortung + Aufmerksamkeitsliste (kommt aus va-fl.js) */
    var flMine='';
    if(fs&&fs.care){
      if(my&&(my.inits.length||my.krs.length||my.risks.length)){
        flMine='<div class="att'+(my.attention.length?'':' ok')+'"><b>🛫 '+T('Deine FL2-Verantwortung','Your FL2 ownership')+'</b> · '+my.inits.length+T(' Initiativen',' initiatives')+' · '+my.krs.length+' Key Results'+(my.rank?' · 🏆 '+T('Platz ','rank ')+my.rank+'/'+my.of:'')
          +(my.attention.length?'<div style="margin-top:4px;font-weight:700">🔔 '+T('Das braucht jetzt deine Pflege:','This needs your care now:')+'</div>'+my.attention.slice(0,3).map(function(r){return '<div class="i"><a href="https://'+esc((CONFIG.jiraBase||'').replace(/^https?:\/\//,''))+'/browse/'+esc(r.key)+'" target="_blank" rel="noopener" style="font-weight:700">'+esc(r.key)+'</a> '+esc(r.title)+'<div class="w">'+r.hints.map(function(h){return (h.sev==='red'?'🔴 ':'🟡 ')+esc(h.txt);}).join(' · ')+'</div></div>';}).join('')+(my.attention.length>3?'<div class="w">+ '+(my.attention.length-3)+T(' weitere im Tab „Flight Level 2+3“',' more in the tab')+'</div>':'')
            :'<div style="margin-top:4px">✨ '+T('Alles gepflegt — kein offener Hinweis. Weiter so.','All maintained — no open hint.')+'</div>')
          +'<div style="margin-top:6px"><span class="subtab" style="cursor:pointer" onclick="vaApp.openFL(\'vfl-owner\')">🛫 '+T('Verantwortung & Pflege öffnen','Open ownership & care')+'</span></div></div>';
      } else {
        flMine='<div class="att"><b>🛫 '+T('FL2-Verantwortung','FL2 ownership')+'</b> · '+T('Dir ist noch keine Initiative zugeordnet.','No initiative is assigned to you yet.')+(fs.unowned?' <b>'+fs.unowned+'</b>'+T(' Initiativen suchen eine:n Verantwortliche:n — wer übernimmt, steigt in der FL2+FL3-Rangliste ein.',' initiatives are looking for an owner — take one and enter the FL2+FL3 leaderboard.'):'')
          +'<div style="margin-top:6px"><span class="subtab" style="cursor:pointer" onclick="vaApp.openFL(\'vfl-owner\')">🛫 '+T('Verantwortung & Pflege öffnen','Open ownership & care')+'</span></div></div>';
      }
    } else if(fs){
      flMine='<div class="att"><b>🛫 FL2+FL3</b> · '+T('Pflege-Daten (Owner, Aktualität, Historie) kommen mit dem nächsten stündlichen Datenlauf — dann erscheint hier deine Verantwortung und die FL2+FL3-Rangliste.','Care data arrives with the next hourly data run.')+'</div>';
    }
    ov.innerHTML='<div class="vabox vastart">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><h2>👋 '+T('Willkommen, ','Welcome, ')+esc(first)+'</h2>'
      +'<div class="sub">'+T('Vishnu Artists · Flow Cockpit (Board VA) — Startansicht. Alle im Team sind Coaches: alle Diagramme sind offen.','Vishnu Artists · Flow Cockpit (board VA) — starter view. Everyone on the team is a coach: all charts are open.')+'</div></div>'
      +'<span class="subtab" onclick="vaApp.startClose()" style="cursor:pointer">✕ '+T('Schließen','Close')+'</span></div>'
      +standHtml()
      +(lv?'<div class="lvl"><span class="ch">'+lv.chr+'</span><div style="flex:1"><b>Level '+(lv.ix+1)+' — '+esc(de()?lv.de:lv.en)+'</b> · '+lv.xp+' XP'+(lv.next!=null?T(' · noch '+(lv.next-lv.xp)+' XP bis Level '+(lv.ix+2),' · '+(lv.next-lv.xp)+' XP to level '+(lv.ix+2)):'')
        +'<div class="bar"><i style="width:'+lv.pct+'%"></i></div><div style="font-size:11px;color:var(--sub);margin-top:4px">'+T('XP: erledigte Tickets, abgehakte Schritte, Kanban-Trainer und Ziffs Challenges. Punkte und Level werden nur in diesem Browser gespeichert.','XP: finished tickets, completed steps, Kanban trainer and Ziff’s challenges. Points and level are stored in this browser only.')+'</div></div></div>':'')
      +kvH
      +'<div class="cols"><div>'
      +'<div class="sec-t">🏆 '+T('Team-Ranglisten','Team leaderboards')+' <span style="font-weight:400;font-size:11px;color:var(--sub)">· FL1 · '+T('gleiche Formel für alle','same formula for everyone')+'</span></div>'
      +tbHtml()
      +'</div><div>'
      +'<div class="sec-t">🛫 '+T('FL2+FL3-Rangliste','FL2+FL3 leaderboard')+' <span style="font-weight:400;font-size:11px;color:var(--sub)">· '+T('wer pflegt Initiativen & Key Results am besten?','who maintains initiatives & key results best?')+'</span></div>'
      +(FL()?vaFL.boardHtml(name,5).replace('<div class="vfl-lb">','<div class="vfl-lb lb scroll">'):'<div class="explain">'+T('FL2-Schicht lädt …','FL2 layer loading …')+'</div>')
      +'<div class="explain keep" style="margin-top:4px">'+T('Zwei Ebenen, ein Team: Flow (FL1) zeigt, wie gut die Arbeit fließt — Pflege (FL2+3), wer Strategie und Initiativen lebendig hält.','Two levels, one team: flow (FL1) shows how well work flows — care (FL2+3) who keeps strategy and initiatives alive.')+'</div>'
      +herrenlosHtml()
      +neuHtml()
      +'</div><div>'
      +flMine
      +'<div class="sec-t">🧠 '+T('Ziff fordert dich heraus','Ziff challenges you')+'</div>'
      +ziffCard()
      +'<details class="fold"><summary>📅 '+T('So nutzt ihr das Cockpit','How to use the cockpit')+'</summary>'+meet+'</details>'
      +'</div></div>'
      +'<div class="acts">'
      +'<button class="btn" onclick="vaApp.startClose();try{personEnter();}catch(e){}">'+T('👤 Meine Übersicht öffnen','👤 Open my view')+'</button>'
      +'<button class="btn sec" onclick="vaApp.startClose()">'+T('📊 Team-Cockpit','📊 Team cockpit')+'</button>'
      +'<button class="btn sec" onclick="vaApp.openFL()">'+T('🛫 Flight Level 2+3','🛫 Flight level 2+3')+'</button>'
      +compassBtn('btn sec')
      +'<span style="flex:1"></span>'
      +'<button class="btn sec" onclick="vaApp.logout()">'+T('Abmelden','Sign out')+'</button>'
      +'</div>'
      +'<div data-vasuite></div>'
      +'</div>';
    document.body.appendChild(ov);
    cpMalen();
    demoDiagnose();
    sessionStorage.setItem('vaStartSeen','1');
  }
  function startClose(){var o=document.getElementById('vaStart');if(o)o.remove();}
  /* Klickbare Zahlen der Startansicht: Drilldown (Ticketliste) bzw. Sprung zu einem Cockpit-Bereich */
  function toFlow(){ var pv=document.getElementById('progview'); if(pv&&pv.style.display!=='none'){ var t=document.querySelector('.tab[data-view=gesamt]')||document.querySelector('.tab'); if(t)t.click(); } }
  function drill(id){ startClose(); toFlow(); setTimeout(function(){ try{ if(typeof drillShow==='function')drillShow(id); }catch(e){} },80); }
  function jump(id){ startClose(); toFlow(); setTimeout(function(){ var e=document.getElementById(id); if(!e)return; e.scrollIntoView({behavior:'smooth',block:'start'}); e.style.transition='outline .3s'; e.style.outline='2px solid var(--brand,#89c527)'; e.style.outlineOffset='6px'; setTimeout(function(){e.style.outline='';},1800); },120); }
  /* Tab „Flight Level 2+3“ öffnen, optional zu einem Abschnitt springen (vfl-owner, vfl-coach, …) */
  function openFL(anchor){
    startClose();
    var t=document.querySelector('.tab[data-view=programm]'); if(t)t.click();
    if(anchor)setTimeout(function(){ if(window.vaFL)vaFL.go(anchor); },120);
  }
  /* Einstiegspunkte (Flow Compass, Deep-Links, postMessage): eine Kennung → eine Stelle im Cockpit */
  function go(id){
    id=String(id||'').toLowerCase();
    if(!auth()){ loginShow(); return false; }
    try{
      if(id==='start'){ startShow(); }
      else if(id==='me'){ startClose(); toFlow(); setTimeout(function(){ if(typeof personMode!=='undefined'&&personMode)return; if(typeof personEnter==='function')personEnter(); },80); }
      else if(id==='team'){ startClose(); toFlow(); setTimeout(function(){ if(typeof personMode!=='undefined'&&personMode&&typeof personEnter==='function')personEnter(); },40); jump('kpis'); }
      else if(id==='aging'){ jump('aging'); }
      else if(id==='fl2'){ openFL('vfl-owner'); }
      else if(id==='ziff'){ startClose(); if(window.pbFlow){ pbFlow.open(); setTimeout(function(){ pbFlow.challenge&&pbFlow.challenge(); },250); } }
      else return false;
    }catch(e){ return false; }
    return true;
  }
  function compassBtn(cls){
    var u=compassUrl(); if(!u||window.parent!==window)return ''; /* eingebettet im Compass: kein Rücksprung nötig */
    return '<a class="'+(cls||'subtab')+'" href="'+esc(u)+'" onclick="vaApp.compass.oeffnen();return false" title="'+T('Dein persönlicher Flow Compass — öffnet sich direkt im Cockpit','Your personal Flow Compass — opens right inside the cockpit')+'">🧭 Flow Compass</a>';
  }

  /* ═════════ Flow-Suite: Team-Cockpit ⇄ persönlicher Flow Compass ═════════
     Zwei Produkte, eine Leiste. Das Cockpit ist das Team-Werkzeug (FL1–3), der
     Compass die persönliche Ebene (FL1, Personal Kanban). Diese Schicht macht sie
     im Cockpit sichtbar und führt Menschen ohne eigenen Compass durch:
       1. Anfrage geht als Jira-Vorgang an Benedikt (compass-start.php, Label
          compass-setup) — sie taucht dort in seinem eigenen Compass-Board auf,
       2. sofort danach läuft die interessierte Person in den Einrichtungs-
          Assistenten der Demo (?demo=0 schaltet die Demo-Fahne ab, damit der
          Assistent anläuft) und konfiguriert ihr Board selbst,
       3. die fertige Konfiguration wird an Benedikt übergeben (zweiter Vorgang
          mit allen Angaben, aus denen `build-compass-produkt.ps1 -Instanz` baut),
       4. Benedikt gibt frei und trägt die Instanz in compass-register.json ein —
          erst dann zeigt die Leiste die Absprungpunkte in den echten Compass.
     Cockpit und Compass liegen auf derselben Herkunft (vishnu-artists.de), darum
     kann das Cockpit den Stand des Assistenten (localStorage compassInstanz)
     direkt lesen. Lokal auf zwei Ports geht das nicht — dann bleibt es bei
     „angefragt“, was ehrlich ist. */
  var CP={
    demo:'https://demo.vishnuartists.com/',
    verkauf:'https://vishnuartists.com/flow-compass.html',
    anfrage:'https://naturnah-lernen.de/f/compass-start.php',
    register:'compass-register.json',
    KEY:'vaCompassState'
  };
  /* Absprungpunkte: eine Kennung → eine Stelle im Compass (dort compassGo()) */
  var CP_ENTRIES=[
    ['🪷',T('Heute im Blick','Today at a glance'),T('Fokus und Zahlen des Tages','Focus and today’s numbers'),'heute'],
    ['⚡',T('Nächste Schritte','Next steps'),T('Jetzt wichtig · Termine · Woche','Important now · dates · week'),'schritte'],
    ['🧭',T('Mein Board','My board'),T('Personal Kanban · WIP-Limit','Personal kanban · WIP limit'),'board'],
    ['🎫',T('Arbeit & Tickets','Work & tickets'),T('Deine Vorgänge aus Jira','Your Jira issues'),'arbeit'],
    ['🎮',T('Rhythmus','Rhythm'),T('Morgencheck, Abendcheck, Level','Morning check, evening check, level'),'rhythmus'],
    ['📊',T('Kennzahlen','Key values'),T('Zahlen der Woche','Numbers of the week'),'kennzahlen']
  ];

  function cpState(){ try{ return JSON.parse(localStorage.getItem(CP.KEY)||'null')||{}; }catch(e){ return {}; } }
  function cpSave(o){ var s=cpState(); Object.keys(o||{}).forEach(function(k){s[k]=o[k];}); try{localStorage.setItem(CP.KEY,JSON.stringify(s));}catch(e){} return s; }
  /* Kennung im Register: gesalzener SHA-256 des Namens — im Register steht kein Klarname */
  function cpKey(name){ return hash('compass::'+nn(name)); }

  var CP_REG=null,CP_REG_LOAD=null;
  function cpRegister(){
    if(CP_REG)return Promise.resolve(CP_REG);
    if(CP_REG_LOAD)return CP_REG_LOAD;
    CP_REG_LOAD=fetch(CP.register,{cache:'no-store'}).then(function(r){return r.ok?r.json():null;})
      .catch(function(){return null;})
      .then(function(j){ CP_REG=(j&&j.instanzen)||{}; return CP_REG; });
    return CP_REG_LOAD;
  }
  /* Der Einrichtungs-Assistent des Compass schreibt nach localStorage (gleiche Herkunft) */
  function cpKonfig(){
    try{
      if(localStorage.getItem('compassSetupFertig')!=='1')return null;
      var c=JSON.parse(localStorage.getItem('compassInstanz')||'null');
      return (c&&c.kontexte&&c.kontexte.length)?c:null;
    }catch(e){ return null; }
  }
  /* Stand für die angemeldete Person: aktiv | warten | konfiguriert | angefragt | neu */
  var CP_STAND={stand:'neu'};
  function cpErmitteln(){
    var a=auth(); if(!a)return Promise.resolve({stand:'neu'});
    var s=cpState(),gemerkt=compassUrl();
    return cpRegister().then(function(reg){
      return cpKey(a.name).then(function(k){
        var e=reg[k]||null;
        if(e&&e.url){ try{localStorage.setItem(COMPASS_KEY,e.url);}catch(x){} return {stand:'aktiv',url:e.url,seit:e.seit||''}; }
        if(gemerkt)return {stand:'aktiv',url:gemerkt,seit:''};
        var cfg=cpKonfig();
        if(cfg&&s.uebergeben)return {stand:'warten',key:s.key2||s.key||'',cfg:cfg};
        if(cfg)return {stand:'konfiguriert',key:s.key||'',cfg:cfg};
        if(s.stand==='angefragt')return {stand:'angefragt',key:s.key||''};
        return {stand:'neu'};
      });
    }).catch(function(){ return {stand:'neu'}; });
  }

  /* ───────── Produktleiste ───────── */
  function suiteHtml(st){
    var h='<span class="pl">🪷 '+T('Vishnu Flow','Vishnu Flow')+'</span>'
      +'<span class="prod here">📊 '+T('Flow Cockpit','Flow cockpit')+' <i style="font-weight:400;font-size:11px;opacity:.85">· '+T('du bist hier','you are here')+'</i></span>';
    /* Ausgegraut (Stand nicht „aktiv“): dieselben Absprungpunkte, aber grau — jeder Klick
       öffnet die eingebettete Vorschau mit dem Weg zur eigenen Instanz. */
    var grau='<span class="prod aus" onclick="vaApp.compass.oeffnen()" title="'+T('Noch nicht freigeschaltet — Klick zeigt die Vorschau','Not unlocked yet — click for a preview')+'">🧭 '+T('Flow Compass','Flow Compass')+'</span>'
      +CP_ENTRIES.map(function(e){
        return '<span class="ep aus" onclick="vaApp.compass.oeffnen(\''+e[3]+'\')" title="'+esc(e[2])+' — '+T('noch nicht freigeschaltet','not unlocked yet')+'">'+e[0]+' '+esc(e[1])+'</span>';
      }).join('');
    if(st.stand==='aktiv'){
      var u=st.url.replace(/\/?$/,'/');
      h+='<a class="prod" href="'+esc(u)+'" onclick="vaApp.compass.oeffnen();return false" title="'+T('Dein persönlicher Flow Compass — öffnet sich direkt im Cockpit','Your personal Flow Compass — opens right inside the cockpit')+'">🧭 '+T('Flow Compass','Flow Compass')+'</a>';
      h+=CP_ENTRIES.map(function(e){
        return '<a class="ep" href="'+esc(u)+'?go='+esc(e[3])+'" onclick="vaApp.compass.oeffnen(\''+e[3]+'\');return false" title="'+esc(e[2])+'">'+e[0]+' '+esc(e[1])+'</a>';
      }).join('');
    } else if(st.stand==='warten'){
      h+=grau
        +'<span class="st">'+T('Konfiguration übergeben — Benedikt gibt frei','Configuration handed over — Benedikt releases it')
        +(st.key?' · <b>'+esc(st.key)+'</b>':'')+'</span>'
        +'<button class="cta sec" onclick="vaApp.compass.einrichten()">🎛️ '+T('Board noch ändern','Adjust board')+'</button>';
    } else if(st.stand==='konfiguriert'){
      h+=grau
        +'<span class="st">'+T('Dein Board steht.','Your board is set.')+'</span>'
        +'<button class="cta" onclick="vaApp.compass.uebergeben()">📤 '+T('Zur Freigabe an Benedikt','Send to Benedikt for release')+'</button>'
        +'<button class="cta sec" onclick="vaApp.compass.einrichten()">🎛️ '+T('Board ändern','Adjust board')+'</button>';
    } else if(st.stand==='angefragt'){
      h+=grau
        +'<span class="st">'+T('Anfrage ist raus','Request sent')+(st.key?' · <b>'+esc(st.key)+'</b>':'')+'.</span>'
        +'<button class="cta" onclick="vaApp.compass.einrichten()">🎛️ '+T('Board jetzt einrichten','Configure your board now')+'</button>';
    } else {
      h+=grau
        +'<span class="st">'+T('Deine persönliche Ebene: ein Board für <b>deine</b> Arbeit — nicht die des Teams.','Your personal level: a board for <b>your</b> work — not the team’s.')+'</span>'
        +'<button class="cta" onclick="vaApp.compass.anfragen()">🧭 '+T('Eigenen Compass einrichten','Set up my own Compass')+'</button>';
    }
    return h;
  }
  function cpMalen(){
    var els=document.querySelectorAll('[data-vasuite]');
    if(!els.length)return;
    /* Eingebettet im Compass: die Leiste zeigte dort auf die Seite, auf der man schon steht */
    try{ if(window.parent!==window){ for(var j=0;j<els.length;j++)els[j].innerHTML=''; return; } }catch(e){}
    for(var i=0;i<els.length;i++){ els[i].className='vasuite'; els[i].innerHTML=suiteHtml(CP_STAND); }
  }
  function cpAuffrischen(){ return cpErmitteln().then(function(st){ CP_STAND=st; cpMalen(); return st; }); }

  /* ───────── Compass im Cockpit (27.08.2026) ─────────
     Der persönliche Compass läuft als Vollbild-Ebene IM Cockpit (iframe; live liegen beide auf
     einer Herkunft, die gemeinsame Anmeldung gilt drüben also mit). Die Absprungpunkte wechseln
     die Stelle über ?go=… — das versteht jede Instanz und die Demo (compassGo in dashboard.html).
     Ohne freigegebene Instanz erscheint dieselbe Ebene AUSGEGRAUT: die Demo als stummes
     Schaufenster hinter Grau, davor der Weg zur eigenen Instanz (gleiche Stände wie die Leiste). */
  function cpEmbedUrl(base,go){
    var u=String(base||'').replace(/\/?$/,'/');
    return go?u+'?go='+encodeURIComponent(go):u;
  }
  function cpTeaserHtml(st){
    var kopf='<h2>🧭 '+T('Dein Flow Compass — noch nicht freigeschaltet','Your Flow Compass — not unlocked yet')+'</h2>'
      +'<div class="sub">'+T('Hinter dem Grau läuft die Demo: so sieht deine persönliche Ebene aus — <b>dein</b> Board, dein Morgencheck, deine Kennzahlen. Freigeschaltet wird sie als eigene Instanz.','Behind the grey runs the demo: this is what your personal level looks like — <b>your</b> board, your morning check, your numbers. It gets unlocked as your own instance.')+'</div>';
    var mitte='';
    if(st.stand==='warten'){
      mitte='<div class="steps">'+T('Deine Konfiguration ist übergeben','Your configuration is handed over')+(st.key?' · <b>'+esc(st.key)+'</b>':'')+' — '+T('Benedikt baut die Instanz und gibt sie frei. Danach steht hier dein echter Compass.','Benedikt builds and releases the instance. Then your real Compass lives here.')+'</div>'
        +'<button class="btn sec" onclick="vaApp.compass.schliessen();vaApp.compass.einrichten()">🎛️ '+T('Board noch ändern','Adjust board')+'</button>';
    } else if(st.stand==='konfiguriert'){
      mitte='<div class="steps">'+T('Dein Board steht — fehlt nur die Freigabe.','Your board is set — only the release is missing.')+'</div>'
        +'<button class="btn" onclick="vaApp.compass.schliessen();vaApp.compass.uebergeben()">📤 '+T('Zur Freigabe an Benedikt','Send to Benedikt for release')+'</button> '
        +'<button class="btn sec" onclick="vaApp.compass.schliessen();vaApp.compass.einrichten()">🎛️ '+T('Board ändern','Adjust board')+'</button>';
    } else if(st.stand==='angefragt'){
      mitte='<div class="steps">'+T('Deine Anfrage ist raus','Your request is on its way')+(st.key?' · <b>'+esc(st.key)+'</b>':'')+' — '+T('als Nächstes richtest du dein Board selbst ein (etwa fünf Minuten).','next you configure your board yourself (about five minutes).')+'</div>'
        +'<button class="btn" onclick="vaApp.compass.schliessen();vaApp.compass.einrichten()">🎛️ '+T('Board jetzt einrichten','Configure your board now')+'</button>';
    } else {
      mitte='<div class="steps"><b>1.</b> '+T('Anfrage an Benedikt (ein Klick).','Request to Benedikt (one click).')
        +'<br><b>2.</b> '+T('Du richtest dein Board selbst ein — Kontexte, Stichwörter, WIP-Limit.','You configure your board yourself — contexts, keywords, WIP limit.')
        +'<br><b>3.</b> '+T('Benedikt gibt frei — und hier läuft dein echter Compass.','Benedikt releases it — and your real Compass runs here.')+'</div>'
        +'<button class="btn" onclick="vaApp.compass.schliessen();vaApp.compass.anfragen()">🧭 '+T('Eigenen Compass einrichten','Set up my own Compass')+'</button> '
        +'<a class="btn sec" style="text-decoration:none" href="'+esc(CP.demo)+'" target="_blank" rel="noopener">▶ '+T('Demo bedienbar öffnen','Open the interactive demo')+'</a>';
    }
    return kopf+mitte;
  }
  function cpEmbedShow(go){
    var st=CP_STAND||{stand:'neu'};
    var alt=document.getElementById('vaCompassEmbed'); if(alt)alt.remove();
    var aktiv=(st.stand==='aktiv'&&st.url);
    var ov=document.createElement('div'); ov.className='vacp'+(aktiv?'':' grau'); ov.id='vaCompassEmbed';
    var chips=aktiv?CP_ENTRIES.map(function(e){
      return '<span class="ep'+(go===e[3]?' an':'')+'" data-go="'+esc(e[3])+'" title="'+esc(e[2])+'">'+e[0]+' '+esc(e[1])+'</span>';
    }).join(''):'';
    ov.innerHTML='<div class="cph"><b>🧭 '+T('Mein Flow Compass','My Flow Compass')+'</b>'+chips
      +'<span style="flex:1"></span>'
      +(aktiv?'<a class="ep" id="vaCpTab" href="'+esc(cpEmbedUrl(st.url,go))+'" target="_blank" rel="noopener">↗ '+T('Eigener Tab','Own tab')+'</a>':'')
      +'<span class="ep" id="vaCpZu">✕ '+T('Zurück ins Cockpit','Back to the cockpit')+'</span></div>'
      +'<div class="cpf"><iframe id="vaCpFrame" src="'+esc(cpEmbedUrl(aktiv?st.url:CP.demo,go))+'" title="Flow Compass"></iframe>'
      +(aktiv?'':'<div class="cpt"><div class="vabox">'+cpTeaserHtml(st)+'</div></div>')
      +'</div>';
    document.body.appendChild(ov);
    document.getElementById('vaCpZu').onclick=cpEmbedClose;
    if(aktiv){
      Array.prototype.forEach.call(ov.querySelectorAll('.cph .ep[data-go]'),function(ch){
        ch.onclick=function(){
          Array.prototype.forEach.call(ov.querySelectorAll('.cph .ep[data-go]'),function(x){x.className='ep';});
          ch.className='ep an';
          var u=cpEmbedUrl(st.url,ch.getAttribute('data-go'));
          document.getElementById('vaCpFrame').src=u;
          var tb=document.getElementById('vaCpTab'); if(tb)tb.href=u;
        };
      });
    }
  }
  function cpEmbedClose(){ var o=document.getElementById('vaCompassEmbed'); if(o)o.remove(); }

  /* ───────── Anfrage + Einrichtung ───────── */
  function cpAnfrageDialog(){
    if(document.getElementById('vaCompass'))return;
    var a=auth(); if(!a){ loginShow(); return; }
    var ov=document.createElement('div'); ov.className='vaov'; ov.id='vaCompass';
    ov.addEventListener('click',function(e){ if(e.target===ov)ov.remove(); });
    ov.innerHTML='<div class="vabox">'
      +'<h2>🧭 '+T('Dein persönlicher Flow Compass','Your personal Flow Compass')+'</h2>'
      +'<div class="sub">'+T('Das Cockpit zeigt den Fluss des <b>Teams</b>. Der Compass ist die Ebene darunter: <b>deine</b> Arbeit aus Jira, Trello und Kopf an einem Ort — sichtbar gemacht und begrenzt (Personal Kanban).','The cockpit shows the <b>team’s</b> flow. The Compass is the level below: <b>your</b> work from Jira, Trello and your head in one place — made visible and limited (personal kanban).')+'</div>'
      +'<div class="steps"><b>1.</b> '+T('Deine Anfrage geht an Benedikt.','Your request goes to Benedikt.')
      +'<br><b>2.</b> '+T('Du richtest dein Board gleich selbst ein — Kontexte, Stichwörter, WIP-Limit (etwa fünf Minuten).','You configure your board right away — contexts, keywords, WIP limit (about five minutes).')
      +'<br><b>3.</b> '+T('Benedikt gibt die Nutzung frei und schaltet deine Instanz scharf.','Benedikt releases it and switches your instance live.')+'</div>'
      +'<label>'+T('Dein Name','Your name')+'<input id="cpName" value="'+esc(a.name)+'" readonly></label>'
      +'<label>'+T('E-Mail für die Rückmeldung','Email for the reply')+'<input id="cpMail" type="email" autocomplete="email" placeholder="du@vishnuartists.com"></label>'
      +'<label>'+T('Deine Rolle <i>(freiwillig)</i>','Your role <i>(optional)</i>')+'<input id="cpRolle" placeholder="'+T('z. B. Agile Coach, 3 Kunden parallel','e.g. agile coach, 3 clients in parallel')+'"></label>'
      +'<label>'+T('Was nervt dich gerade am meisten? <i>(freiwillig, aber das Wichtigste)</i>','What annoys you most right now? <i>(optional, but the key question)</i>')+'<textarea id="cpSchmerz" placeholder="'+T('z. B. „Ich verliere den Überblick zwischen drei Kunden und vergesse Zusagen.“','e.g. “I lose track between three clients and forget commitments.”')+'"></textarea></label>'
      +'<input id="cpHp" style="position:absolute;left:-9999px" tabindex="-1" autocomplete="off" aria-hidden="true">'
      +'<div class="err" id="cpErr"></div>'
      +'<button class="btn" id="cpGo">'+T('Anfrage senden & Board einrichten →','Send request & configure board →')+'</button> '
      +'<button class="btn sec" id="cpCancel">'+T('Abbrechen','Cancel')+'</button>'
      +'<div class="hint">'+T('Zugangsdaten werden hier nie abgefragt. Trello- und Jira-Token besprecht ihr direkt — sie gehören auf den Server, nie in den Browser.','Credentials are never asked for here. Trello and Jira tokens are discussed directly — they belong on the server, never in the browser.')+'</div>'
      +'</div>';
    document.body.appendChild(ov);
    document.getElementById('cpCancel').onclick=function(){ov.remove();};
    document.getElementById('cpGo').onclick=function(){
      var mail=document.getElementById('cpMail').value.trim(), err=document.getElementById('cpErr');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){ err.textContent=T('Bitte eine gültige E-Mail angeben — sonst kann Benedikt nicht antworten.','Please give a valid email — otherwise Benedikt cannot reply.'); return; }
      var btn=this; btn.disabled=true; btn.textContent=T('Wird gesendet …','Sending …');
      cpSenden({
        mail:mail, rolle:document.getElementById('cpRolle').value.trim(),
        schmerz:document.getElementById('cpSchmerz').value.trim(), hp:document.getElementById('cpHp').value
      },false).then(function(r){
        cpSave({stand:'angefragt',key:(r&&r.key)||'',ts:Date.now()});
        ov.remove(); cpAuffrischen();
        cpEinrichten();   /* direkt weiter in den Einrichtungs-Assistenten */
      }).catch(function(){
        btn.disabled=false; btn.textContent=T('Anfrage senden & Board einrichten →','Send request & configure board →');
        err.innerHTML=T('Gerade keine Verbindung — <a href="mailto:contract@vishnuartists.com?subject=Flow%20Compass%20einrichten" style="color:var(--brand-dark,#5c9220)">per Mail anfragen</a>. Dein Board kannst du trotzdem schon einrichten.','No connection right now — <a href="mailto:contract@vishnuartists.com?subject=Flow%20Compass" style="color:var(--brand-dark,#5c9220)">ask by mail</a>. You can still configure your board.');
      });
    };
    setTimeout(function(){try{document.getElementById('cpMail').focus();}catch(e){}},60);
  }

  /* Anfrage bzw. fertige Konfiguration an compass-start.php (Jira-Vorgang, Label compass-setup) */
  function cpSenden(f,mitKonfig){
    var a=auth()||{name:''}, cfg=mitKonfig?cpKonfig():null, s=cpState();
    var jiraBase=''; try{ jiraBase=(typeof CONFIG!=='undefined'&&CONFIG&&CONFIG.jiraBase)||''; }catch(e){}
    var kontexte=(cfg&&cfg.kontexte||[]).slice(0,4).map(function(k,i){
      return {name:k.name||('Kontext '+(i+1)),icon:k.icon||'•',worte:(k.worte||[]).slice(0,20)};
    });
    var kopf=mitKonfig
      ? 'Konfiguration aus dem Einrichtungs-Assistenten — bereit zum Bauen der Instanz.'
      : 'Anfrage aus dem Flow Cockpit (Team-Board VA). Die Person richtet ihr Board direkt selbst ein; die Konfiguration kommt als zweite Meldung nach.';
    var schmerz=[kopf, s.key&&mitKonfig?('Gehört zur Anfrage '+s.key+'.'):'', f.schmerz||''].filter(Boolean).join('\n\n');
    var body={
      name:a.name, anrede:String(a.name||'').split(' ')[0], mail:f.mail||'',
      firma:'Vishnu Artists · aus dem Flow Cockpit',
      rolle:f.rolle||'', kontexte:kontexte,
      trelloPrivat:(cfg&&cfg.trello&&cfg.trello.privat&&cfg.trello.privat.url)||'',
      trelloArbeit:(cfg&&cfg.trello&&cfg.trello.arbeit&&cfg.trello.arbeit.url)||'',
      jiraBase:(cfg&&cfg.jira&&cfg.jira.browse)||jiraBase,
      jiraKeys:((cfg&&cfg.jira&&cfg.jira.keys)||[]).join(', '),
      tools:'Flow Cockpit (Board VA) — Team-Cockpit ist vorhanden',
      wip:(cfg&&cfg.board&&cfg.board.wip)||3,
      team:'ja', schmerz:schmerz, zeit:'', sid:'', lang:de()?'de':'en', website:f.hp||''
    };
    return fetch(CP.anfrage,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); })
      .then(function(j){ if(!j||!j.ok)throw new Error('abgelehnt'); return j; });
  }

  /* In den Einrichtungs-Assistenten des Compass. ?demo=0 nimmt der Demo die Demo-Fahne,
     dadurch läuft der Assistent beim ersten Start automatisch an. Neuer Tab, damit das
     Cockpit stehen bleibt — beim Zurückwechseln erkennt es die fertige Konfiguration. */
  function cpEinrichten(){
    var w=window.open(CP.demo+'?demo=0','vaCompassSetup');
    if(!w)location.href=CP.demo+'?demo=0';
  }
  function cpUebergeben(){
    var cfg=cpKonfig();
    if(!cfg){ cpEinrichten(); return; }
    var mail=''; try{ mail=cfg.mail||''; }catch(e){}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){
      mail=prompt(T('E-Mail für die Rückmeldung:','Email for the reply:'),'')||'';
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail))return;
    }
    cpSenden({mail:mail,rolle:'',schmerz:'',hp:''},true).then(function(r){
      /* key = die erste Anfrage, key2 = die Übergabe der Konfiguration — beide bleiben nachvollziehbar */
      cpSave({uebergeben:true,key2:(r&&r.key)||'',ts2:Date.now()});
      cpAuffrischen();
      alert(T('Übergeben. Benedikt baut deine Instanz und gibt sie frei'+((r&&r.key)?' — Vorgang '+r.key:'')+'.','Handed over. Benedikt will build and release your instance'+((r&&r.key)?' — issue '+r.key:'')+'.'));
    }).catch(function(){
      alert(T('Gerade keine Verbindung. Versuch es später noch einmal — deine Konfiguration bleibt gespeichert.','No connection right now. Try again later — your configuration is kept.'));
    });
  }
  /* Konsolen-Helfer für Benedikt: nach der Freigabe die Zeile fürs Register erzeugen.
     vaApp.compass.eintrag('Vorname Nachname','https://vishnu-artists.de/compass/kuerzel/') */
  function cpEintrag(name,url){
    return cpKey(name).then(function(k){
      var z='  "'+k+'": { "url": "'+String(url||'').replace(/[""]/g,'')+'", "seit": "'+new Date().toISOString().slice(0,10)+'", "notiz": "'+String(name||'').split(' ')[0].replace(/[""]/g,'')+'" }';
      try{ console.log('Zeile für site/va/compass-register.json (Abschnitt "instanzen"):\n'+z); }catch(e){}
      return z;
    });
  }

  /* ───────── Willkommens-Banner im Cockpit (kompakt) + Header-Buttons ───────── */
  function banner(){
    var wrap=document.querySelector('.wrap'); if(!wrap||document.getElementById('vaWelcome'))return;
    var a=auth(); if(!a)return;
    var kv=teamKv(); var lv=null; try{lv=pLevel(a.name);}catch(e){}
    var rows=board(); var pos=rows.findIndex(function(r){return r.n===a.name;});
    var my=null,fs=null; try{ if(FL()){fs=vaFL.summary(); my=vaFL.mine(a.name);} }catch(e){}
    var el=document.createElement('div'); el.id='vaWelcome';
    el.style.cssText='background:linear-gradient(180deg,#f2f7ec,#fff);border:1px solid #d8e2cc;border-left:4px solid #89c527;border-radius:12px;padding:12px 18px;margin:0 0 16px';
    el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"><div style="font-size:15px;font-weight:800">👋 '+T('Willkommen zurück, ','Welcome back, ')+esc(a.name.split(' ')[0])+(lv?' <span style="font-weight:600;font-size:12px;color:var(--sub)">· '+lv.chr+' Level '+(lv.ix+1)+' · '+lv.xp+' XP</span>':'')+'</div>'
      +(kv?'<div style="font-size:12.5px">'+T('Team-Flow-Score','Team flow score')+' <b>'+kv.score+'/100</b> '+(kv.score>=70?'🟢':kv.score>=40?'🟡':'🔴')+' · '+T('Erledigt','Done')+' <b>'+kv.done+'</b> · WIP <b>'+kv.wip+'</b> · 🚩 <b>'+kv.blk+'</b></div>':'')
      +(pos>=0?'<div style="font-size:12.5px">🏆 '+T('Flow-Rangliste: Platz ','Flow leaderboard: rank ')+'<b>'+(pos+1)+'</b>/'+rows.length+'</div>':'')
      +(my&&my.rank?'<div style="font-size:12.5px;cursor:pointer" onclick="vaApp.openFL(\'vfl-owner\')" title="'+T('FL2+FL3-Pflege-Rangliste — Klick öffnet Verantwortung & Pflege','FL2+FL3 care leaderboard')+'">🛫 '+T('FL2-Pflege: Platz ','FL2 care: rank ')+'<b>'+my.rank+'</b>/'+my.of+(my.attention.length?' · <b style="color:#bf2600">🔔 '+my.attention.length+'</b> '+T('Hinweis(e)','hint(s)'):' · ✨')+'</div>'
        :(fs&&fs.care&&fs.unowned?'<div style="font-size:12.5px;cursor:pointer" onclick="vaApp.openFL(\'vfl-owner\')">🛫 <b style="color:#bf2600">'+fs.unowned+'</b> '+T('Initiativen ohne Verantwortliche:n','initiatives without owner')+'</div>':''))
      +'</div><div class="wb"><span class="subtab" onclick="vaApp.start()">🏠 '+T('Startansicht','Starter view')+'</span><span class="subtab" onclick="vaApp.start();setTimeout(function(){var l=document.querySelector(\'#vaStart .lb\');if(l)l.scrollIntoView({block:\'center\'});},60)">🏆 '+T('Ranglisten','Leaderboards')+'</span><span class="subtab" onclick="vaApp.openFL(\'vfl-owner\')">🛫 '+T('FL2-Pflege','FL2 care')+'</span><span class="subtab" onclick="if(window.pbFlow){pbFlow.open();setTimeout(function(){pbFlow.challenge&&pbFlow.challenge();},250);}">🧠 '+T('Ziff-Challenge','Ziff challenge')+'</span>'+compassBtn()+'<span class="subtab" onclick="vaApp.logout()">↩ '+T('Abmelden','Sign out')+'</span></div>'
      +'<div data-vasuite></div>';
    wrap.insertBefore(el,wrap.firstChild);
    cpMalen();
  }
  function headerBtn(){
    var badge=document.getElementById('whoBadge'); if(!badge||document.getElementById('vaStartBtn'))return;
    var b=document.createElement('span'); b.id='vaStartBtn'; b.className=badge.className; b.textContent='🏠 '+T('Start','Start'); b.title=T('Startansicht: Rangliste, Ziff-Challenge, Meeting-Guide','Starter view: leaderboard, Ziff challenge, meeting guide');
    b.onclick=function(){startShow();};
    badge.parentNode.insertBefore(b,badge);
  }

  /* ───────── Boot ───────── */
  window.vaApp={loginShow:loginShow,logout:logout,start:startShow,startClose:startClose,chNext:chNext,challenge:ziffChallenge,openFL:openFL,drill:drill,jump:jump,go:go,compassUrl:compassUrl,board:board,boardHtml:boardHtml,hash:hash,auth:auth,teamKv:teamKv,ver:VER,
    tboard:tboard,personen:personen,roster:ROSTER,istAktiv:istAktiv,stand:stand,
    bio:{verknuepfen:bioVerknuepfen,login:bioLogin,vergessen:function(){localStorage.removeItem(BIO_KEY);}},
    compass:{anfragen:cpAnfrageDialog,einrichten:cpEinrichten,uebergeben:cpUebergeben,oeffnen:cpEmbedShow,schliessen:cpEmbedClose,stand:function(){return CP_STAND;},auffrischen:cpAuffrischen,eintrag:cpEintrag,konfig:cpKonfig}};
  /* Namens-Dialog des Cockpits durch den Team-Login ersetzen (Badge-Klick + Auto-Start) */
  try{ window.whoShow=function(){loginShow();}; }catch(e){}
  /* URL-Parameter (Flow Compass): ?go=… springt nach dem Login an die Stelle, ?compass=… merkt den Rücksprung */
  var Q=null; try{ Q=new URLSearchParams(location.search); }catch(e){}
  var GO=(Q&&Q.get('go'))||'';
  /* Anmelde-Link (?login=<token>, aus flow-login.php-Mails): erst einlösen, dann booten.
     Der Token verschwindet sofort aus der Adresszeile — er ist einmalig und gehört in keine Historie. */
  var LOGIN_WARTEN=null, LOGIN_MSG='';
  try{
    var LT=(Q&&Q.get('login'))||'';
    if(/^[0-9a-f]{32}$/.test(LT)){
      try{ var su=new URL(location.href); su.searchParams.delete('login'); history.replaceState(null,'',su.pathname+su.search+su.hash); }catch(e){}
      LOGIN_WARTEN=fetch(LOGIN_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aktion:'einloesen',token:LT})})
        .then(function(r){return r.json();})
        .then(function(j){ if(j&&j.ok&&j.name){ anmelden(j.name); } else { LOGIN_MSG=T('Der Anmelde-Link ist abgelaufen oder schon benutzt — bitte unten einen neuen schicken lassen.','The sign-in link expired or was already used — please request a new one below.'); } })
        .catch(function(){ LOGIN_MSG=T('Der Anmelde-Link ließ sich nicht prüfen (keine Verbindung) — bitte später noch einmal.','The sign-in link could not be verified (no connection) — please try again later.'); });
    }
  }catch(e){}
  try{ var cu=(Q&&Q.get('compass'))||''; if(/^https?:\/\//.test(cu)) localStorage.setItem(COMPASS_KEY,cu); }catch(e){}
  /* Eingebettet (iframe im Compass): Steuerbefehle annehmen, Bereitschaft melden */
  var EMBEDDED=(function(){ try{ return window.parent!==window; }catch(e){ return false; } })();
  /* Farbschema vom Compass: ?theme=dark|light setzt den Wunsch VOR pb-ui.js (pbTheme liest window.__vaThemeWish);
     eingebettet wird nicht persistiert (fcTheme bleibt die Einstellung des eigenständigen Cockpits). */
  function themeWish(t){
    t=(t==='dark')?'dark':(t==='light')?'light':'';
    if(!t)return;
    if(EMBEDDED) window.__vaThemeWish=t;
    if(window.pbTheme){ window.pbTheme.set(t); return; }
    if(!EMBEDDED){ try{ localStorage.setItem('fcTheme',t); }catch(e){} }
    document.documentElement.setAttribute('data-theme',t);   /* bis pb-ui.js geladen ist */
  }
  try{ themeWish(Q&&Q.get('theme')); }catch(e){}
  window.addEventListener('message',function(e){
    var d=e&&e.data; if(!d)return;
    if(d.type==='compass-theme'){ themeWish(d.theme); return; }
    if(d.type!=='compass-go')return;
    go(d.go);
  });
  function boot(){
    var a=auth();
    if(!a){
      document.documentElement.classList.add('va-locked');
      /* Erst die Tür fragen: kennt sie die Person und ist der Vorname in Jira eindeutig, ist das die
         Anmeldung. Sonst die Namensfrage (ohne Passwort) — oder, ohne Tür, der alte Login. */
      tuerFragen().then(function(j){
        TUER=j;
        if(j){ var p=matchPerson(j.name||''); if(p&&istAktiv(p[0])){ anmelden(p[0],true); boot(); return; } }
        loginShow(LOGIN_MSG);
      });
      return;
    }
    document.documentElement.classList.remove('va-locked');
    /* Identitaet konsistent halten (z. B. nach Datenwechsel oder wenn vaUser_va fehlt) */
    try{var u=JSON.parse(localStorage.getItem('vaUser_va')||'null'); if(!u||u.name!==a.name||u.role!=='Coach'){localStorage.setItem('vaUser_va',JSON.stringify({name:a.name,role:'Coach'})); location.reload(); return;}}catch(e){}
    headerBtn(); banner();
    bioAngebot();   /* einmalig anbieten, das Gerät per Hello/Face zu verknüpfen (gilt auch im Compass) */
    /* Flow-Suite: Stand des persönlichen Compass holen und die Produktleiste füllen.
       Beim Zurückwechseln aus dem Einrichtungs-Assistenten (eigener Tab) neu bewerten. */
    cpAuffrischen();
    window.addEventListener('focus',function(){ cpAuffrischen(); });
    if(GO){ if(GO!=='start')sessionStorage.setItem('vaStartSeen','1');
      setTimeout(function(){ go(GO); /* Scroll-Ziele nach dem Chart-Rendering noch einmal anfahren */
        if(GO==='aging'||GO==='team')setTimeout(function(){ jump(GO==='aging'?'aging':'kpis'); },900); },400); }
    else if(!sessionStorage.getItem('vaStartSeen'))setTimeout(startShow,350);
    if(EMBEDDED){ try{ window.parent.postMessage({type:'vaCockpitReady',ver:VER},'*'); }catch(e){} }
  }
  function bootWarten(){ if(LOGIN_WARTEN){ LOGIN_WARTEN.then(boot,boot); } else boot(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(bootWarten,250);}); else setTimeout(bootWarten,250);
})();
