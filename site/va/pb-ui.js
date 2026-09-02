/* ═══ pbTheme — Dark Theme (VA-Fork, 19.08.2026; portiert aus der Porsche-Quelle pb-ui.js vom 17.08.2026) ═══
   VA-Besonderheit: eingebettet im persönlichen "Vishnu Flow Compass" liefert va-app.js den Theme-Wunsch (?theme=dark|light,
   postMessage {type:'compass-theme'}) in window.__vaThemeWish — dann wird NICHT in localStorage (fcTheme) persistiert,
   damit das eigenständige Cockpit seine eigene Einstellung behält. --brand-dark im Dark = helles VA-Grün.
   Läuft vor dem Menü-Code, weil pb-ui.js auf jeder Seite eingebunden ist. Umschalter: Menü-Button
   #pbThemeBtn (alle Seiten) + #themeBtn im Cockpit-Header (setzt pb-start.js). Persistenz localStorage
   fcTheme (light|dark, Default light). Zwei Schichten:
   (1) AUTO-DARK: liest beim ersten Aktivieren alle same-origin Stylesheets und erzeugt für jede Regel mit
       hellem Hintergrund / heller Rahmenfarbe / dunkler Textfarbe (Literalwerte, keine var()) eine
       html[data-theme=dark]-Gegenregel (Farbton bleibt, Helligkeit invertiert) — deckt hartkodierte
       Farben aller Seiten ab, ohne jede Klasse einzeln zu pflegen.
   (2) EXPLIZIT: Tokens (--bg/--card/--ink/...), Header/Nav, SVG-Achsen (Attribut-Selektoren, Charts
       schreiben ihre Farben aus `const C` als Attribute), Inline-Styles per [style*=…], Ziff/KMM-Panels. */
(function(){
  var KEY='fcTheme', DOC=document.documentElement;
  var T=function(d,e){ var l=localStorage.getItem('vsLang')||localStorage.getItem('vaLang')||'de'; return l==='en'?e:d; };
  /* VA: eingebettet im Vishnu Flow Compass kommt der Wunsch per ?theme=/postMessage (window.__vaThemeWish, nicht persistiert) */
  function get(){ var w=window.__vaThemeWish; if(w==='dark'||w==='light') return w; return localStorage.getItem(KEY)==='dark'?'dark':'light'; }
  function label(t){ return t==='dark'?('☀️ '+T('Hell','Light')):'🌙 Dark'; }
  function paintBtns(t){
    ['pbThemeBtn','themeBtn'].forEach(function(id){ var b=document.getElementById(id); if(b){ b.textContent=label(t); b.title=T('Farbschema umschalten (hell/dunkel)','Toggle colour scheme (light/dark)'); } });
  }
  /* ---- Farbhelfer ---- */
  function rgb(s){ var m=/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?/.exec(s||''); if(!m)return null; var a=m[4]==null?1:parseFloat(m[4]); return {r:+m[1],g:+m[2],b:+m[3],a:a}; }
  function lum(c){ return 0.299*c.r+0.587*c.g+0.114*c.b; }
  function toHsl(c){ var r=c.r/255,g=c.g/255,b=c.b/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),h=0,s=0,l=(mx+mn)/2; if(mx!==mn){var d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn); if(mx===r)h=(g-b)/d+(g<b?6:0); else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; h/=6;} return {h:h,s:s,l:l}; }
  function hsl(h,s,l){ return 'hsl('+Math.round(h*360)+','+Math.round(s*100)+'%,'+Math.round(l*100)+'%)'; }
  /* heller Hintergrund → dunkle Fläche gleicher Tönung */
  function darkBg(c){ var q=toHsl(c); if(q.s<0.12) return lum(c)>=253?'var(--card,#16191d)':'#1c2026'; return hsl(q.h,Math.min(q.s,0.5),0.14); }
  /* dunkle Schrift → helle Schrift gleicher Tönung */
  function lightInk(c){ var q=toHsl(c); if(q.s<0.12) return lum(c)<40?'#e8eaed':'#aeb6c0'; return hsl(q.h,Math.min(q.s,0.7),Math.max(q.l,0.72)); }
  function darkLine(c){ var q=toHsl(c); return q.s<0.12?'#2a3038':hsl(q.h,Math.min(q.s,0.35),0.22); }
  /* ---- (1) Auto-Dark aus den Stylesheets ---- */
  var autoDone=false;
  function autoDark(){
    if(autoDone) return; autoDone=true;
    var out=[];
    function walk(rules){
      for(var i=0;i<rules.length;i++){
        var r=rules[i];
        if(r.cssRules&&r.type!==1){ try{walk(r.cssRules);}catch(e){} continue; }  /* @media etc. */
        if(!r.style||!r.selectorText) continue;
        var sel=r.selectorText; if(/data-theme|^\s*:root|^\s*html\b|fcs-|pbThemeBtn/.test(sel)) continue;
        var st=r.style, decl=[];
        var bg=rgb(st.getPropertyValue('background-color')); var bi=st.getPropertyValue('background-image');
        if(/var\(--ink\)/.test(st.getPropertyValue('background-color')||st.getPropertyValue('background'))) decl.push('color:#0e1013'); /* invertierte Elemente (Ink-Fläche, weiße Schrift): im Dark ist --ink hell */
        if(bg&&bg.a>0.5&&lum(bg)>195) decl.push('background-color:'+darkBg(bg));
        else if(bg&&bg.a>0.5&&lum(bg)>140&&toHsl(bg).s<0.2) decl.push('background-color:#262b31'); /* mittelhelles Grau (z.B. #dfe1e6/#c1c7d0) */
        if(bi&&bi!=='none'&&/gradient/.test(bi)){ var c1=rgb(bi); if(c1&&lum(c1)>195) decl.push('background-image:none','background-color:'+darkBg(c1)); }
        var col=rgb(st.getPropertyValue('color'));
        if(col&&col.a>0.5&&lum(col)<120&&!(bg&&lum(bg)<140&&bg.a>0.5)) decl.push('color:'+lightInk(col));
        ['border-color','border-top-color','border-left-color','border-bottom-color','border-right-color','outline-color'].forEach(function(p){
          var v=st.getPropertyValue(p); if(!v)return; if(p==='border-color'&&/ /.test(v.replace(/rgba?\([^)]*\)/g,'x')))return; /* mehrwertig → einzeln */
          var c=rgb(v); if(c&&c.a>0.5&&lum(c)>195) decl.push(p+':'+darkLine(c));
        });
        if(!decl.length) continue;
        var pre=sel.split(',').map(function(s){ return 'html[data-theme=dark] '+s.trim(); }).join(',');
        out.push(pre+'{'+decl.join(';')+'}');
      }
    }
    for(var i=0;i<document.styleSheets.length;i++){ var sh=document.styleSheets[i]; if(sh.ownerNode&&sh.ownerNode.id==='pbThemeCss')continue; try{ walk(sh.cssRules); }catch(e){} }
    var st=document.getElementById('pbThemeAuto'); if(!st){ st=document.createElement('style'); st.id='pbThemeAuto'; }
    st.textContent=out.join('\n');
    /* Auto-Regeln VOR den expliziten einhängen (explizit gewinnt bei gleicher Spezifität) */
    var ex=document.getElementById('pbThemeCss'); if(ex) ex.parentNode.insertBefore(st,ex); else document.head.appendChild(st);
  }
  /* ---- (2) Explizite Overrides ---- */
  var D='html[data-theme=dark] ';
  var CSS=[
    'html[data-theme=dark]{color-scheme:dark}',
    'html[data-theme=dark]:root{--bg:#0e1013;--card:#16191d;--ink:#e8eaed;--sub:#9aa1a9;--line:#262b31;--accent:#050608;--brand-dark:#a6d95a;--grey:#7f8892;--shadow:0 1px 2px rgba(0,0,0,.5),0 10px 30px -18px rgba(0,0,0,.9)}',
    D+'body{background:var(--bg);color:var(--ink)}',
    D+'header{background:#050608;border-bottom-color:var(--brand)}',
    D+'header .badge{background:#16191d;border-color:#2a3038;color:#c3c9d1}',
    D+'.card,'+D+'.kpi,'+D+'.coach,'+D+'.note,'+D+'.gatebar,'+D+'.tab,'+D+'.subtab{border-color:#262b31}',
    D+'.tab{background:var(--card);color:var(--sub)} '+D+'.tab.active{background:var(--blue);color:#fff}',
    D+'.subtab{background:var(--card);color:var(--sub)} '+D+'.subtab.active{background:var(--brand2);color:#fff;border-color:var(--brand2)}',
    D+'.src code{background:#0b0d10;color:#c3c9d1}',
    D+'.col{background:#1c2026} '+D+'.col .lim{background:#2a3038;color:#c3c9d1} '+D+'.col.over .lim{background:#5a1d14;color:#ffb3a6}',
    D+'.tk{background:#1f242a;border-color:#2a3038;box-shadow:none} '+D+'.tk .wsjf{background:#2b2652;color:#c9befc}',
    D+'.chip.live{background:#0f3d2b;color:#7ee2b8} '+D+'.chip.mock{background:#2a2f36;color:#aab4c0}',
    D+'input,'+D+'select,'+D+'textarea{background:#0e1013;color:var(--ink);border-color:var(--line)}',
    D+'.rangebar .warn{background:#3a2d0a;color:#ffd27a;border-color:#5b4610}',
    D+'.hlp{background:#1e2a4d;color:#9db1ff}',
    D+'.who,'+D+'.drill,'+D+'#agingDetail{background:var(--card);color:var(--ink)}',
    D+'.drill th{background:#1a1f26;color:var(--sub)} '+D+'.drill td{border-color:var(--line)}',
    D+'.amp-green{color:#57d9a3} '+D+'.amp-yellow{color:#ffc857} '+D+'.amp-red{color:#ff8b7a} '+D+'.amp-grey{color:#aab4c0}',
    D+'.assess{background:transparent;color:var(--ink)} '+D+'.assess .tip{color:#aeb6c0}',
    D+'.tipItem{background:#1a1f26} '+D+'.tipItem.link:hover{background:#1c2a1f}',
    D+'.pstat,'+D+'.agwbox,'+D+'.vkwelc .k{background:#1c2026}',
    D+'.gatebar .gchip{background:#1c2026;color:#9db1ff} '+D+'.gatebar .gchip:hover{background:#232930}',
    D+'.pcta .pgo,'+D+'.ptq .pans{background:#1c2026;color:var(--ink)}',
    D+'.plvlbar{background:#0e1013}',
    D+'#chartRail .rl-i:hover{background:#1c2026}',
    D+'.kpi .val,'+D+'.card h3,'+D+'.coach h3{color:var(--ink)}',
    D+'.fab{box-shadow:0 4px 14px rgba(0,0,0,.6)}',
    /* Diagramme: Achsen/Texte als SVG-Attribute (const C) */
    D+'svg text[fill="#172b4d"],'+D+'svg text[fill="#010205"],'+D+'svg text[fill="#253858"]{fill:#e8eaed}',
    D+'svg text[fill="#5e6c84"],'+D+'svg text[fill="#6b6d70"],'+D+'svg text[fill="#97a0af"],'+D+'svg text[fill="#42526e"]{fill:#9aa1a9}',
    D+'svg [stroke="#dfe1e6"],'+D+'svg [stroke="#d8d8db"],'+D+'svg [stroke="#ebecf0"],'+D+'svg [stroke="#eee"]{stroke:#2a3038}',
    D+'svg [stroke="#172b4d"],'+D+'svg [stroke="#010205"]{stroke:#e8eaed}',
    D+'svg [fill="#dfe1e6"],'+D+'svg [fill="#ebecf0"],'+D+'svg [fill="#f4f5f7"]{fill:#2a3038}',
    D+'svg [fill="#fff"]:not(text),'+D+'svg [fill="#ffffff"]:not(text){fill:#16191d}',
    /* Inline-Styles in gerenderten Strings */
    D+'[style*="background:#fff;"],'+D+'[style$="background:#fff"],'+D+'[style*="background:#fff "],'+D+'[style*="background:#ffffff"]{background:var(--card)!important}',
    D+'[style*="background:#f4f5f7"],'+D+'[style*="background:#f7f9fe"],'+D+'[style*="background:#fafbfc"],'+D+'[style*="background:#f4f6fd"],'+D+'[style*="background:#faf9ff"],'+D+'[style*="background:#f4f0ff"],'+D+'[style*="background:#ebecf0"],'+D+'[style*="background:#e9edfc"],'+D+'[style*="background:#f2f8e8"],'+D+'[style*="background:#eae6ff"],'+D+'[style*="background:#deebff"],'+D+'[style*="background:#fbfcff"],'+D+'[style*="background:#eef2e8"],'+D+'[style*="background:#f7f8f4"]{background:#1c2026!important}',
    D+'[style*="background:#e3fcef"]{background:#0f3d2b!important} '+D+'[style*="background:#fff7e6"],'+D+'[style*="background:#fffdf7"]{background:#3a2d0a!important} '+D+'[style*="background:#ffebe6"],'+D+'[style*="background:#ffbdad"],'+D+'[style*="background:#fff0e6"]{background:#4a1c14!important}',
    D+'[style*="color:#5e6c84"],'+D+'[style*="color:#6b6d70"],'+D+'[style*="color:#8b98ad"]{color:#9aa1a9!important} '+D+'[style*="color:#42526e"],'+D+'[style*="color:#253858"]{color:#aeb6c0!important}',
    D+'[style*="color:#006644"]{color:#57d9a3!important} '+D+'[style*="color:#bf2600"],'+D+'[style*="color:#a54800"]{color:#ff8b7a!important} '+D+'[style*="color:#8a5a00"]{color:#ffc857!important} '+D+'[style*="color:#5e4db2"]{color:#b8a9ff!important}',
    D+'[style*="color:#0f2ec2"],'+D+'[style*="color:#1a44ea"],'+D+'[style*="color:#0747a6"]{color:#7d97ff!important} '+D+'[style*="color:#010205"],'+D+'[style*="color:#172b4d"]{color:#e8eaed!important}',
    D+'[style*="border:1px solid #d8d8db"],'+D+'[style*="border-color:#d8d8db"],'+D+'[style*="border:1px solid #eee"]{border-color:#2a3038!important}',
    /* pb-ui: Navigation, Ziff-Panel, KMM, Coach-Tipps */
    D+'nav.pbmenu{background:#0e1013;border-bottom-color:#262b31;box-shadow:0 1px 3px rgba(0,0,0,.6)}',
    D+'nav.pbmenu a.mi{color:#9aa1a9} '+D+'nav.pbmenu a.mi:hover{color:#fff} '+D+'nav.pbmenu a.mi.here{color:#9db1ff}',
    D+'nav.pbmenu .lchip{background:#1c2026;color:#e8eaed;border-color:#2a3038} '+D+'nav.pbmenu a.lbtn,'+D+'nav.pbmenu select.lbtn{color:#9db1ff;border-color:#2a3038;background:#0e1013}',
    D+'.fm{background:#16191d;color:var(--ink)} '+D+'.fm .fmlog{background:#0e1013}',
    D+'.fm .msg.bot{background:#1c2026;border-color:#262b31;color:var(--ink)}',
    D+'.fm .chips,'+D+'.fm .fmin,'+D+'.fm .fmnote{background:#16191d;border-color:#262b31}',
    D+'.fm .chip{background:#1c2026;color:#9db1ff;border-color:#2a3038} '+D+'.fm .fmin input{background:#0e1013;color:var(--ink);border-color:#262b31}',
    D+'.fm .cta{background:#0f3d2b} '+D+'.flbox{background:#1c2026}',
    D+'.kmmbar{background:var(--card);border-color:#262b31} '+D+'.kmmbar .kmmstep{background:#2a3038}',
    D+'.kmmmodal,'+D+'.kmmmodal .kmmhead{background:#16191d;color:var(--ink);border-color:#262b31}',
    D+'.kmmlevel{border-color:#262b31} '+D+'.kmmlevel.iscur{background:#141b33} '+D+'.kmmlevel .kd{color:#aeb6c0}',
    D+'.kmmnext{background:#0f3d2b} '+D+'.kmmself{background:#241f3f;border-color:#3b3169} '+D+'.kmmself .klast{background:#16191d;color:#9aa1a9}',
    D+'.kmmtease{background:#1a1720}',
    D+'.pbcoach{background:#16191d;color:var(--ink)} '+D+'.pbcoach .tip{background:#1a1f26} '+D+'.pbcoach .tip.ok{background:#12261b} '+D+'.pbcoach .tip.warn{background:#2a1512}',
    D+'.pbcoach .lvl div{background:#2a3038;color:#aab4c0} '+D+'.pbcoach .lvl div.done{background:#0f3d2b;color:#7ee2b8}',
    /* Startansicht (pb-start.js) */
    D+'.fcs-lvl{background:linear-gradient(180deg,#141b33,#16191d);border-color:#2a3550}',
    D+'.fcs-lb .r.me{background:rgba(26,68,234,.18)}',
    D+'.fcs-brnote{background:#3a2d0a;color:#ffd27a;border-color:#5b4610}',
    D+'.fcs-box .btn.sec{background:#1c2026;color:var(--ink);border-color:#2a3038}',
    D+'.fcs-kv .k{background:#1c2026}'
  ].join('\n');
  /* ---- (1b) Inline-Styles in gerenderten Strings: je gefundenem Hex-Wert eine [style*=…]-Gegenregel (dedupliziert) ---- */
  var seenHex={}, inlineSt=null, mo=null, moT=0;
  function hexRgb(h){ h=h.replace('#',''); if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; if(h.length!==6)return null; return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:1}; }
  function inlineDark(){
    if(get()!=='dark') return;
    var els=document.querySelectorAll('[style*="#"]'), add=[];
    for(var i=0;i<els.length;i++){
      var s=els[i].getAttribute('style')||'', m, re=/(background(?:-color)?|color|border(?:-[a-z]+)?-color|border(?:-[a-z]+)?)\s*:\s*([^;]*?)(#[0-9a-fA-F]{3,6})\b/g;
      while((m=re.exec(s))){
        var prop=m[1], hex=m[3].toLowerCase(), key=prop+"|"+m[2]+m[3]; if(seenHex[key])continue; seenHex[key]=1;
        var c=hexRgb(hex); if(!c)continue;
        var sel='html[data-theme=dark] [style*="'+prop+':'+m[2]+m[3]+'"]';
        /* Achtung: der Selektor braucht den EXAKTEN Teilstring wie im Attribut — deshalb m[2] (z. B. "1px solid ") mit übernehmen */
        if(/^background/.test(prop)){ if(lum(c)>195) add.push(sel+'{background-color:'+darkBg(c)+'!important;background-image:none!important}'); }
        else if(prop==='color'){ if(lum(c)<120) add.push(sel+'{color:'+lightInk(c)+'!important}'); }
        else { if(lum(c)>195) add.push(sel+'{border-color:'+darkLine(c)+'!important}'); }
      }
    }
    if(!add.length) return;
    if(!inlineSt){ inlineSt=document.createElement('style'); inlineSt.id='pbThemeInline'; document.head.appendChild(inlineSt); }
    inlineSt.textContent+=add.join('\n')+'\n';
  }
  function watchInline(){
    if(mo||!window.MutationObserver||!document.body) return;
    mo=new MutationObserver(function(){ if(get()!=='dark')return; clearTimeout(moT); moT=setTimeout(inlineDark,150); });
    mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
  }
  function ensureCss(){ if(document.getElementById('pbThemeCss'))return; var s=document.createElement('style'); s.id='pbThemeCss'; s.textContent=CSS; document.head.appendChild(s); }
  function apply(t){
    t=t==='dark'?'dark':'light';
    ensureCss();
    if(t==='dark'){ autoDark(); inlineDark(); if(document.body)watchInline(); else document.addEventListener('DOMContentLoaded',watchInline); }
    DOC.setAttribute('data-theme',t);
    paintBtns(t);
  }
  function set(t){ t=t==='dark'?'dark':'light'; if(window.__vaThemeWish) window.__vaThemeWish=t; else localStorage.setItem(KEY,t); apply(get()); }
  function toggle(){ set(get()==='dark'?'light':'dark'); }
  /* Stylesheets, die NACH dem ersten Aktivieren dazukommen (z. B. Modal-CSS), nachziehen */
  function refresh(){ autoDone=false; var st=document.getElementById('pbThemeAuto'); if(st)st.remove(); if(get()==='dark'){autoDark();inlineDark();} }
  window.pbTheme={get:get,set:set,toggle:toggle,apply:apply,refresh:refresh,paint:function(){paintBtns(get());},label:label};
  apply(get());
  /* Spät geladene Styles (Modals, Widgets) beim ersten Nutzer-Klick nachziehen — billig, einmalig */
  var late=0; document.addEventListener('click',function(){ if(late++<2&&get()==='dark'){ setTimeout(refresh,50); } },true);
})();

/* pb-ui.js — gemeinsames Menü (mit Login-Status) + persönlicher Kanban-Coach
   Eingebunden von valuestream.html, programmboard.html, cockpit.html (Cockpit: nur Menü).
   Login-Status kommt aus sessionStorage.vsAuth (gesetzt vom Value-Stream-Portal). */
(function(){
  const HAS_DATA = typeof TEAMS !== 'undefined' && typeof FEAT !== 'undefined';
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function vsAuth(){ try { return JSON.parse(sessionStorage.getItem('vsAuth')||'null'); } catch(e){ return null; } }

  /* ---------- Styles ---------- */
  const css = document.createElement('style');
  css.textContent = `
  nav.pbmenu{background:#fff;border-bottom:1px solid #d8d8db;padding:0 28px;display:flex;gap:2px;flex-wrap:wrap;
    align-items:center;position:sticky;top:0;z-index:60;box-shadow:0 1px 3px rgba(15,16,16,.07);
    font-family:'Porsche Next','Arial Narrow',Arial,sans-serif;font-size:13px}
  nav.pbmenu a.mi{padding:12px 14px;font-weight:600;color:#6b6d70;text-decoration:none;border-bottom:3px solid transparent}
  nav.pbmenu a.mi:hover{color:#010205}
  nav.pbmenu a.mi.here{color:#0f2ec2;border-bottom-color:#1a44ea}
  nav.pbmenu .spacer{margin-left:auto}
  nav.pbmenu .lstat{display:flex;gap:8px;align-items:center;font-size:12px;padding:8px 0}
  nav.pbmenu .lchip{border:1px solid #d8d8db;border-radius:16px;padding:4px 12px;font-weight:600;color:#010205;background:#f4f6fd}
  nav.pbmenu .lchip.demo{background:#fff7e6;color:#8a5a00;border-color:#ffe380}
  nav.pbmenu a.lbtn{color:#0f2ec2;font-weight:700;text-decoration:none;border:1px solid #d8d8db;border-radius:16px;padding:4px 12px;cursor:pointer}
  nav.pbmenu a.lbtn:hover{border-color:#1a44ea}
  .pbcoach-fab{position:fixed;right:22px;bottom:22px;width:58px;height:58px;border-radius:50%;z-index:80;
    background:linear-gradient(135deg,#1a44ea,#0f2ec2);color:#fff;display:flex;align-items:center;justify-content:center;
    font-size:26px;cursor:pointer;box-shadow:0 6px 18px rgba(15,16,16,.3);user-select:none;
    animation:pbPulse 2.4s infinite;font-family:'Porsche Next',Arial,sans-serif}
  .pbcoach-fab:hover{transform:scale(1.08)}
  @keyframes pbPulse{0%{box-shadow:0 6px 18px rgba(15,16,16,.3),0 0 0 0 rgba(26,68,234,.45)}
    70%{box-shadow:0 6px 18px rgba(15,16,16,.3),0 0 0 16px rgba(26,68,234,0)}
    100%{box-shadow:0 6px 18px rgba(15,16,16,.3),0 0 0 0 rgba(26,68,234,0)}}
  .pbcoach{position:fixed;right:22px;bottom:92px;width:380px;max-width:92vw;max-height:74vh;overflow:auto;z-index:81;
    background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);border-top:5px solid #1a44ea;
    padding:18px 20px;display:none;font-family:'Porsche Next','Arial Narrow',Arial,sans-serif;font-size:13px;color:#010205}
  .pbcoach.open{display:block}
  .pbcoach h3{margin:0 0 2px;font-size:15px}
  .pbcoach .sub{font-size:11.5px;color:#6b6d70;margin-bottom:10px}
  .pbcoach .lvl{display:flex;gap:4px;margin:10px 0}
  .pbcoach .lvl div{flex:1;text-align:center;font-size:9.5px;font-weight:700;padding:6px 2px;border-radius:6px;
    background:#ebecf0;color:#5e6c84;line-height:1.3}
  .pbcoach .lvl div.done{background:#e3fcef;color:#006644}
  .pbcoach .lvl div.now{background:#1a44ea;color:#fff}
  .pbcoach .tip{border-left:3px solid #2b50e8;background:#f7f9fe;border-radius:6px;padding:8px 10px;margin:8px 0;line-height:1.5;font-size:12px}
  .pbcoach .tip.warn{border-left-color:#ff5630;background:#fffafa}
  .pbcoach .tip.ok{border-left-color:#36b37e;background:#f4fff9}
  .pbcoach .tip b{display:block}
  .pbcoach .tip a{color:#0f2ec2;font-weight:700;text-decoration:none}
  .pbcoach select{width:100%;padding:7px 10px;border:1px solid #d8d8db;border-radius:8px;font-family:inherit;font-size:12.5px;margin:4px 0 6px}
  .pbcoach .close{position:absolute;right:14px;top:10px;cursor:pointer;font-size:18px;color:#6b6d70}
  .pbcoach .score{font-size:11.5px;color:#6b6d70;margin-top:8px;border-top:1px dashed #d8d8db;padding-top:8px}
  @media(max-width:640px){
    nav.pbmenu{padding:0 10px;gap:0 2px}
    nav.pbmenu a.mi{padding:9px 8px;font-size:12px}
    nav.pbmenu .spacer{display:none}
    nav.pbmenu .lstat{flex-wrap:wrap;font-size:11px;padding:6px 0;gap:6px}
    nav.pbmenu .lchip,nav.pbmenu a.lbtn{padding:4px 9px}
    nav.pbmenu #pbTeamSw{max-width:130px}
  }`;
  document.head.appendChild(css);

  /* ---------- Menü (mehrsprachig DE/EN, globaler Sim-Schalter) ----------
     Zwei Navigationsachsen: horizontal = Flight Level (Einstieg/FL3/FL2/FL1/Hilfe),
     vertikal = Team-Switcher (Dropdown, wirkt auf FL1-Cockpit-Link + Programmboard/OKR-Filter). */
  const LANG = (localStorage.getItem('vsLang') === 'en') ? 'en' : 'de';
  const T = (de, en) => LANG === 'en' ? en : de;
  const SIM_ON = () => localStorage.getItem('pbSim') === '1';
  function curTeamId(){
    if (typeof vsCurrentTeamId === 'function') { try { return vsCurrentTeamId(); } catch(e){} }
    return 'analytics';
  }
  function curTeamObj(){ return HAS_DATA ? (TEAMS.find(x=>x.id===curTeamId())||TEAMS[0]) : null; }
  function cockpitItem(){
    const t = curTeamObj();
    if (!t) return ['cockpit.html','🌊 FL1 · Kanban Cockpit','🌊 FL1 · Kanban Cockpit'];
    const href = (typeof vsCockpitHref === 'function') ? vsCockpitHref(t.id) : (t.cockpit || 'cockpit.html');
    const label = t.live ? `🌊 FL1 · ${t.n} Cockpit` : `🌊 FL1 · ${t.n} (Team-Bereich)`;
    return [href, label, label];
  }
  /* VA-Instanz (site/va): eine Seite — Startansicht, FL1-Tab, FL2+3-Tab; Hilfe/KMM liegen eine Ebene hoeher. */
  function items(){
    return [
      ['#va-start','⌂ Start','⌂ Start'],
      ['#va-fl1','🌊 FL1 · Team-Cockpit','🌊 FL1 · Team cockpit'],
      ['#va-fl23','🛫 FL2+3 · Board STA','🛫 FL2+3 · Board STA'],
      ['../flow-cockpit-hilfe.html','❓ Hilfe','❓ Help'],
      ['../kmm.html','📖 KMM-Reifegrad','📖 KMM maturity']
    ];
  }
  function teamSwitcherHtml(){
    if (!HAS_DATA) return '';
    const cur = curTeamId();
    const opts = TEAMS.map(t=>`<option value="${t.id}"${t.id===cur?' selected':''}>${t.n}${t.live?' ●':''}</option>`).join('');
    return `<select id="pbTeamSw" class="lbtn" title="${T('Team wechseln (vertikale Navigation)','Switch team (vertical navigation)')}" style="font-family:inherit;cursor:pointer">${opts}</select>`;
  }
  function navHtml(){
    const a = vsAuth();
    const links = items().map(([href,de,en])=>{
      // .here setzt spaeter syncActive() hash-abhaengig (FL2 vs FL3 auf derselben Seite)
      return `<a class="mi" href="${href}">${T(de,en)}</a>`;
    }).join('');
    let right;
    const va = (window.vaApp && typeof vaApp.auth==='function') ? vaApp.auth() : null;
    if (va) {
      right = `<span class="lchip">👤 ${va.name} · Coach</span><a class="lbtn" id="pbLogout">${T('Abmelden','Sign out')}</a>`;
    } else if (a) {
      right = `<span class="lchip">👤 ${a.u}</span><a class="lbtn" id="pbLogout">${T('Abmelden','Sign out')}</a>`;
    } else {
      right = `<a class="lbtn" id="pbLoginBtn">🔐 ${T('Team-Login','Team login')}</a>`;
    }
    const langBtn = `<a class="lbtn" id="pbLangBtn" title="${T('Sprache umschalten','Switch language')}">${LANG==='de'?'🌐 EN':'🌐 DE'}</a>`;
    return links + teamSwitcherHtml() + `<span class="spacer"></span><span class="lstat">${langBtn}${right}</span>`;
  }
  function injectNav(){
    let nav = document.querySelector('nav.menu, nav.pbmenu');
    if (nav) { // bestehendes Menü (Portal) vereinheitlichen
      nav.classList.add('pbmenu'); nav.classList.remove('menu');
    } else {
      nav = document.createElement('nav'); nav.className = 'pbmenu';
      const hdr = document.querySelector('header');
      if (hdr) hdr.insertAdjacentElement('afterend', nav); else document.body.prepend(nav);
    }
    nav.innerHTML = navHtml();
    const lo = document.getElementById('pbLogout');
    if (lo) lo.addEventListener('click', ()=>{ sessionStorage.removeItem('vsAuth'); if (window.vaApp) vaApp.logout(); else location.reload(); });
    const li = document.getElementById('pbLoginBtn');
    if (li) li.addEventListener('click', ()=>{ if (window.vaApp) vaApp.loginShow(); });
    /* VA-Links: alles auf dieser Seite */
    nav.querySelectorAll('a.mi[href^="#va-"]').forEach(a=>{
      a.addEventListener('click', (e)=>{ e.preventDefault(); const v=a.getAttribute('href');
        if (v==='#va-start') { if (window.vaApp) vaApp.start(); return; }
        const t=document.querySelector(v==='#va-fl23' ? '.tab[data-view="programm"]' : '.tab[data-view="gesamt"]');
        if (t) t.click(); window.scrollTo({top:0,behavior:'smooth'}); });
    });
    const sb = document.getElementById('pbSimBtn');
    if (sb) sb.addEventListener('click', ()=>{ localStorage.setItem('pbSim', SIM_ON()?'0':'1'); location.reload(); });
    const lb = document.getElementById('pbLangBtn');
    if (lb) lb.addEventListener('click', ()=>{ const nl = LANG==='de'?'en':'de';
      localStorage.setItem('vsLang', nl); localStorage.setItem('vaLang', nl); /* vaLang steuert das Kanban Cockpit */
      location.reload(); });
    const ts = document.getElementById('pbTeamSw');
    if (ts) ts.addEventListener('change', ()=>{
      if (typeof vsSetTeamCtx === 'function') vsSetTeamCtx(ts.value); else sessionStorage.setItem('pbTeam', ts.value);
      const base = here;
      if (base === 'programmboard.html' || base === 'index.html') { injectNav(); if (window.renderAll) window.renderAll(); if (window.renderPage) window.renderPage(); }
      else location.href = 'programmboard.html#team';
    });
    /* Menü-Links, die auf DIESE Seite mit #view zeigen (FL2/FL3), direkt per switchTab schalten.
       Sonst haengt die Navigation an hashchange und hat eine Dead-Zone: zeigt der Hash schon #okr,
       feuert ein erneuter FL3-Klick kein Event -> Ansicht bleibt haengen (Bug „FL3 geht nicht"). */
    nav.querySelectorAll('a.mi').forEach(a=>{
      const href = a.getAttribute('href') || '';
      const hi = href.indexOf('#');
      const base = (hi >= 0 ? href.slice(0, hi) : href).toLowerCase();
      if (base && base !== here) return;               // anderes Ziel -> normal navigieren
      if (typeof window.switchTab !== 'function') return; // nur auf Seiten mit Tab-Umschaltung (Programmboard)
      const view = hi >= 0 ? href.slice(hi + 1) : 'vehicle'; // FL2 ohne #hash = Board-Standardsicht
      a.addEventListener('click', (e)=>{
        e.preventDefault();
        if (location.hash.slice(1) !== view) { try { history.replaceState(null, '', '#' + view); } catch(_){} }
        window.switchTab(view);
        syncActive();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
    syncActive();
  }
  /* Aktiv-Markierung hash-abhaengig: auf derselben Seite ist FL3·OKR bei #okr aktiv, sonst FL2·Programm.
     Behebt „FL3 springt nicht um" (Menue-Highlight blieb auf FL2, obwohl die OKR-Sicht schon aktiv war). */
  function syncActive(){
    const nav = document.querySelector('nav.pbmenu'); if (!nav) return;
    const curHash = location.hash.slice(1);
    nav.querySelectorAll('a.mi').forEach(a=>{
      const href = (a.getAttribute('href') || '');
      const b = href.split('#')[0].toLowerCase();
      const h = href.includes('#') ? href.split('#')[1] : '';
      let active = false;
      if (b === here) { active = h ? (curHash === h) : (curHash !== 'okr'); }
      a.classList.toggle('here', active);
    });
  }
  window.addEventListener('hashchange', syncActive);
  injectNav();
  window.pbUiRefreshNav = injectNav;

  /* ============================================================
     Kanban Maturity Model (ML0–ML3, Fokus bis Fit-for-Purpose)
     + Flight-Levels-Coaching. Zentral hier, weil Cockpit (FL1),
     Programmboard (FL2) und OKR-Sicht (FL3) pb-ui.js laden.
     Nach Klaus Leopolds Flight Levels + David Andersons KMM.
     ============================================================ */
  (function(){
    const kmmCss = document.createElement('style');
    kmmCss.textContent = `
    .kmmbar{display:flex;align-items:center;gap:0;cursor:pointer;font-family:'Porsche Next',Arial,sans-serif;
      border:1px solid #e3e3e6;border-radius:12px;padding:8px 12px;background:#fff;user-select:none;transition:box-shadow .15s}
    .kmmbar:hover{box-shadow:0 3px 12px rgba(15,16,16,.12)}
    .kmmbar .kmmlbl{font-size:11px;font-weight:700;color:#6b6d70;margin-right:10px;white-space:nowrap;text-transform:uppercase;letter-spacing:.4px}
    .kmmbar .kmmsteps{display:flex;gap:3px;flex:1;min-width:150px}
    .kmmbar .kmmstep{flex:1;height:9px;border-radius:5px;background:#ebecf0}
    .kmmbar .kmmnow{margin-left:10px;font-size:12px;font-weight:800;white-space:nowrap}
    .kmmbar .kmmhint{margin-left:8px;font-size:10.5px;color:#97a0af;white-space:nowrap}
    .kmmov{position:fixed;inset:0;z-index:200;background:rgba(6,8,20,.55);display:flex;align-items:center;justify-content:center;padding:20px}
    .kmmmodal{background:#fff;border-radius:18px;max-width:680px;width:100%;max-height:88vh;overflow:auto;
      font-family:'Porsche Next','Arial Narrow',Arial,sans-serif;color:#0f1010;box-shadow:0 24px 70px rgba(0,0,0,.4);position:relative}
    .kmmmodal .kmmhead{padding:22px 26px 14px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;z-index:1}
    .kmmmodal h2{margin:0;font-size:19px}
    .kmmmodal .kmmsub{font-size:12.5px;color:#6b6d70;margin-top:3px}
    .kmmmodal .kmmx{position:absolute;right:16px;top:14px;cursor:pointer;font-size:22px;color:#97a0af;line-height:1}
    .kmmmodal .kmmbody{padding:8px 26px 24px}
    .kmmlevel{border:1px solid #eee;border-radius:12px;padding:13px 16px;margin:12px 0;border-left-width:5px}
    .kmmlevel h3{margin:0 0 3px;font-size:15px;display:flex;align-items:center;gap:8px}
    .kmmlevel .kd{font-size:12.5px;color:#4a4d52;line-height:1.5}
    .kmmlevel.iscur{background:#f4f7ff;box-shadow:0 0 0 2px #1a44ea inset}
    .kmmlevel .youare{font-size:10.5px;font-weight:800;color:#fff;background:#1a44ea;border-radius:10px;padding:2px 8px;text-transform:uppercase;letter-spacing:.4px}
    .kmmnext{margin-top:16px;background:#edf9f1;border-radius:12px;padding:14px 16px}
    .kmmnext h4{margin:0 0 8px;font-size:13.5px;color:#006644}
    .kmmnext ul{margin:0;padding-left:18px;line-height:1.7;font-size:13px}
    .kmmnext li{margin-bottom:3px}
    .flbox{border-radius:12px;padding:13px 16px;margin:14px 0;background:linear-gradient(135deg,#f0f4ff,#eef9f1);border:1px solid #e0e8f5;
      font-family:'Porsche Next',Arial,sans-serif}
    .flbox .flh{font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#5e4db2;margin-bottom:6px;display:flex;align-items:center;gap:6px}
    .flbox .flt{font-size:13px;color:#1a1c1f;line-height:1.5;margin-bottom:8px}
    .flbox .flq{font-size:13px;color:#0f2ec2;font-weight:600;line-height:1.5;border-left:3px solid #7a86f0;padding-left:10px}
    .flbox .flnext{margin-top:8px;font-size:11px;color:#6b6d70;cursor:pointer;font-weight:700}
    .kmmlevel h3 .ktheory{margin-left:auto;font-size:11px;font-weight:700;color:#0f2ec2;text-decoration:none;white-space:nowrap}
    .kmmlevel details{margin-top:7px}
    .kmmlevel summary{cursor:pointer;font-size:11.5px;font-weight:700;color:#5e4db2;user-select:none}
    .kmmlevel .kchk{margin:6px 0 0;padding-left:2px;font-size:12px;color:#4a4d52;line-height:1.7;list-style:none}
    .kmmself{margin-top:14px;background:#f4f0ff;border:1px solid #c0b6f2;border-radius:12px;padding:12px 16px;font-size:12.5px;line-height:1.6}
    .kmmself a{cursor:pointer;color:#5e4db2;font-weight:800;text-decoration:none}
    .kmmself .klast{display:inline-block;background:#fff;border:1px solid #d8d8db;border-radius:10px;padding:1px 8px;font-size:11px;color:#6b6d70;margin-left:6px}
    .kmmtease{border:1px dashed #cbb8e0;border-radius:12px;padding:11px 16px;margin:10px 0;background:linear-gradient(135deg,#faf7ff,#fff)}
    .kmmtease h3{margin:0 0 3px;font-size:14px;display:flex;align-items:center;gap:8px}
    .kmmtease .kd{font-size:12px;color:#5c5f66;line-height:1.5}
    .kmmtease .klock{margin-left:auto;font-size:10.5px;font-weight:800;color:#8e44ad;white-space:nowrap}
    .kmmtrainer{margin-top:16px;background:linear-gradient(135deg,#0c1013,#3a5d0c);color:#fff;border-radius:12px;padding:14px 16px;font-size:12.5px;line-height:1.6}
    .kmmtrainer b{color:#fff}
    .kmmtrainer a{color:#c3ef70;font-weight:800;text-decoration:none}`;
    document.head.appendChild(kmmCss);

    const EN = () => (localStorage.getItem('vsLang')==='en');
    const KT = (de,en) => EN() ? en : de;

    // ML0–ML3 (bis Fit-for-Purpose, wie gewünscht). Farben aus dem KMM-Poster.
    const STEPS = [
      { c:'#e6b800', de:'Oblivious', en:'Oblivious',
        dDe:'Kein gemeinsames System. Arbeit hängt an einzelnen Personen (Personal Kanban), Ergebnisse an „Helden". Kaum Vorhersagbarkeit.',
        dEn:'No shared system. Work depends on individuals (personal kanban) and outcomes on heroes. Little predictability.',
        nDe:['Ein gemeinsames Team-Board aufsetzen und ALLE Arbeit sichtbar machen','Blockaden und Wartezustände sichtbar markieren','Tägliches Standup vor dem Board etablieren'],
        nEn:['Set up one shared team board and make ALL work visible','Mark blockers and waiting states visibly','Establish a daily standup in front of the board'] },
      { c:'#f39c12', de:'Team-fokussiert', en:'Team-focused',
        dDe:'Das Team hat ein Board und sieht seine eigene Arbeit — aber der Prozess ist emergent, Ergebnisse schwanken, der Blick geht nach innen.',
        dEn:'The team has a board and sees its own work — but the process is emergent, outcomes vary, and the focus is inward.',
        nDe:['WIP-Limits je Spalte einführen — ziehen statt schieben (Pull)','Explizite Policies sichtbar machen (Definition of Ready/Done)','Replenishment- und Flow-Review-Termine etablieren','Flow messen: Lead Time, Durchsatz, WIP'],
        nEn:['Introduce WIP limits per column — pull instead of push','Make policies explicit (Definition of Ready/Done)','Establish replenishment and flow-review cadences','Measure flow: lead time, throughput, WIP'] },
      { c:'#e8734a', de:'Kundenorientiert', en:'Customer-Driven',
        dDe:'Stabiler, konsistenter Prozess: WIP ist limitiert, der Fluss wird aktiv gesteuert, Policies sind explizit. Das Team liefert verlässlich, was Kund:innen anfragen (End-to-End-Flow).',
        dEn:'Stable, consistent process: WIP is limited, flow is actively managed, policies are explicit. The team reliably delivers what customers ask for (end-to-end flow).',
        nDe:['Service Level Expectations definieren (z. B. 85 % in X Tagen) und messen','Alternde Tickets und Blocker aktiv managen — Ältestes zuerst','Feedback-Schleifen etablieren (Delivery-/Replenishment-Kadenzen)','Klassen von Service einführen; mit Daten forecasten statt schätzen'],
        nEn:['Define Service Level Expectations (e.g. 85% in X days) and measure them','Actively manage aging items and blockers — oldest first','Establish feedback loops (delivery/replenishment cadences)','Introduce classes of service; forecast with data instead of guessing'] },
      { c:'#d64550', de:'Fit-for-Purpose', en:'Fit-for-Purpose',
        dDe:'Vorhersagbare Lieferung, die die meisten Kundenerwartungen trifft (SLE/SLA). Feedback-Schleifen greifen — das System ist zweckmäßig und verlässlich.',
        dEn:'Predictable delivery that meets most customer expectations (SLE/SLA). Feedback loops are working — the system is fit for its purpose.',
        nDe:['Ziel für den Team-Fokus erreicht. Weiter Richtung Risk-Hedged (ML4): Portfolio-Steuerung, Risiken proaktiv absichern, modellbasiert managen.'],
        nEn:['Goal for the team focus reached. Next toward Risk-Hedged (ML4): portfolio steering, hedge risks proactively, manage model-based.'] }
    ];

    /* Stufen-Checks (Selbst-Assessment): CHECKS[i] = die Fragen, an denen man erkennt,
       ob ein System ML(i+1) erreicht hat. Genutzt vom Modal (Checkliste je Level)
       und von Ziffs gefuehrtem Reifegrad-Check (pbFlow.quiz). */
    const CHECKS = [
      { to:1,
        qDe:['Habt ihr EIN gemeinsames Team-Board, auf dem wirklich ALLE Arbeit sichtbar ist — auch das, was „nebenbei" läuft?',
             'Sind Blockaden und Wartezustände auf dem Board markiert und für alle sichtbar?',
             'Trefft ihr euch regelmäßig (z. B. täglich) VOR dem Board — und sprecht über die Arbeit, nicht über Auslastung?'],
        qEn:['Do you have ONE shared team board where ALL work is really visible — including the stuff running "on the side"?',
             'Are blockers and waiting states marked on the board and visible to everyone?',
             'Do you meet regularly (e.g. daily) IN FRONT of the board — talking about the work, not about utilisation?'] },
      { to:2,
        qDe:['Habt ihr WIP-Limits je Spalte — und haltet ihr sie ein (Pull statt Push)?',
             'Sind eure Arbeitsregeln explizit und sichtbar (Definition of Ready/Done, Prioritätsregeln)?',
             'Habt ihr feste Kadenzen für Nachschub (Replenishment) und Flow-Review?',
             'Messt ihr euren Fluss — Lead Time, Durchsatz, WIP — und schaut regelmäßig drauf?'],
        qEn:['Do you have WIP limits per column — and do you respect them (pull instead of push)?',
             'Are your working policies explicit and visible (Definition of Ready/Done, priority rules)?',
             'Do you have fixed cadences for replenishment and flow review?',
             'Do you measure your flow — lead time, throughput, WIP — and look at it regularly?'] },
      { to:3,
        qDe:['Habt ihr Service Level Expectations definiert („85 % in X Tagen") — und messt sie?',
             'Managt ihr alternde Tickets und Blocker aktiv — Ältestes zuerst statt Lautestes zuerst?',
             'Greifen eure Feedback-Schleifen verlässlich (Delivery-Review, Replenishment, wirksame Retro)?',
             'Forecastet ihr mit euren eigenen Daten (Perzentile, Klassen von Service) statt mit Schätzungen?'],
        qEn:['Have you defined Service Level Expectations ("85% within X days") — and do you measure them?',
             'Do you actively manage aging items and blockers — oldest first instead of loudest first?',
             'Are your feedback loops working reliably (delivery review, replenishment, an effective retro)?',
             'Do you forecast with your own data (percentiles, classes of service) instead of estimates?'] }
    ];

    // ML4–ML6: Ausblick, der neugierig macht — der Aufstieg dorthin ist Trainer-Territorium.
    const TEASE = [
      { ml:4, c:'#c9283c', e:'🛡️', de:'Risk-Hedged', en:'Risk-Hedged',
        dDe:'Hier wird nicht mehr reagiert, sondern abgesichert: Monte-Carlo-Forecasts, Portfolio-Steuerung, Kapazität nach Risiko. Teams auf ML4 reden mit dem Management über Wahrscheinlichkeiten statt über Termine.',
        dEn:'No more reacting — hedging: Monte Carlo forecasts, portfolio steering, capacity by risk. ML4 teams talk to management about probabilities instead of deadlines.' },
      { ml:5, c:'#8e44ad', e:'🏔️', de:'Market Leader', en:'Market Leader',
        dDe:'Das ganze Unternehmen fühlt sich wie EIN Fluss an — Strategie bis Delivery an einem Signalstrang. Nur wenige Organisationen weltweit spielen auf diesem Level.',
        dEn:'The whole company feels like ONE flow — strategy to delivery on a single signal chain. Only a handful of organisations worldwide play at this level.' },
      { ml:6, c:'#5b3e8e', e:'🌳', de:'Built for Survival', en:'Built for Survival',
        dDe:'Reinvention als Muskel: Die Organisation übersteht Krisen nicht nur — sie nutzt sie. Der Gipfel des KMM, öfter zitiert als erreicht.',
        dEn:'Reinvention as a muscle: the organisation doesn\'t just survive crises — it uses them. The summit of the KMM, quoted more often than reached.' }
    ];

    // Letztes Selbst-Check-Ergebnis (nur lokal im Browser)
    function selfLoad(){ try{ return JSON.parse(localStorage.getItem('kmmSelfCheck')||'null'); }catch(e){ return null; } }
    function selfSave(lvl){ try{ localStorage.setItem('kmmSelfCheck', JSON.stringify({lvl:lvl, date:new Date().toISOString().slice(0,10)})); }catch(e){} }

    // Flight-Levels-Coaching: rotierende Tipps + Coaching-Fragen je Ebene
    const FL = {
      1:{ de:'Flight Level 1 · Operativer Flow', en:'Flight Level 1 · Operational flow',
        tDe:['Flight Level 1 ist der Fluss der täglichen Arbeit im Team — hier zählt, dass Arbeit fließt statt liegt.','Nicht mehr starten als fertig wird: WIP begrenzen macht den Engpass sichtbar.','Wartezeit ist der größte Hebel — die meiste Zeit liegt Arbeit, sie wird nicht bearbeitet.'],
        tEn:['Flight Level 1 is the flow of daily work in the team — what matters is that work flows instead of sitting.','Do not start more than you finish: limiting WIP makes the bottleneck visible.','Waiting time is the biggest lever — most of the time work sits idle, it is not being worked on.'],
        qDe:['Wo liegt gerade der größte Stau in unserem Fluss — und warum?','Woran erkennen wir, dass ein Ticket „wartet" statt „bearbeitet wird"?','Welches WIP-Limit trauen wir uns als nächstes zu senken?'],
        qEn:['Where is the biggest queue in our flow right now — and why?','How do we tell that a ticket is "waiting" rather than "being worked on"?','Which WIP limit do we dare to lower next?'] },
      2:{ de:'Flight Level 2 · Koordination', en:'Flight Level 2 · Coordination',
        tDe:['Flight Level 2 macht die Abhängigkeiten ZWISCHEN den Teams sichtbar — nicht die Arbeit in den Teams.','Ein Programm-Board koordiniert den Fluss der wichtigsten Themen, nicht jedes einzelne Ticket.','Löst nicht die lauteste Abhängigkeit zuerst, sondern die, die den größten Wertfluss blockiert.'],
        tEn:['Flight Level 2 makes the dependencies BETWEEN teams visible — not the work inside teams.','A program board coordinates the flow of the most important topics, not every single ticket.','Do not solve the loudest dependency first, but the one blocking the biggest value flow.'],
        qDe:['Welche Abhängigkeit blockiert gerade den größten Wertfluss?','Koordinieren wir die richtigen Themen — oder nur die dringlichsten?','Wo entstehen Wartezeiten durch Übergaben zwischen Teams?'],
        qEn:['Which dependency is blocking the biggest value flow right now?','Are we coordinating the right topics — or just the most urgent?','Where do waiting times arise from handovers between teams?'] },
      3:{ de:'Flight Level 3 · Strategie', en:'Flight Level 3 · Strategy',
        tDe:['Flight Level 3 verbindet Strategie mit Umsetzung: Woran arbeiten wir — und warum genau das?','OKRs sind ein Fokus-Werkzeug, kein Reporting-Werkzeug: weniger, dafür ehrlich bewertete Key Results.','Fortschritt heißt Outcome, nicht Output — ein fertiges Feature ist noch kein erreichtes Ziel.'],
        tEn:['Flight Level 3 connects strategy with delivery: what are we working on — and why exactly this?','OKRs are a focus tool, not a reporting tool: fewer, but honestly rated key results.','Progress means outcome, not output — a finished feature is not yet an achieved goal.'],
        qDe:['Zahlt unsere laufende Arbeit messbar auf die Objectives ein?','Welche strategische Annahme testen wir gerade — und woran sehen wir, ob sie stimmt?','Messen wir Fortschritt an Ergebnissen (Outcome) oder nur an erledigten Features?'],
        qEn:['Does our current work measurably contribute to the objectives?','Which strategic assumption are we testing right now — and how will we know if it holds?','Do we measure progress by outcomes or just by finished features?'] }
    };

    function bar(level, lblDe, lblEn){
      level = Math.max(0, Math.min(3, level|0));
      const steps = STEPS.map((s,i)=>`<div class="kmmstep" style="${i<=level?'background:'+s.c:''}"></div>`).join('');
      const now = STEPS[level];
      return `<div class="kmmbar" onclick="pbKmm.open(${level})" title="${KT('Reifegrad-Details & Handlungsempfehlungen','Maturity details & recommendations')}">
        <span class="kmmlbl">${KT(lblDe||'Reifegrad','Maturity')}</span>
        <span class="kmmsteps">${steps}</span>
        <span class="kmmnow" style="color:${now.c}">ML${level} · ${KT(now.de,now.en)}</span>
        <span class="kmmhint">${KT('Details ↗','details ↗')}</span></div>`;
    }
    function open(level){
      level = Math.max(0, Math.min(3, level|0));
      close();
      const ov = document.createElement('div'); ov.className='kmmov'; ov.id='kmmOverlay';
      ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
      const levelsHtml = STEPS.map((s,i)=>{
        // Stufen-Check je Level: die Fragen, an denen man erkennt, ob man ML_i erreicht hat
        const chk = i>0 && CHECKS[i-1]
          ? `<details><summary>🧪 ${KT('Stufen-Check: Daran erkennt ihr ML'+i,'Level check: how you recognise ML'+i)}</summary>
             <ul class="kchk">${(EN()?CHECKS[i-1].qEn:CHECKS[i-1].qDe).map(q=>`<li>☐ ${q}</li>`).join('')}</ul></details>`
          : '';
        return `<div class="kmmlevel${i===level?' iscur':''}" style="border-left-color:${s.c}">
        <h3><span style="color:${s.c}">ML${i}</span> ${KT(s.de,s.en)} ${i===level?`<span class="youare">${KT('Ihr seid hier','You are here')}</span>`:''}
          <a class="ktheory" href="../kmm.html#ml${i}" target="_blank" rel="noopener">📖 ${KT('Theorie','theory')} ↗</a></h3>
        <div class="kd">${KT(s.dDe,s.dEn)}</div>${chk}</div>`;
      }).join('');
      const recs = (EN()?STEPS[level].nEn:STEPS[level].nDe).map(x=>`<li>${x}</li>`).join('');
      const nextBlock = level>=3
        ? `<div class="kmmnext"><h4>🏁 ${KT('Team-Fokus erreicht','Team focus reached')}</h4><ul>${recs}</ul></div>`
        : `<div class="kmmnext"><h4>➜ ${KT('Nächster Schritt: ML'+(level+1)+' – '+STEPS[level+1].de,'Next step: ML'+(level+1)+' – '+STEPS[level+1].en)}</h4><ul>${recs}</ul></div>`;
      // Selbst-Check-Assessment: Ziff stellt die Stufen-Fragen im Chat und ordnet ein
      const last = selfLoad();
      const lastChip = last ? `<span class="klast">${KT('Letztes Ergebnis','Last result')}: ML${last.lvl} · ${last.date}</span>` : '';
      const selfBlock = `<div class="kmmself">🧪 <b>${KT('Selbst-Check (≈ 3 Minuten):','Self-check (≈ 3 minutes):')}</b>
        ${KT('Ziff stellt euch die Stufen-Fragen und sagt euch, wo ihr steht — und was als Nächstes dran ist.','Ziff asks you the level questions and tells you where you stand — and what comes next.')} ${lastChip}<br>
        <a onclick="pbKmm.close(); if(window.pbFlow){ pbFlow.open(); setTimeout(function(){ pbFlow.quiz(); }, 250); }">${KT('Check mit Ziff starten','Start the check with Ziff')} →</a></div>`;
      // ML4–ML6 andeuten: neugierig machen — der Aufstieg ist Trainer-Territorium
      const teaseHtml = `<div style="margin-top:18px;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#8e44ad">
        ${KT('Und dahinter? Die Gipfel-Level','And beyond? The summit levels')}</div>` + TEASE.map(t=>`
        <div class="kmmtease">
          <h3><span style="color:${t.c}">ML${t.ml}</span> ${t.e} ${KT(t.de,t.en)}
            <span class="klock">🔒 ${KT('mit Trainer','with a trainer')}</span></h3>
          <div class="kd">${KT(t.dDe,t.dEn)} <a href="../kmm.html#ml${t.ml}" target="_blank" rel="noopener" style="color:#5e4db2;font-weight:700;text-decoration:none">${KT('Neugierig? Theorie','Curious? Theory')} ↗</a></div>
        </div>`).join('');
      const trainerBlock = `<div class="kmmtrainer">🧑‍🏫 <b>${KT('Vom Selbst-Check zur Expedition.','From self-check to expedition.')}</b>
        ${KT('Assessment im Team, Flow Review oder der Weg Richtung ML4? Hinter dem Cockpit stehen echte Kanban-Trainer & Flight-Levels-Coaches — sie begleiten euch auf die nächste Stufe.',
             'A team assessment, a flow review, or the climb toward ML4? Real Kanban trainers & Flight Levels coaches stand behind this cockpit — they guide you to the next level.')}
        <a href="https://vishnuartists.com" target="_blank" rel="noopener">${KT('Kontakt aufnehmen','Get in touch')} →</a></div>`;
      ov.innerHTML = `<div class="kmmmodal">
        <div class="kmmhead"><span class="kmmx" onclick="pbKmm.close()">✕</span>
          <h2>🪜 ${KT('Kanban Maturity Model','Kanban Maturity Model')}</h2>
          <div class="kmmsub">${KT('Wo steht dieses System — und was bringt euch aufs nächste Level? Assessment inklusive.','Where does this system stand — and what gets you to the next level? Assessment included.')}</div></div>
        <div class="kmmbody">${selfBlock}${levelsHtml}${nextBlock}${teaseHtml}${trainerBlock}
          <div style="margin-top:14px;text-align:center">
            <a onclick="pbKmm.close(); if(window.pbFlow) pbFlow.open('${(EN()?'How do we reach the next maturity level?':'Wie kommen wir aufs nächste Reife-Level?')}')"
               style="cursor:pointer;color:#0f2ec2;font-weight:700;font-size:13px">${KT('Frag Ziff dazu','Ask Ziff about this')} →</a>
          </div></div></div>`;
      document.body.appendChild(ov);
      document.addEventListener('keydown', escClose);
    }
    function escClose(e){ if(e.key==='Escape') close(); }
    function close(){ const o=document.getElementById('kmmOverlay'); if(o) o.remove(); document.removeEventListener('keydown', escClose); }

    // Flight-Levels-Coaching-Box (rotierender Tipp + Coaching-Frage). fl = 1|2|3
    function flBox(fl){
      const f = FL[fl]; if(!f) return '';
      const tips = EN()?f.tEn:f.tDe, qs = EN()?f.qEn:f.qDe;
      const i = Math.floor(Date.now()/86400000) % tips.length; // täglich rotierend, stabil pro Tag
      const q = qs[i % qs.length];
      return `<div class="flbox" data-fl="${fl}">
        <div class="flh">🎚️ ${KT(f.de,f.en)} · ${KT('Coaching','Coaching')}</div>
        <div class="flt">${tips[i]}</div>
        <div class="flq">💬 ${q}</div>
        <div class="flnext" onclick="pbKmm.rollFl(this)">${KT('Nächster Impuls ↻','Next prompt ↻')}</div></div>`;
    }
    let flRoll = 0;
    function rollFl(el){
      const box = el.closest('.flbox'); const fl = +box.dataset.fl; const f = FL[fl];
      const tips = EN()?f.tEn:f.tDe, qs = EN()?f.qEn:f.qDe;
      flRoll = (flRoll+1) % tips.length;
      box.querySelector('.flt').textContent = tips[flRoll];
      box.querySelector('.flq').textContent = '💬 ' + qs[flRoll % qs.length];
    }

    // Reifegrad aus den 9 Cockpit-Flow-Ampeln (FL1). assess = {tileId:{s}} oder {tileId:'green'}
    function levelFromCockpit(a){
      if(!a) return 1;
      const g = id => { const v=a[id]; const s=v&&v.s?v.s:v; return s; };
      const ok = s => s==='green'||s==='yellow';
      const good = s => s==='green';
      let lvl = 1; // Board existiert = sichtbar
      const wipOk = ok(g('wipcol'));
      const flowSignals = ['cfd','cvr','aging','floweff'].map(g);
      const flowOk = flowSignals.filter(ok).length >= 3;
      if (wipOk && flowOk) lvl = 2;                       // WIP limitiert + Fluss gesteuert
      const predictable = good(g('scatter')) && ok(g('through')) && (g('due')==='green'||g('due')==='grey');
      if (lvl===2 && predictable) lvl = 3;                // vorhersagbar = Fit-for-Purpose
      return lvl;
    }

    window.pbKmm = { bar, open, close, flBox, rollFl, levelFromCockpit,
      levels:STEPS.length, STEPS, CHECKS, TEASE, selfLoad, selfSave };
  })();
  /* Seite benachrichtigen, dass window.pbKmm jetzt bereit ist (Reife-Balken nachrendern). */
  if (typeof window.pbKmmReady === 'function') { try { window.pbKmmReady(); } catch(e){ console.error('pbKmmReady:', e); } }

  /* ============================================================
     KI Flow Manager — Frage-Antwort-Tool in Benedikts Stimme.
     Zugleich Marketing-Instrument (Flow Reviews / FL-Coaching mit Benedikt).
     Regelbasierte Wissensbasis (Flight Levels, Kanban, OKR, Flow).
     Integriert in Coach-Panel + KMM-Modal.
     ============================================================ */
  (function(){
    const fmCss=document.createElement('style');
    fmCss.textContent=`
    .fmov{position:fixed;inset:0;z-index:210;background:rgba(6,8,20,.55);display:flex;align-items:flex-end;justify-content:flex-end;padding:0}
    .fm{background:#fff;width:430px;max-width:96vw;height:100vh;max-height:100vh;display:flex;flex-direction:column;
      font-family:'Porsche Next','Arial Narrow',Arial,sans-serif;box-shadow:-8px 0 40px rgba(0,0,0,.3)}
    .fm .fmh{background:linear-gradient(135deg,#1a44ea,#0f2ec2);color:#fff;padding:16px 20px;position:relative}
    .fm .fmh h3{margin:0;font-size:16px;display:flex;align-items:center;gap:8px}
    .fm .fmh .s{font-size:11.5px;opacity:.9;margin-top:2px}
    .fm .fmh .x{position:absolute;right:14px;top:14px;cursor:pointer;font-size:20px;opacity:.85}
    .fm .fmlog{flex:1;overflow:auto;padding:16px;background:#f7f9fe;display:flex;flex-direction:column;gap:12px}
    .fm .msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:13px;line-height:1.55;color:#1c1e21}
    .fm .msg.bot{background:#fff;border:1px solid #e3e8f5;border-bottom-left-radius:4px;align-self:flex-start}
    .fm .msg.me{background:#1a44ea;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
    .fm .msg.bot b{color:#0f2ec2}
    /* Seiten definieren teils eigene .cta-Buttons (weiss auf blau) — hier alles explizit setzen */
    .fm .cta{display:block;margin:8px 0 0;background:#edf9f1;border-left:3px solid #36b37e;border-radius:8px;padding:8px 10px;font-size:12px;color:#1c3d2b;font-weight:400;cursor:auto}
    .fm .cta a{color:#006644;font-weight:700;text-decoration:none}
    .fm .crit{margin-top:8px;font-size:12.5px;color:#0f2ec2;font-weight:600}
    .fm .chips{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px;background:#fff;border-top:1px solid #eef}
    .fm .chip{border:1px solid #d8d8db;border-radius:14px;padding:5px 11px;font-size:11.5px;cursor:pointer;background:#f7f9fe;color:#0f2ec2;font-weight:600}
    .fm .chip:hover{border-color:#1a44ea}
    .fm .fmin{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #eef;background:#fff}
    .fm .fmin input{flex:1;padding:10px 12px;border:1px solid #d8d8db;border-radius:10px;font-family:inherit;font-size:13px}
    .fm .fmin button{background:#1a44ea;color:#fff;border:none;border-radius:10px;padding:0 16px;font-weight:700;cursor:pointer;font-family:inherit}
    .fm .fmtabs{display:flex;gap:6px;margin-top:10px}
    .fm .fmtab{font-size:11.5px;font-weight:700;padding:5px 12px;border-radius:14px;cursor:pointer;background:rgba(255,255,255,.16);color:#fff;user-select:none}
    .fm .fmtab.act{background:#fff;color:#0f2ec2}
    /* Kanban-Coach eingebettet als Tab: fixe Panel-Optik der Standalone-Version neutralisieren */
    .fm .pbcoach{position:static;display:none;width:auto;max-width:none;max-height:none;border:0;border-radius:0;box-shadow:none;flex:1;overflow:auto;padding:16px 20px}
    .fm .pbcoach .close{display:none}
    .fmfab{position:fixed;right:22px;bottom:22px;width:52px;height:52px;border-radius:50%;z-index:80;background:linear-gradient(135deg,#16181b,#2c3138);
      color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;letter-spacing:.5px;cursor:pointer;
      box-shadow:0 4px 14px rgba(15,16,16,.28);user-select:none;border:2px solid rgba(255,255,255,.12);transition:.15s}
    .fmfab:hover{transform:scale(1.06)}
    @media(max-width:520px){.fm{width:100vw}}`;
    document.head.appendChild(fmCss);

    const EN=()=>localStorage.getItem('vsLang')==='en';
    const F=(de,en)=>EN()?en:de;
    const MAIL='mailto:benedikt.irsch@gmail.com?subject=Flow%20Review%20Anfrage';
    // Mentor-Impulse (rotierend) — internes Team-Cockpit: keine Werbung, sondern Nudges in die eigenen Meetings
    const CTAS=[
      ()=>F(`<b>Mentor-Impuls:</b> Nimm genau diese Frage mit in die nächste Weekly Flow Review — und lass das Team erst raten, bevor ihr die Zahl aufdeckt.`,
            `<b>Mentor nudge:</b> take exactly this question into the next weekly flow review — and let the team guess before you reveal the number.`),
      ()=>F(`<b>Mentor-Impuls:</b> Wer coacht, muss es selbst können: erklär mir das Prinzip in einem Satz, ohne Fachbegriff. Klappt das nicht, sitzt es noch nicht.`,
            `<b>Mentor nudge:</b> coaches must be able to do it themselves: explain the principle to me in one sentence without jargon. If you can't, it hasn't landed yet.`),
      ()=>F(`<b>Mentor-Impuls:</b> Schau ins Aging Board, bevor du antwortest — welches eine Ticket würde ein Kunde heute von euch fertig sehen wollen?`,
            `<b>Mentor nudge:</b> look at the aging board before you answer — which single ticket would a customer want to see finished today?`),
      ()=>F(`<b>Mentor-Impuls:</b> Sag <b>„Challenge“</b> — ich stelle dir eine Wissensfrage zu euren echten Zahlen. Richtige Antworten bringen XP.`,
            `<b>Mentor nudge:</b> say <b>"challenge"</b> — I'll ask you a knowledge question about your real numbers. Correct answers earn XP.`)
    ];
    let ctaIx=0; const nextCta=()=>{ const c=CTAS[ctaIx%CTAS.length](); ctaIx++; return c; };

    // Wissensbasis: keyword-matched. Antworten in „Ich baue das"-Stimme.
    const KB=[
      // Erschaffer/Autorschaft NUR auf Nachfrage nennen (kommt zuerst, damit die Frage sicher greift)
      {k:['wer hat dich gebaut','wer steckt dahinter','wer bist du','wer macht das','wer hat das gebaut','wer hat das gemacht','dein erschaffer','wer ist dahinter','von wem','wer betreibt','who built you','who made you','who is behind','who built this','who created'],
        a:F(`Gebaut und mit Coaching-Wissen gefüttert hat mich <b>Benedikt Irsch</b> — Flight Level Coach und Kanban-Trainer bei Vishnu Artists. Dieses Cockpit ist seine Arbeit; es gibt es auch als Produkt von <a href="https://vishnu-artists.de" target="_blank">vishnuartists.com</a>. Wenn ihr sowas oder ein Flow Review wollt: <a href="${MAIL}">kurz melden</a>.`,
             `I was built and fed with coaching knowledge by <b>Benedikt Irsch</b> — Flight Levels coach and Kanban trainer at Vishnu Artists. This cockpit is his work; it's also available as a product from <a href="https://vishnu-artists.de" target="_blank">vishnuartists.com</a>. If you'd like something like this or a flow review: <a href="${MAIL}">get in touch</a>.`),
        c:false, q:F('Und — wo klemmt es bei euch gerade am meisten?','So — where does it stick most for you right now?')},
      {k:['flight level','flightlevel','fl1','fl2','fl3','was ist flight','flight levels'],
        a:F(`Flight Levels sind kein Org-Modell, sondern eine <b>Denkbrille</b>: <b>FL1</b> = operativer Flow im Team, <b>FL2</b> = Koordination zwischen Teams, <b>FL3</b> = Strategie (woran arbeiten wir & warum). Der Trick: nicht überall gleichzeitig verbessern, sondern dort, wo der größte Hebel ist.`,
             `Flight Levels aren't an org model but a <b>thinking lens</b>: <b>FL1</b> = operational flow in the team, <b>FL2</b> = coordination between teams, <b>FL3</b> = strategy (what we work on & why). The trick: don't improve everywhere at once, but where the biggest lever is.`),
        c:true, q:F('Auf welchem Flight Level tut es bei euch gerade am meisten weh — Team-Flow, Koordination oder Strategie?','On which flight level does it hurt most for you right now — team flow, coordination or strategy?')},
      {k:['wip','limit','parallel','zu viel','multitasking'],
        a:F(`WIP begrenzen ist der wirksamste Hebel überhaupt. <b>Little's Law:</b> je mehr parallel offen ist, desto länger dauert <i>alles</i>. Nicht mehr starten als fertig wird — das macht Engpässe sichtbar, statt sie zu verstecken.`,
             `Limiting WIP is the single most effective lever. <b>Little's Law:</b> the more open in parallel, the longer <i>everything</i> takes. Don't start more than you finish — that surfaces bottlenecks instead of hiding them.`),
        c:true, q:F('Wie viele Dinge hat euer Team gerade wirklich gleichzeitig offen — und welches davon würdet ihr als erstes fertigmachen?','How many things does your team really have open in parallel right now — and which one would you finish first?')},
      {k:['dependenc','abhäng','koordination','blockiert','warten auf','übergabe'],
        a:F(`Abhängigkeiten sind FL2-Thema. Wichtig: nicht die <i>lauteste</i> zuerst lösen, sondern die, die den <b>größten Wertfluss blockiert</b>. Ein Programm-Board macht genau das sichtbar — die roten Sticky-Notes zeigen, wo es hakt.`,
             `Dependencies are an FL2 topic. Key: don't solve the <i>loudest</i> first, but the one blocking the <b>biggest value flow</b>. A program board makes exactly that visible — the red stickies show where it's stuck.`),
        c:true, q:F('Welche eine Abhängigkeit würde, gelöst, bei euch am meisten Fluss freisetzen?','Which single dependency, if resolved, would free up the most flow for you?')},
      {k:['okr','outcome','output','strategie','ziel','objective','key result'],
        a:F(`OKRs sind ein <b>Fokus</b>-Werkzeug, kein Reporting-Werkzeug. Weniger, dafür ehrlich bewertete Key Results. Und: Fortschritt heißt <b>Outcome</b>, nicht Output — ein fertiges Feature ist noch kein erreichtes Ziel.`,
             `OKRs are a <b>focus</b> tool, not a reporting tool. Fewer, but honestly rated key results. And: progress means <b>outcome</b>, not output — a finished feature is not yet an achieved goal.`),
        c:true, q:F('Zahlt eure laufende Arbeit gerade messbar auf ein Objective ein — oder arbeitet ihr an dem, was zufällig oben auf dem Stapel lag?','Does your current work measurably contribute to an objective — or are you working on whatever happened to be on top of the pile?')},
      {k:['reife','maturity','kmm','level','besser werden','nächstes level'],
        a:F(`Das Kanban Maturity Model geht von ML0 (Personal Kanban, Helden) über ML1 (Team sichtbar), ML2 (WIP limitiert, Fluss gesteuert) bis ML3 (Fit-for-Purpose, vorhersagbar) — und dahinter warten ML4–ML6, das Trainer-Gelände. Sag <b>„Selbst-Check"</b>, dann stelle ich euch die Stufen-Fragen und ordne euch ein. Die Theorie zu jedem Level: <a href="../kmm.html" target="_blank" rel="noopener">KMM-Hintergrundseiten</a>.`,
             `The Kanban Maturity Model goes from ML0 (personal kanban, heroes) via ML1 (team visible), ML2 (WIP limited, flow managed) to ML3 (fit-for-purpose, predictable) — and beyond that wait ML4–ML6, trainer terrain. Say <b>"self-check"</b> and I'll ask you the level questions and place you. The theory for each level: <a href="../kmm.html" target="_blank" rel="noopener">KMM background pages</a>.`),
        c:false, q:F('Bereit für den Selbst-Check — oder direkt ein Team-Assessment mit Kanban-Trainer anfragen?','Ready for the self-check — or request a team assessment with a Kanban trainer directly?')},
      {k:['kadenz','meeting','interaktion','standup','review','replenishment','cadence'],
        a:F(`Agile Interaktionen = die richtigen Gespräche in der richtigen Kadenz. Replenishment (was ziehen wir rein?), Flow-Review (wo steht's?), Delivery. Ziel: <b>weniger, aber wirksamere</b> Meetings, an denen Entscheidungen fallen.`,
             `Agile interactions = the right conversations at the right cadence. Replenishment (what do we pull in?), flow review (where do we stand?), delivery. Goal: <b>fewer but more effective</b> meetings where decisions are made.`),
        c:true, q:F('Welches eurer Meetings würdet ihr streichen, wenn ihr müsstet — und was fehlt euch stattdessen?','Which of your meetings would you cut if you had to — and what do you miss instead?')},
      {k:['anfangen','starten','wie beginnen','erste schritt','wo anfangen'],
        a:F(`Immer bei der <b>Sichtbarkeit</b>: ein gemeinsames Board, ALLE Arbeit drauf, Blocker markiert. Klingt banal, ist aber der Moment, in dem ein Team zum ersten Mal seinen echten Fluss sieht. Alles andere baut darauf auf.`,
             `Always with <b>visibility</b>: one shared board, ALL work on it, blockers marked. Sounds trivial, but it's the moment a team first sees its real flow. Everything else builds on that.`),
        c:false, q:F('Ist bei euch gerade WIRKLICH alle Arbeit auf einem Board sichtbar — auch das, was „nebenbei" läuft?','Is ALL your work really visible on one board right now — including the stuff running "on the side"?')},
      {k:['vorhersag','predict','wann fertig','forecast','sle','durchlaufzeit','lead time'],
        a:F(`Vorhersagbarkeit kommt nicht aus Schätzungen, sondern aus <b>Daten</b>: eure eigene Durchlaufzeit-Verteilung. „85 % unserer Tickets sind in X Tagen fertig" ist ein Versprechen, das man halten kann — eine Schätzung nicht.`,
             `Predictability doesn't come from estimates but from <b>data</b>: your own lead-time distribution. "85% of our tickets finish within X days" is a promise you can keep — an estimate isn't.`),
        c:true, q:F('Kennt ihr eure 85-%-Durchlaufzeit — oder schätzt ihr noch?','Do you know your 85% lead time — or are you still estimating?')}
    ];
    const FALLBACK={
      a:F(`Gute Frage — und als Mentor gebe ich dir keine fertige Antwort, sondern die passende Rückfrage. Zu <b>Flight Levels, WIP, Abhängigkeiten, OKRs, Reifegrad, Kadenzen und Vorhersagbarkeit</b> kann ich sofort sparren; sag <b>„Challenge“</b>, wenn du dein Wissen testen willst.`,
           `Good question — and as a mentor I won't hand you a ready answer but the right question back. On <b>flight levels, WIP, dependencies, OKRs, maturity, cadences and predictability</b> I can spar right away; say <b>"challenge"</b> to test your knowledge.`),
      c:true, q:F('Was davon brennt bei euch gerade am meisten?','Which of those is most burning for you right now?')};

    function match(text){
      const t=(text||'').toLowerCase();
      for(const e of KB){ if(e.k.some(kw=>t.includes(kw))) return e; }
      return FALLBACK;
    }
    function botMsg(entry){
      let html=`<div class="msg bot">${entry.a}`;
      if(entry.c) html+=`<div class="cta">${nextCta()}</div>`;
      if(entry.q) html+=`<div class="crit">↳ ${entry.q}</div>`;
      html+=`</div>`;
      return html;
    }
    function push(html){ const log=document.getElementById('fmLog'); if(!log) return; log.insertAdjacentHTML('beforeend',html); log.scrollTop=log.scrollHeight; }
    function ask(text){ if(!text||!text.trim())return; text=text.trim();
      push(`<div class="msg me">${text.replace(/</g,'&lt;')}</div>`);
      // Reifegrad-Selbst-Check: Stufen-Fragen kommen deterministisch aus pbKmm.CHECKS
      if(/selbst.?check|self.?check|reifegrad.?check|maturity.?check|stufen.?check|assessment/i.test(text)){ setTimeout(quiz,180); return; }
      if(/challenge|wissen.?test|quiz|frag mich ab|teste mich|test me|herausford/i.test(text)){ setTimeout(challenge,180); return; }
      // Diagramm-Freigabe: rein lokal (das Cockpit meldet sich über window.fcChartGate an)
      if(/frei ?schalt|freigeb|entsperr|unlock|aufklappen|zugeklappt|alle diagramme/i.test(text)){ setTimeout(chartCard,180); return; }
      setTimeout(()=>push(botMsg(match(text))),180); }
    window.pbFlowAsk=ask;

    /* ---------- Ziffs gefuehrter Reifegrad-Check (Stufen-Checks aus pbKmm.CHECKS) ----------
       Adaptiv: erst die ML1-Fragen; ist eine Stufe zu >= 75 % erfuellt, geht es eine hoeher.
       Ergebnis = hoechste bestandene Stufe + naechste Schritte + Theorie-Link + Coach-CTA. */
    const QZ={on:false,tr:0,qi:0,score:0};
    function quiz(){
      if(!window.pbKmm||!pbKmm.CHECKS){ push(botMsg(FALLBACK)); return; }
      QZ.on=true; QZ.tr=0; QZ.qi=0; QZ.score=0;
      push(`<div class="msg bot">🧪 <b>${F('Reifegrad-Selbst-Check','Maturity self-check')}</b> — ${F('ich stelle euch die Stufen-Fragen aus dem Kanban Maturity Model. Antworte ehrlich fürs Team, nicht fürs Wunschbild — der Check zeigt nur, wo es stockt.','I\'ll ask you the level questions from the Kanban Maturity Model. Answer honestly for the team, not for the ideal picture — the check only shows where things stall.')}</div>`);
      quizQ();
    }
    function quizQ(){
      const C=pbKmm.CHECKS[QZ.tr]; const qs=EN()?C.qEn:C.qDe;
      push(`<div class="msg bot" data-qz="1">🧪 <b>ML${C.to}-Check ${QZ.qi+1}/${qs.length}</b><br>${qs[QZ.qi]}
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        <span class="chip" onclick="pbFlow.quizA(1,this)">✅ ${F('Ja','Yes')}</span>
        <span class="chip" onclick="pbFlow.quizA(.5,this)">🌓 ${F('Teils','Partly')}</span>
        <span class="chip" onclick="pbFlow.quizA(0,this)">❌ ${F('Nein','No')}</span>
        <span class="chip" onclick="pbFlow.quizX(this)" style="opacity:.65">⏹ ${F('Abbrechen','Stop')}</span></div></div>`);
    }
    function quizA(v,el){
      if(!QZ.on) return;
      if(el){ const m=el.closest('.msg'); if(!m||m.dataset.done) return; m.dataset.done='1';
        m.querySelectorAll('.chip').forEach(c=>c.remove()); }
      QZ.score+=v; QZ.qi++;
      const C=pbKmm.CHECKS[QZ.tr]; const n=C.qDe.length;
      if(QZ.qi<n){ quizQ(); return; }
      const passed = QZ.score >= n*0.75;
      if(passed && QZ.tr<pbKmm.CHECKS.length-1){
        push(`<div class="msg bot">✔️ <b>ML${C.to}</b> ${F('sitzt — weiter geht\'s eine Stufe höher.','is solid — moving one level up.')}</div>`);
        QZ.tr++; QZ.qi=0; QZ.score=0; quizQ(); return;
      }
      quizEnd(passed ? C.to : C.to-1);
    }
    function quizX(el){
      if(el){ const m=el.closest('.msg'); if(m){ m.dataset.done='1'; m.querySelectorAll('.chip').forEach(c=>c.remove()); } }
      QZ.on=false;
      push(`<div class="msg bot">${F('Kein Problem — der Check wartet. Starte ihn jederzeit neu über den Chip „Reifegrad-Selbst-Check".','No problem — the check will wait. Restart it any time via the "maturity self-check" chip.')}</div>`);
    }
    function quizEnd(lvl){
      QZ.on=false; pbKmm.selfSave(lvl);
      const S=pbKmm.STEPS[lvl];
      const recs=(EN()?S.nEn:S.nDe).map(x=>`<li>${x}</li>`).join('');
      const dots=pbKmm.STEPS.map((s,i)=>`<span style="display:inline-block;width:22px;height:9px;border-radius:5px;margin-right:3px;background:${i<=lvl?s.c:'#ebecf0'}"></span>`).join('');
      const tease = lvl>=3 && pbKmm.TEASE ? `<div style="margin-top:8px;font-size:12px">🛡️ ${F('Dahinter wartet <b>ML4 – Risk-Hedged</b>: forecasten mit Wahrscheinlichkeiten statt Terminen. Dieses Gelände geht man mit Trainer.','Beyond this waits <b>ML4 – Risk-Hedged</b>: forecasting with probabilities instead of deadlines. That terrain is walked with a trainer.')}</div>` : '';
      push(`<div class="msg bot"><b>${F('Euer Selbstbild','Your self-image')}: ML${lvl} · ${F(S.de,S.en)}</b><br>
        <span style="display:inline-block;margin:6px 0">${dots}</span><br>
        ${F(S.dDe,S.dEn)}
        <div style="margin-top:8px"><b>➜ ${F('Das bringt euch weiter','This moves you forward')}:</b><ul style="margin:4px 0 0;padding-left:18px;line-height:1.6">${recs}</ul></div>
        ${tease}
        <div class="cta">📖 <a href="../kmm.html#ml${lvl}" target="_blank" rel="noopener">${F('Die Theorie zu eurem Level','The theory behind your level')} ↗</a> ·
          🧑‍🏫 ${F('Fürs echte Assessment im Team:','For the real team assessment:')} <a href="${MAIL}">${F('Flow Review mit Kanban-Trainer anfragen','request a flow review with a Kanban trainer')} →</a></div>
        <div class="crit">🤔 ${F('Welche der offenen Fragen würde euch am meisten Fluss bringen, wenn ihr sie diese Woche angeht?','Which of the open questions would bring you the most flow if you tackled it this week?')}</div></div>`);
    }

    /* ---------- Ziffs Wissens-Challenge (Mentor-Coach) ----------
       Fragen mit 3 Optionen — teils statisch, teils aus den ECHTEN Team-Zahlen des Cockpits (REAL/RAW/computeAssess).
       Richtige Antwort = +10 XP (pAddXp der persoenlichen Uebersicht), danach immer eine Rueckfrage in Mentor-Ton.
       Laeuft rein lokal (keine KI, kein Backend). */
    const CH={on:false,ix:-1,streak:0,seen:[],q:null};
    function chNum(){ try{ const R=(typeof REAL!=='undefined'&&REAL)?REAL:null; if(!R)return null;
      const A=(typeof computeAssess==='function')?computeAssess('gesamt',R):{};
      const wip=R.kw||0, done=R.kt||0, weeks=Math.max(1,Math.round((+TO-+FROM)/(7*86400000)));
      const tp=Math.max(0.1,Math.round(done/weeks*10)/10);
      return {wip,done,weeks,tp,ll:Math.round(wip/tp*10)/10,p50:R.p50,p85:R.p85,blk:R.kb||0,fe:R.fe,red:Object.keys(A).filter(k=>A[k]&&A[k].s==='red').length};
    }catch(e){return null;} }
    const CHQ=[
      // Funktion(n) -> [frage, [[option,richtig?],…], erklaerung, rueckfrage] — n = Zahlenobjekt oder null
      n=>n&&[F(`Euer WIP liegt bei <b>${n.wip}</b>, ihr schließt ca. <b>${n.tp}</b> Tickets pro Woche ab. Was sagt Little’s Law über die zu erwartende Durchlaufzeit?`,`Your WIP is <b>${n.wip}</b>, you finish about <b>${n.tp}</b> tickets per week. What does Little’s Law say about the expected lead time?`),
        [[`≈ ${n.ll} `+F('Wochen','weeks'),1],[`≈ ${Math.round(n.tp*n.wip)} `+F('Wochen','weeks'),0],[F('Kann man ohne Schätzungen nicht wissen','Cannot be known without estimates'),0]],
        F(`Lead Time ≈ WIP ÷ Durchsatz = ${n.wip} ÷ ${n.tp} ≈ ${n.ll} Wochen. Nicht schneller arbeiten — weniger parallel öffnen.`,`Lead time ≈ WIP ÷ throughput = ${n.wip} ÷ ${n.tp} ≈ ${n.ll} weeks. Don’t work faster — open less in parallel.`),
        F('Welches eine Ticket würdet ihr morgen bewusst NICHT anfangen, um den WIP zu senken?','Which single ticket would you consciously NOT start tomorrow to lower WIP?')],
      n=>n&&n.p50!=null&&n.p85!=null&&n.p50>0&&[F(`Eure Lead Time: Median <b>${n.p50} T</b>, 85 % <b>${n.p85} T</b>. Was bedeutet der Faktor ${Math.round(n.p85/n.p50*10)/10} für eure Vorhersagbarkeit?`,`Your lead time: median <b>${n.p50} d</b>, 85% <b>${n.p85} d</b>. What does the factor ${Math.round(n.p85/n.p50*10)/10} mean for your predictability?`),
        [[F('Großer Faktor = breite Streuung = wenig vorhersagbar; das Versprechen ist der 85-%-Wert','Big factor = wide spread = little predictability; the promise is the 85% value'),1],[F('Der Median ist unser Versprechen an Kunden','The median is our promise to customers'),0],[F('Der Faktor ist egal, solange der Median klein ist','The factor doesn’t matter as long as the median is small'),0]],
        F('Vorhersagbar ist, wer verspricht, was in 85 % der Fälle hält — nicht den Glücksfall (Median). Faktor > 3 heißt: Langläufer entscheiden über euren Ruf.','Predictable is whoever promises what holds in 85% of cases — not the lucky case (median). Factor > 3 means: long runners decide your reputation.'),
        F('Was unterscheidet eure Langläufer von den schnellen Tickets — Größe, Warten oder Unklarheit?','What separates your long runners from the fast tickets — size, waiting or ambiguity?')],
      n=>n&&[F(`Bei euch sind gerade <b>${n.blk}</b> Tickets geblockt/wartend. Wo gehört ein Blocker im Daily hin?`,`Right now <b>${n.blk}</b> of your tickets are blocked/waiting. Where does a blocker belong in the daily?`),
        [[F('Ganz an den Anfang — Blocker zuerst, dann rechts nach links durchs Board','Right at the start — blockers first, then the board right to left'),1],[F('Ans Ende, wenn noch Zeit ist','At the end, if there is time'),0],[F('In den Chat, nicht ins Daily','Into chat, not the daily'),0]],
        F('Blocker kosten Kalenderzeit, die der Kunde erlebt. Zuerst sichtbar machen, dann gemeinsam auflösen — das ist Flow-Management.','Blockers cost calendar time the customer experiences. Make them visible first, then resolve together — that is flow management.'),
        F('Wer im Team hat heute die Macht, den ältesten Blocker aufzulösen — und weiß die Person das?','Who in the team has the power to resolve the oldest blocker today — and does that person know?')],
      n=>[F('Ein Kollege sagt: „Wir brauchen mehr Leute, dann wird alles schneller.“ Was antwortet ein Flow-Coach?','A colleague says: “We need more people, then everything gets faster.” What does a flow coach answer?'),
        [[F('Erst den WIP senken und Blocker lösen — mehr Leute erhöhen ohne Limit meist nur den WIP','Lower WIP and resolve blockers first — more people without limits mostly just raise WIP'),1],[F('Stimmt, Kapazität ist immer der Engpass','True, capacity is always the bottleneck'),0],[F('Mehr Story Points schätzen','Estimate more story points'),0]],
        F('Little’s Law kennt keine Teamgröße. Ohne WIP-Limit füllt zusätzliche Kapazität nur die Warteschlangen.','Little’s Law has no team size in it. Without WIP limits, extra capacity only fills the queues.'),
        F('Wo würdet ihr in eurem CFD zuerst hinschauen, um den echten Engpass zu finden?','Where in your CFD would you look first to find the real bottleneck?')],
      n=>[F('Was ist der Unterschied zwischen Flight Level 2 und Flight Level 3?','What is the difference between flight level 2 and flight level 3?'),
        [[F('FL2 = Koordination über Teams hinweg (Wer braucht was von wem?), FL3 = Strategie (Woran arbeiten wir überhaupt & warum?)','FL2 = coordination across teams (who needs what from whom?), FL3 = strategy (what do we work on at all & why?)'),1],[F('FL2 = Management, FL3 = Vorstand','FL2 = management, FL3 = board'),0],[F('FL2 = Scrum, FL3 = SAFe','FL2 = Scrum, FL3 = SAFe'),0]],
        F('Flight Levels sind Denkbrillen für Fluss, keine Hierarchie. Euer Tab „Flight Level 2+3“ zeigt genau das: Initiativen (FL2) unter strategischen Themen (FL3).','Flight Levels are thinking lenses for flow, not a hierarchy. Your “Flight level 2+3” tab shows exactly that: initiatives (FL2) under strategic themes (FL3).'),
        F('Wie viele eurer aktiven Tickets zahlen nachweislich auf eine Initiative ein — und was macht ihr mit dem Rest?','How many of your active tickets demonstrably contribute to an initiative — and what do you do with the rest?')],
      n=>[F('Flow Efficiency 20 % — was ist der größte Hebel?','Flow efficiency 20% — what is the biggest lever?'),
        [[F('Wartezeiten angreifen: Übergaben, Rückfragen, „liegt bei…“','Attack waiting time: hand-offs, queries, “sits with…”'),1],[F('Schneller tippen','Type faster'),0],[F('Mehr Tickets parallel starten, damit keiner wartet','Start more tickets in parallel so nobody waits'),0]],
        F('80 % der Zeit wartet das Ticket. Wer die Arbeit optimiert, gewinnt Minuten — wer das Warten optimiert, gewinnt Wochen.','80% of the time the ticket waits. Optimising the work gains minutes — optimising the waiting gains weeks.'),
        F('Welche Warteschlange in eurem Board hat gerade keinen Besitzer?','Which queue on your board currently has no owner?')],
      n=>[F('Was ist der Zweck eines Monte-Carlo-Forecasts?','What is the purpose of a Monte-Carlo forecast?'),
        [[F('Aus der eigenen Durchsatz-Historie Wahrscheinlichkeiten für „bis wann/wie viel“ ableiten — statt Schätzungen','Derive probabilities for “by when/how much” from your own throughput history — instead of estimates'),1],[F('Story Points genauer schätzen','Estimate story points more precisely'),0],[F('Die Velocity des Teams verdoppeln','Double the team’s velocity'),0]],
        F('Forecast = Wahrscheinlichkeit, kein Versprechen. „Mit 85 % sind 20 Tickets in 6 Wochen fertig“ ist ehrlich und belastbar.','Forecast = probability, not promise. “With 85% probability 20 tickets are done in 6 weeks” is honest and robust.'),
        F('Bei welcher Zusage im Team würdet ihr den 85-%-Wert statt des Bauchgefühls nehmen?','For which commitment in the team would you use the 85% value instead of gut feeling?')],
      n=>[F('Woran erkennst du im CFD einen Engpass?','How do you spot a bottleneck in the CFD?'),
        [[F('Ein Band wird breiter: Zufluss > Abfluss in dieser Stufe','A band widens: inflow > outflow at that stage'),1],[F('Die Done-Linie steigt','The done line rises'),0],[F('Alle Bänder sind gleich breit','All bands are equally wide'),0]],
        F('Breiter werdendes Band = wachsende Warteschlange. Genau dort WIP limitieren oder Kapazität verschieben.','A widening band = growing queue. Limit WIP right there or shift capacity.'),
        F('Und wenn das breite Band „Ready to pull“ ist — ist das ein Team- oder ein Priorisierungsproblem?','And if the wide band is “Ready to pull” — is that a team or a prioritisation problem?')],
      n=>[F('Kanban Maturity Model: Was unterscheidet ML2 von ML1?','Kanban Maturity Model: what separates ML2 from ML1?'),
        [[F('ML1 = Arbeit ist sichtbar; ML2 = Fluss wird aktiv gesteuert (WIP-Limits, Blocker, Kennzahlen)','ML1 = work is visible; ML2 = flow is actively managed (WIP limits, blockers, metrics)'),1],[F('ML2 hat mehr Meetings','ML2 has more meetings'),0],[F('ML2 braucht ein Tool','ML2 requires a tool'),0]],
        F('Sichtbar machen ist der Anfang, steuern ist der Sprung. Ohne Limits bleibt Kanban ein Board mit Post-its.','Making it visible is the start, managing it is the leap. Without limits Kanban stays a board with post-its.'),
        F('Habt ihr ein WIP-Limit, das euch letzte Woche wirklich einmal gebremst hat?','Do you have a WIP limit that actually stopped you once last week?')],
      n=>[F('Ein Ticket ist 120 Tage alt und niemand traut sich, es zu schließen. Mentor-Frage: Was tun?','A ticket is 120 days old and nobody dares to close it. Mentor question: what to do?'),
        [[F('Entscheiden: fertig machen, aufteilen oder bewusst schließen — Alter ist Risiko, kein Ehrenzeichen','Decide: finish, split or consciously close — age is risk, not a badge of honour'),1],[F('Liegen lassen, es tut ja niemandem weh','Leave it, it doesn’t hurt anyone'),0],[F('In den Backlog zurück ohne Kommentar','Back to the backlog without a note'),0]],
        F('Zombie-Tickets fressen Aufmerksamkeit und verzerren jede Kennzahl. Das Aging Board zeigt sie — die Entscheidung trifft das Team.','Zombie tickets eat attention and distort every metric. The aging board shows them — the team makes the decision.'),
        F('Wessen Zombie steht heute ganz rechts oben im Aging Board — und wer spricht es an?','Whose zombie is top right on the aging board today — and who raises it?')]
    ];
    function chXp(n){ try{ if(typeof USER!=='undefined'&&USER&&USER.name&&typeof pAddXp==='function'){pAddXp(USER.name,n); return true;} }catch(e){} return false; }
    function challenge(){
      const nums=chNum(); const cands=CHQ.map((f,i)=>{let q=null;try{q=f(nums);}catch(e){} return q?[i,q]:null;}).filter(Boolean);
      if(!cands.length){ push(botMsg(FALLBACK)); return; }
      let pool=cands.filter(c=>CH.seen.indexOf(c[0])<0); if(!pool.length){CH.seen=[];pool=cands;}
      const pick=pool[Math.floor(Math.random()*pool.length)]; CH.ix=pick[0]; CH.seen.push(pick[0]); CH.on=true; CH.q=pick[1];
      const opts=pick[1][1].map((o,i)=>[o,i]).sort(()=>Math.random()-.5);
      push(`<div class="msg bot" data-ch="1">🧠 <b>${F('Challenge','Challenge')} ${CH.seen.length}</b>${CH.streak?` · 🔥 ${CH.streak} ${F('in Folge','in a row')}`:''}<br>${pick[1][0]}
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
        ${opts.map(o=>`<span class="chip" style="text-align:left;white-space:normal" onclick="pbFlow.challengeA(${o[1]},this)">${o[0][0]}</span>`).join('')}
        <span class="chip" onclick="pbFlow.challengeX(this)" style="opacity:.65;align-self:flex-start">⏹ ${F('Später','Later')}</span></div></div>`);
    }
    function challengeA(i,el){
      if(!CH.on||!CH.q)return; const m=el?el.closest('.msg'):null; if(m&&m.dataset.done)return; if(m){m.dataset.done='1';m.querySelectorAll('.chip').forEach(c=>c.remove());}
      const q=CH.q, right=q[1][i][1]===1; CH.on=false;
      let head;
      if(right){ CH.streak++; const xp=chXp(10);
        head=`✅ <b>${F('Richtig','Correct')}${xp?' · +10 XP':''}.</b> ${CH.streak>=3?F('Das sitzt — du kannst es morgen im Daily erklären.','That has landed — you can explain it in tomorrow’s daily.'):F('Gut — aber Wissen zählt erst, wenn es im Board ankommt.','Good — but knowledge only counts once it reaches the board.')}`; }
      else { CH.streak=0; head=`❌ <b>${F('Nicht ganz.','Not quite.')}</b> ${F('Kein Drama — genau dafür bin ich da. Lies die Erklärung, dann frag ich anders.','No drama — that’s what I’m here for. Read the explanation, then I’ll ask differently.')}`; }
      push(`<div class="msg bot">${head}<div style="margin-top:6px">${q[2]}</div><div class="crit">↳ ${q[3]}</div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><span class="chip" onclick="pbFlow.challenge()">🧠 ${F('Nächste Challenge','Next challenge')}</span><span class="chip" onclick="pbFlow.ask('${F('Erklär mir das genauer','Explain that in more detail')}')">${F('Erklär mir das genauer','Explain in more detail')}</span></div></div>`);
    }
    function challengeX(el){ const m=el?el.closest('.msg'):null; if(m){m.dataset.done='1';m.querySelectorAll('.chip').forEach(c=>c.remove());} CH.on=false;
      push(`<div class="msg bot">${F('Gut — die Challenge wartet. Ein Mentor drängt nicht, er erinnert: sag „Challenge“, wenn du bereit bist.','Fine — the challenge waits. A mentor doesn’t push, he reminds: say “challenge” when you’re ready.')}</div>`); }

    const SUGG=[
      F('🧠 Challenge — teste dein Wissen','🧠 Challenge — test your knowledge'),
      F('🧪 Reifegrad-Selbst-Check','🧪 Maturity self-check'),
      F('Was sind Flight Levels?','What are flight levels?'),
      F('Warum WIP begrenzen?','Why limit WIP?'),
      F('Wie werden wir vorhersagbarer?','How do we become more predictable?'),
      F('Output vs. Outcome?','Output vs. outcome?'),
      F('Wie kommen wir aufs nächste Reife-Level?','How do we reach the next maturity level?')
    ];
    /* Diagramm-Freigabe aus dem Gespräch heraus. Das Cockpit meldet sich über
       window.fcChartGate an (Definition im Cockpit-HTML): Ziff sieht die zugeklappten
       Themen samt Ampel, gibt sie auf Klick frei und nennt dabei den Flow Coach. */
    function chartCard(){
      const G=window.fcChartGate;
      if(!G){ push(`<div class="msg bot">${F('Diagramme freischalten geht nur im Cockpit selbst — dort zeige ich dir, was zugeklappt ist.','Unlocking charts only works in the cockpit itself — there I will show you what is collapsed.')}</div>`); return; }
      const L=G.list(), lock=L.filter(x=>x.locked);
      if(!lock.length){ push(`<div class="msg bot">${F('Bei euch ist gerade nichts zugeklappt — alle Diagramme sind offen.','Nothing is collapsed right now — every chart is open.')}</div>`); return; }
      const dot=a=>a==='red'?'🔴':a==='yellow'?'🟡':a==='green'?'🟢':'⚪';
      push(`<div class="msg bot" style="max-width:95%"><b>🔓 ${F('Diagramme freischalten','Unlock charts')}</b>
        <div style="font-size:12px;line-height:1.55;margin:6px 0">${F('Die Startansicht zeigt bewusst nur vier Diagramme — nicht um etwas zu verstecken, sondern damit ihr nicht in Zahlen ertrinkt. Was du wirklich sehen willst, mache ich auf. Und wenn dich eine Auswertung beunruhigt: das ist ein Gesprächsanlass, keine Bewertung — hol dir kurz einen Flow Coach dazu.','The start view deliberately shows only four charts — not to hide anything, but so you do not drown in numbers. Whatever you really want to see, I will open. And if a chart worries you: it is a conversation starter, not a rating — bring in a flow coach.')}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${lock.map(x=>`<span class="chip" onclick="pbFlow.unlockChart('${x.id}')">${dot(x.ampel)} ${String(x.name).replace(/</g,'&lt;')}</span>`).join('')}
          <span class="chip" onclick="pbFlow.unlockChart('*')">${F('Alle öffnen','Open all')}</span></div>
        <div class="cta">🧑‍🏫 <a style="cursor:pointer" onclick="window.fcChartGate&&fcChartGate.coachMail('${F('Diagramme im Cockpit','Charts in the cockpit')}')">${F('Flow Coach dazuholen','Bring in a flow coach')} →</a></div></div>`);
    }
    function unlockChart(id){
      const G=window.fcChartGate; if(!G) return;
      if(id==='*'){ G.unlockAll(); return; }   /* schließt den Chat und zeigt alle Karten */
      G.unlock(id);                            /* schließt den Chat, scrollt zur Karte, Coach-Hinweis steht dort */
    }
    // Kanban-Coach als zweiter Tab (registriert sich weiter unten, wenn nicht per data-coach=off deaktiviert)
    let coachRender=null;
    function registerCoach(fn){ coachRender=fn; }
    function renderCoach(){ const c=document.getElementById('fmCoach'); if(c&&coachRender) coachRender(c); }
    function showTab(t){
      const ov=document.getElementById('fmOverlay'); if(!ov) return;
      ov.querySelectorAll('.fmtab').forEach(el=>el.classList.toggle('act', el.dataset.t===t));
      const coach = t==='coach';
      ['fmLog'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display=coach?'none':''; });
      ov.querySelectorAll('.chips,.fmin').forEach(el=>el.style.display=coach?'none':'');
      const c=document.getElementById('fmCoach'); if(c) c.style.display=coach?'block':'none';
      if(coach) renderCoach();
    }
    function open(seed, tab){
      if(document.getElementById('fmOverlay')){ showTab(tab||'chat'); if(seed) ask(seed); return; }
      const ov=document.createElement('div'); ov.className='fmov'; ov.id='fmOverlay';
      ov.addEventListener('click',e=>{ if(e.target===ov) close(); });
      const tabs = coachRender
        ? `<div class="fmtabs"><span class="fmtab act" data-t="chat" onclick="pbFlow.showTab('chat')">${F('Dialog','Dialogue')}</span>
           <span class="fmtab" data-t="coach" onclick="pbFlow.showTab('coach')">${F('Team-Status','Team status')}</span></div>`
        : '';
      ov.innerHTML=`<div class="fm">
        <div class="fmh"><span class="x" onclick="pbFlow.close()">✕</span>
          <h3>${window.pbBuddy?pbBuddy.avatar(30,pbBuddy.mood(),{accent:"#89c527",accentDim:"#4a5f2a"}):"Z"} Ziff · ${F('Mentor-Coach','Mentor coach')}</h3>
          <div class="s">${F('Fordert euer Wissen heraus — Flow, Flight Levels, Kanban. Keine fertigen Antworten, sondern die richtige Rückfrage.','Challenges your knowledge — flow, Flight Levels, Kanban. No ready-made answers, but the right question back.')}</div>
          ${tabs}</div>
        <div class="fmlog" id="fmLog"></div>
        <div class="chips">${SUGG.map(s=>`<span class="chip" onclick="pbFlow.ask('${s.replace(/'/g,"\\'")}')">${s}</span>`).join('')}</div>
        <div class="fmin"><input id="fmInput" placeholder="${F('Frag mich etwas zu Flow, Flight Levels, OKRs…','Ask me about flow, flight levels, OKRs…')}"
          onkeydown="if(event.key==='Enter'){pbFlow.ask(this.value);this.value='';}">
          <button onclick="var i=document.getElementById('fmInput');pbFlow.ask(i.value);i.value='';">➤</button></div>
        <div class="pbcoach" id="fmCoach"></div>
      </div>`;
      document.body.appendChild(ov);
      push(botMsg({a:F(`Ich bin <b>Ziff</b>, euer Mentor-Coach. Ihr seid alle Coaches — also behandle ich euch so: keine fertigen Antworten, sondern Rückfragen, Gegenbeispiele und Fragen zu <b>euren echten Zahlen</b>. Meine Regel: Wer es dem Team morgen im Daily erklären kann, hat es verstanden. Starte mit <b>🧠 Challenge</b> (Wissenstest, +10 XP je Treffer) oder dem <b>🧪 Reifegrad-Selbst-Check</b>.`,
        `I'm <b>Ziff</b>, your mentor coach. You are all coaches — so I treat you as such: no ready-made answers but questions back, counter-examples and questions about <b>your real numbers</b>. My rule: whoever can explain it to the team in tomorrow's daily has understood it. Start with <b>🧠 challenge</b> (knowledge test, +10 XP per hit) or the <b>🧪 maturity self-check</b>.`),
        c:false, q:F('Also — was glaubst du, ist gerade der größte Hebel in eurem Fluss? Ich prüfe deine These an den Daten.','So — what do you think is the biggest lever in your flow right now? I will test your thesis against the data.')}));
      /* Diagramm-Freigabe: nur im Cockpit, das sich über window.fcChartGate anmeldet. */
      if(window.fcChartGate){const ch=ov.querySelector('.chips');
        if(ch)ch.insertAdjacentHTML('beforeend','<span class="chip" onclick="pbFlow.charts()">🔓 '+F('Diagramme freischalten','Unlock charts')+'</span>');}
      if(tab==='coach') showTab('coach');
      if(seed) ask(seed);
      const inp=document.getElementById('fmInput'); if(inp&&tab!=='coach') setTimeout(()=>inp.focus(),60);
    }
    function openCoach(){ open(null,'coach'); }
    function close(){ const o=document.getElementById('fmOverlay'); if(o) o.remove(); }
    window.pbFlow={ open, openCoach, close, ask, showTab, registerCoach, quiz, quizA, quizX, challenge, challengeA, challengeX, charts: chartCard, unlockChart };

    /* ---------- Ziff montieren ----------
       Aussehen und Verhalten (Avatar, Ruhe-Modus, die eine Frage nach dem 3. Anmelden)
       kommen aus der geteilten Datei pb-buddy.js — sie wird vom Build aus der Porsche-
       Quelle kopiert, damit ein Feature dort automatisch auch hier ankommt. Hier steht
       nur, WER Ziff ist: Mentor-Coach, VA-Grün, und woher Stimmung und Frage kommen.
       Zahlen liefert die Cockpit-Seite selbst über window.pbFacts(). */
    function ziffFacts(){ try{ return (typeof window.pbFacts==='function') ? (window.pbFacts()||{}) : {}; }catch(e){ return {}; } }
    function ziffMood(){
      const f=ziffFacts(); let m='ok';
      const wk=f.done8w?f.done8w/8:0, inv=(wk>0&&f.wip!=null)?f.wip/wk:null;
      if(f.p50!=null&&f.p50>=20) m='warn';
      if(inv!=null&&inv>2) m='warn';
      if((f.p50!=null&&f.p50>=45)||(inv!=null&&inv>3.5)) m='alert';
      return m;
    }
    function ziffQuestion(){
      const f=ziffFacts();
      const wk=f.done8w?f.done8w/8:0, inv=(wk>0&&f.wip!=null)?f.wip/wk:null;
      const nz=n=>String(n).replace('.',',');
      if(inv!=null&&inv>2.5) return {
        t:F(`Ihr habt <b>${f.wip} Vorgänge</b> gleichzeitig offen — bei ~${Math.round(wk)} fertigen pro Woche rund <b>${nz(inv.toFixed(1))} Wochen Bestand</b>. Ihr seid Coaches: was würdet ihr einem Team dazu sagen?`,
             `You have <b>${f.wip} items</b> open in parallel — at ~${Math.round(wk)} finished per week that is about <b>${inv.toFixed(1)} weeks of inventory</b>. You are coaches: what would you tell a team about that?`),
        s:F(`Unser WIP liegt bei ${f.wip} — was heißt das für unseren Fluss?`,`Our WIP is ${f.wip} — what does that mean for our flow?`)};
      if(f.p50!=null&&f.p50>=20) return {
        t:F(`Jeder zweite Vorgang bei euch braucht <b>${f.p50} Tage</b>. Wo wartet die Arbeit — statt bearbeitet zu werden?`,
             `Every second item of yours takes <b>${f.p50} days</b>. Where does the work wait — instead of being worked on?`),
        s:F(`Unsere Lead Time p50 liegt bei ${f.p50} Tagen — woran liegt das?`,`Our lead time p50 is ${f.p50} days — what is behind that?`)};
      let lvl=null; try{ const sc=window.pbKmm&&pbKmm.selfLoad&&pbKmm.selfLoad(); lvl=sc?sc.lvl:null; }catch(e){}
      if(lvl==null) return {
        t:F(`Wir kennen uns jetzt ein bisschen. Wisst ihr eigentlich, wo ihr im Reifegrad steht? Der Selbst-Check dauert etwa 3 Minuten.`,
             `We know each other a little by now. Do you actually know where you stand in maturity? The self-check takes about 3 minutes.`),
        s:F('Selbst-Check','Self-check')};
      return {
        t:F(`Eine unbequeme: Was von dem, was ihr euren Teams empfehlt, macht ihr bei euch selbst <b>nicht</b>?`,
             `An uncomfortable one: what do you recommend to your teams that you do <b>not</b> do yourselves?`),
        s:F('Wie werden wir vorhersagbarer?','How do we become more predictable?')};
    }
    if (window.pbBuddy) {
      pbBuddy.mount({
        id:'ziff', name:'Ziff', accent:'#89c527', accentDim:'#4a5f2a',
        title:F('Ziff — Mentor-Coach · die Ampel zeigt den Zustand eurer Zahlen','Ziff — mentor coach · the traffic light shows the state of your numbers'),
        mood:ziffMood, question:ziffQuestion,
        open:seed=>open(seed), isOpen:()=>!!document.getElementById('fmOverlay'), close:close
      });
    } else {
      /* Notnagel, falls pb-buddy.js fehlt: der schlichte Knopf von früher */
      const fab=document.createElement('div'); fab.className='fmfab';
      fab.title=F('Ziff — Mentor-Coach: fordert euer Wissen heraus','Ziff — mentor coach: challenges your knowledge'); fab.textContent='Z';
      fab.addEventListener('click',()=>{ if(document.getElementById('fmOverlay')) close(); else open(); });
      if (document.querySelector('.fab')) fab.style.bottom='104px';
      document.body.appendChild(fab);
    }
  })();

  /* ---------- Persönlicher Kanban-Coach (auf ALLEN Seiten; ohne Datenmodell als Light-Version) ---------- */
  if (document.currentScript && document.currentScript.dataset.coach === 'off') return;

  function ciAll(){ try { return JSON.parse(localStorage.getItem('okrCheckins')||'{}'); } catch(e){ return {}; } }
  function coachTeam(){
    const a = vsAuth();
    return (a && a.team) || sessionStorage.getItem('pbCoachTeam') || sessionStorage.getItem('pbTeam') || 'analytics';
  }
  const LEVELS = [
    ['1 · Sichtbar','Arbeit ist sichtbar (Team-Frame/Board gepflegt)'],
    ['2 · Programm','Features auf dem Program Board platziert'],
    ['3 · Priorisiert + limitiert','WSJF gepflegt, WIP im Griff'],
    ['4 · Gemessen','Team-Dashboard mit Flow-Metriken live'],
    ['5 · Outcome','Regelmäßige OKR-Check-ins je KR']
  ];
  function maturity(teamId){
    const t = TEAMS.find(x=>x.id===teamId); if(!t) return null;
    const fk = teamFeatures(teamId);
    let pbPlaced = false;
    for (const b of Object.values(BOARDS)) for (const l of b.lanes) if (l.n===t.lane && l.f.length) pbPlaced = true;
    const stories = (typeof TSTORIES!=='undefined' && TSTORIES[teamId]) ? TSTORIES[teamId] : '';
    const wsjfOk = fk.filter(k=>FEAT[k]&&FEAT[k][2]!=null).length;
    const wsjfPct = fk.length ? wsjfOk/fk.length : 0;
    const impl = fk.filter(k=>FEAT[k]&&(FEAT[k][1]==='I'||FEAT[k][1]==='F')).length;
    const sets = OKRS.filter(o=>(o.teams||[]).includes(teamId));
    const ci = ciAll();
    const hasCi = sets.some(o=>o.krs.some(kr=>ci[o.id.replace(' ','')+'/'+kr[0]]));
    const crit = [
      fk.length>0 || !!stories,
      pbPlaced,
      fk.length>0 && wsjfPct>=0.8 && impl<=5,
      !!t.live,
      hasCi
    ];
    let level = 0; for (const c of crit) { if (c) level++; else break; }
    // Tipps: erste nicht erfüllte Kriterien, konkret
    const tips = [];
    if (!crit[0]) tips.push(['warn','Macht eure Arbeit sichtbar','Noch keine Features/Stories im Team-Frame des PI-Boards. Startet mit dem Iteration-Plan im Miro-Team-Frame.']);
    if (!crit[1]) tips.push(['warn','Aufs Program Board damit!','Eure Features stehen nur im Team-Frame — zieht sie in die '+t.lane+'-Lane des Program-Board-Frames. Erst dann sieht der ART eure Abhängigkeiten (Flight Level 2).']);
    if (crit[1] && fk.length && wsjfPct<0.8) tips.push(['warn','WSJF-Lücken schließen','Nur '+Math.round(wsjfPct*100)+' % eurer Features haben einen WSJF-Score ('+(fk.length-wsjfOk)+' offen). Ohne Score keine ehrliche Priorisierung.']);
    if (crit[1] && impl>5) tips.push(['warn','WIP begrenzen','Ihr habt '+impl+' Features parallel in Arbeit. Little’s Law: mehr parallel = alles später fertig. Zielt auf ≤ 5 — Fokus aufs Fertigmachen.']);
    if (crit[2] && !t.live) tips.push(['','Team-Dashboard anbinden','Level 4 = Messen: Lead Time, WIP, Throughput, Flow Efficiency. Das Analytics-Team zeigt, wie es geht — gleiche Anbindung ans Jira-Board. <a href="cockpit.html">Cockpit ansehen →</a>']);
    if (crit[3] && !hasCi) tips.push(['','OKR-Check-ins starten','Level 5 = Outcome steuern: bewertet eure KRs regelmäßig (Ampel + %). <a href="programmboard.html#okr">Zum Check-in →</a>']);
    if (!tips.length) tips.push(['ok','Stark — Level 5 erreicht','Haltet den Takt: wöchentliche Check-ins, Forecasts aus Lead-Time-Daten statt Schätzungen, und teilt eure Praktiken mit den anderen Teams.']);
    // Immer: ein positiver + nächster Schritt
    const done = fk.filter(k=>FEAT[k]&&FEAT[k][1]==='D').length;
    if (done>0 && tips.length<3) tips.push(['ok','Läuft','Schon '+done+' Feature'+(done>1?'s':'')+' im PI erledigt — Outcome zeigen und feiern (Business-Owner-Review).']);
    return {t, level, tips: tips.slice(0,3), fk, wsjfPct, impl, hasCi};
  }
  function coachHtml(){
    if (!HAS_DATA) {
      // Light-Version (Seiten ohne pb-data, z. B. Cockpit/Hilfe)
      let idea = '';
      try { const log = JSON.parse(localStorage.getItem('vsAwarenessLog')||'[]');
        const li = [...log].reverse().find(l=>l.idea);
        if (li) idea = `<div class="tip ok"><b>💡 Deine Superpower/Idee (${li.date})</b>„${li.idea}" — schon einer Person erzählt?</div>`; } catch(e){}
      return `<span class="close" id="pbCoachClose">✕</span>
      <h3>🧭 Dein Kanban-Coach</h3>
      <div class="sub">Reifegrad-Leiter (Kanban Maturity) — die Team-Analyse lebt im Portal.</div>
      <div class="lvl">${LEVELS.map(l=>`<div title="${l[1]}">${l[0]}</div>`).join('')}</div>
      <div class="tip"><b>Wo steht dein Team?</b>Level, Tipps und nächste Schritte je Team findest du im
      <a href="programmboard.html#team">Team-Bereich</a> oder auf der <a href="index.html">Portal-Startseite</a>.</div>
      ${idea}
      <div style="margin:10px 0 4px"><a onclick="if(window.pbFlow) pbFlow.open()" style="cursor:pointer;display:inline-block;background:linear-gradient(135deg,#5e4db2,#1a44ea);color:#fff;border-radius:10px;padding:8px 14px;font-weight:700;font-size:12.5px;text-decoration:none">🧠 Ziff (Mentor-Coach) fragen</a></div>
      <div class="score">Level 1 Sichtbar → 2 Programm → 3 Priorisiert+limitiert → 4 Gemessen → 5 Outcome.</div>`;
    }
    const teamId = coachTeam();
    const m = maturity(teamId);
    if (!m) return '<div>Team nicht gefunden.</div>';
    const a = vsAuth();
    const lvlHtml = LEVELS.map((l,i)=>`<div class="${i<m.level?'done':i===m.level?'now':''}" title="${l[1]}">${l[0]}</div>`).join('');
    const opts = TEAMS.map(t=>`<option value="${t.id}"${t.id===teamId?' selected':''}>${t.n}</option>`).join('');
    return `<span class="close" id="pbCoachClose">✕</span>
    <h3>🧭 Dein Kanban-Coach</h3>
    <div class="sub">${a&&a.team?'Angemeldet als '+((TEAMS.find(x=>x.id===a.team)||{}).n||a.u):'Demo — Team frei wählbar'} · Reifegrad-Leiter (Kanban Maturity)</div>
    ${a&&a.team?'':`<select id="pbCoachTeam">${opts}</select>`}
    <div class="lvl">${lvlHtml}</div>
    <div class="sub"><b>${m.t.n}</b> steht auf <b>Level ${Math.max(1,m.level)}</b>${m.level>=5?' — Maximum!':' — nächster Halt: Level '+(m.level+1)}</div>
    ${m.tips.map(t=>`<div class="tip ${t[0]}"><b>${t[1]}</b>${t[2]}</div>`).join('')}
    ${(function(){ try{ const log=JSON.parse(localStorage.getItem('vsAwarenessLog')||'[]');
      const li=[...log].reverse().find(l=>l.idea);
      return li?`<div class="tip ok"><b>💡 Deine Superpower/Idee (${li.date})</b>„${li.idea}" — schon einer Person erzählt?</div>`:''; }catch(e){return '';} })()}
    <div style="margin:10px 0 4px"><a onclick="if(window.pbFlow) pbFlow.open()" style="cursor:pointer;display:inline-block;background:linear-gradient(135deg,#5e4db2,#1a44ea);color:#fff;border-radius:10px;padding:8px 14px;font-weight:700;font-size:12.5px;text-decoration:none">🧠 Ziff (Mentor-Coach) fragen</a></div>
    <div class="score">Basis: ${m.fk.length} Features · WSJF ${Math.round(m.wsjfPct*100)} % · ${m.impl} in Arbeit · Check-ins: ${m.hasCi?'ja':'noch keine'} ·
    Dashboard: ${m.t.live?'live':'offen'}. Der Coach aktualisiert sich mit jedem Datenstand.</div>`;
  }
  /* Kein eigener FAB mehr: der Coach lebt als Tab im KI-Flow-Manager-Panel (ein gemeinsamer Einstieg). */
  function renderCoachInto(container){
    container.innerHTML = coachHtml();
    const sel = container.querySelector('#pbCoachTeam');
    if (sel) sel.addEventListener('change', ()=>{ sessionStorage.setItem('pbCoachTeam', sel.value); renderCoachInto(container); });
  }
  if (window.pbFlow) window.pbFlow.registerCoach(renderCoachInto);
})();
