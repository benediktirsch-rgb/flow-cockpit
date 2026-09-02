/* ═══════════════════════════════════════════════════════════════════════════
   pbBuddy — der Assistent als Gegenüber: Avatar, Ruhe-Modus, die eine Frage
   ───────────────────────────────────────────────────────────────────────────
   Warum getrennt: Jede Cockpit-Instanz hat ihre eigene Persona — Porsche „John"
   (Flow-Management-Assistent), Vishnu „Ziff" (Mentor-Coach) — aber dasselbe
   Verhalten. Das Verhalten steht hier, die Persona kommt per mount().

   Was diese Datei kann:
     • Avatar zeichnen (Gesicht, Headset in der Akzentfarbe der Marke, blinzelnde
       Augen, Ampelabzeichen). Die Ampel ist keine Deko: sie zeigt die Stimmung,
       die die Instanz aus IHREN Zahlen meldet.
     • Ruhe-Modus („Pausieren"): eine Stunde, bis morgen früh, ganz aus. Solange
       ruht der Avatar — und eine pulsende Cockpit-Ampel (.fab) hält mit an.
     • Anmeldungen zählen und sich nach der dritten EINMAL von selbst melden,
       mit einer Frage, die die Instanz zum Kontext liefert.

   GETEILTE DATEI — hier ist die Quelle. Die anderen Instanzen bekommen sie über
   ihren Build kopiert (analytics-dashboard: build-va.ps1 → site/va/), mit einem
   Cache-Stempel aus dem Datei-Inhalt. Nichts Marken- oder Personenspezifisches
   gehört hier hinein; das steht im mount()-Aufruf der jeweiligen Instanz.

   Aufruf:
     pbBuddy.mount({ id:'john', name:'John', accent:'#D5001C',
                     mood:()=>'ok'|'warn'|'alert', question:()=>({t,s})|null,
                     open:(seed)=>…, isOpen:()=>…, close:()=>… });
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  const LG = () => (window.pbLang ? pbLang() : 'de');
  const EN = () => LG() !== 'de';        /* alles Nicht-Deutsche nimmt mindestens die englische Fassung */
  const F = (de, en) => { const l = LG(); return l === 'hr' ? (window.pbHr ? pbHr(de, en) : en) : (l === 'en' ? en : de); };

  /* ---------- Avatar ----------
     Zustände: 'ok' | 'warn' | 'alert' | 'sleep'. Das Ampelgehäuse unten rechts ersetzt
     den früheren zweiten Knopf: wo dieser Avatar steht, braucht es keine eigene Ampel. */
  let N = 0;
  function avatar(px, mood, opt){
    const s = px || 44, m = mood || 'ok', id = 'pbb' + (++N), sleep = (m === 'sleep');
    const o = opt || {};
    const AC = sleep ? (o.accentDim || '#7d3038') : (o.accent || '#D5001C');
    const EYE = o.eye || '#dbe6ff', off = '#333a43';
    const eyes = sleep
      ? `<path d="M15.4 24.4q2.4 2.2 4.8 0M27.8 24.4q2.4 2.2 4.8 0" fill="none" stroke="${EYE}" stroke-width="1.8" stroke-linecap="round"/>`
      : `<rect class="pbb-eye" x="15.6" y="20.8" width="4.6" height="6.4" rx="2.3" fill="${EYE}"/>`
        + `<rect class="pbb-eye" x="27.8" y="20.8" width="4.6" height="6.4" rx="2.3" fill="${EYE}" style="animation-delay:.09s"/>`;
    const brows = m === 'alert'
      ? `<path d="M14.8 17.2 20.6 18.9M33.2 17.2 27.4 18.9" fill="none" stroke="${EYE}" stroke-width="1.7" stroke-linecap="round" opacity=".85"/>`
      : m === 'warn'
      ? `<path d="M15.2 17.8h5.2M27.6 17.8h5.2" fill="none" stroke="${EYE}" stroke-width="1.7" stroke-linecap="round" opacity=".6"/>`
      : '';
    const mouth = sleep ? `<path d="M21 31.4h6" fill="none" stroke="${EYE}" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>`
      : m === 'alert' ? `<path d="M19.4 32.6q4.6-3.6 9.2 0" fill="none" stroke="${EYE}" stroke-width="1.9" stroke-linecap="round"/>`
      : m === 'warn'  ? `<path d="M19.8 31.6h8.4" fill="none" stroke="${EYE}" stroke-width="1.9" stroke-linecap="round"/>`
      : `<path d="M19.4 30.4q4.6 4.2 9.2 0" fill="none" stroke="${EYE}" stroke-width="1.9" stroke-linecap="round"/>`;
    const zzz = sleep ? `<text class="pbb-z" x="39.5" y="13" font-size="11" font-weight="800" fill="${EYE}" opacity=".8">z</text>` : '';
    const lamp = `<rect x="34" y="29" width="9" height="16.5" rx="4.5" fill="#14171b" stroke="rgba(255,255,255,.12)" stroke-width=".8"/>`
      + `<circle cx="38.5" cy="32.7" r="2.4" fill="${m==='alert'?'#ff5630':off}"/>`
      + `<circle cx="38.5" cy="37.2" r="2.4" fill="${m==='warn'?'#ffab00':off}"/>`
      + `<circle cx="38.5" cy="41.7" r="2.4" fill="${m==='ok'?'#36b37e':off}"/>`;
    return `<svg class="pbb-av" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true">`
      + `<defs><linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1">`
      + `<stop offset="0" stop-color="#474f59"/><stop offset="1" stop-color="#1a1e23"/></linearGradient></defs>`
      + `<path d="M7 26a17 17 0 0 1 34 0" fill="none" stroke="${AC}" stroke-width="2.6" stroke-linecap="round"/>`
      + `<rect x="4.4" y="21.6" width="5.8" height="9.4" rx="2.9" fill="${AC}"/>`
      + `<rect x="37.8" y="21.6" width="5.8" height="9.4" rx="2.9" fill="${AC}"/>`
      + `<rect x="10" y="9" width="28" height="28" rx="10" fill="url(#${id}h)" stroke="rgba(255,255,255,.18)"/>`
      + brows + eyes + mouth + zzz + lamp
      + `</svg>`;
  }

  /* ---------- Ruhe-Modus ----------
     Der Assistent darf still sein. Die Pause liegt lokal (Zeitstempel oder 'off' = bis zum
     Wecken) und läuft von selbst ab. Solange sie gilt, blinzelt niemand und es kommt keine
     Frage; body.pbb-paused stellt zusätzlich eine pulsende Cockpit-Ampel still. */
  let CFG = null;
  const key = k => 'pbb:' + ((CFG && CFG.id) || 'buddy') + ':' + k;
  function pausedUntil(){
    try{ const v = localStorage.getItem(key('pause')); if(!v) return 0;
      if(v === 'off') return Infinity;
      const t = +v; if(t > Date.now()) return t;
      localStorage.removeItem(key('pause')); return 0;
    }catch(e){ return 0; }
  }
  function paused(){ return pausedUntil() > 0; }
  function sleep(kind){
    try{
      if(kind === 'off') localStorage.setItem(key('pause'), 'off');
      else if(kind === 'day'){ const d = new Date(); d.setDate(d.getDate()+1); d.setHours(7,0,0,0); localStorage.setItem(key('pause'), String(d.getTime())); }
      else localStorage.setItem(key('pause'), String(Date.now() + 3600000));
    }catch(e){}
    bubbleClose(); paint();
  }
  function wake(){ try{ localStorage.removeItem(key('pause')); }catch(e){} paint(); }

  /* ---------- Anmeldungen zählen ----------
     Einmal je Browser-Sitzung und Nutzer, rein lokal. Der Nutzername steht im
     Sitzungsmerker, damit ein Nutzerwechsel neu zählt. */
  function user(){
    try{ if (window.__csEntraUser) return String(window.__csEntraUser); }catch(e){}
    try{ const a = JSON.parse(sessionStorage.getItem('vsAuth')||'null'); if (a && a.u) return a.u; }catch(e){}
    try{ if (window.vaApp && typeof vaApp.auth === 'function'){ const v = vaApp.auth(); if (v && v.name) return String(v.name); } }catch(e){}
    try{ return sessionStorage.getItem('vsRole') || 'gast'; }catch(e){ return 'gast'; }
  }
  function loginNo(){
    const u = user(); let all = {};
    try{ all = JSON.parse(localStorage.getItem(key('logins'))||'{}'); }catch(e){}
    try{
      if (sessionStorage.getItem(key('counted')) !== u){
        all[u] = (all[u]||0) + 1;
        localStorage.setItem(key('logins'), JSON.stringify(all));
        sessionStorage.setItem(key('counted'), u);
      }
    }catch(e){}
    return all[u] || 1;
  }

  /* ---------- FAB, Ruhe-Menü, Denkblase ---------- */
  let fab = null;
  function mood(){ if (paused()) return 'sleep'; try{ return (CFG.mood && CFG.mood()) || 'ok'; }catch(e){ return 'ok'; } }
  function paint(){
    if (!fab) return;
    const m = mood(), p = (m === 'sleep');
    fab.innerHTML = avatar(44, m, CFG)
      + '<span class="pbb-pause" title="' + (p ? F(CFG.name + ' wecken', 'Wake ' + CFG.name) : F(CFG.name + ' pausieren', 'Pause ' + CFG.name)) + '">' + (p ? '▶' : '⏸') + '</span>';
    fab.classList.toggle('pbb-sleep', p);
    document.body.classList.toggle('pbb-paused', p);
    fab.title = p ? F(CFG.name + ' ruht — klicken zum Wecken', CFG.name + ' is resting — click to wake')
      : (CFG.title || F(CFG.name + ' — die Ampel zeigt den Zustand eurer Zahlen', CFG.name + ' — the traffic light shows the state of your numbers'));
  }
  function menuClose(){ document.querySelectorAll('.pbb-menu').forEach(n => n.remove()); }
  function menu(){
    if (document.querySelector('.pbb-menu')){ menuClose(); return; }
    const p = paused(), m = document.createElement('div'); m.className = 'pbb-menu';
    m.innerHTML = '<b>' + CFG.name + '</b>'
      + (p ? '<a data-a="wake">▶ ' + F('Weitermachen','Carry on') + '</a>'
           : '<a data-a="1h">😴 ' + F('Eine Stunde Ruhe','Quiet for an hour') + '</a>'
            +'<a data-a="day">🌙 ' + F('Bis morgen früh','Until tomorrow morning') + '</a>'
            +'<a data-a="off">⏹ ' + F('Ganz aus — bis ich ihn wecke','Off — until I wake him') + '</a>')
      + '<a data-a="open">💬 ' + F('Jetzt etwas fragen','Ask something now') + '</a>';
    document.body.appendChild(m);
    const r = fab.getBoundingClientRect();
    m.style.left = Math.max(10, Math.min(r.right - m.offsetWidth, window.innerWidth - m.offsetWidth - 10)) + 'px';
    m.style.top = Math.max(10, r.top - m.offsetHeight - 10) + 'px';
    m.addEventListener('click', e => {
      const a = e.target.closest('a[data-a]'); if(!a) return;
      const k = a.dataset.a; menuClose();
      if (k === 'wake') wake(); else if (k === 'open') CFG.open(); else sleep(k);
    });
    setTimeout(()=>document.addEventListener('click', function h(ev){
      if(!ev.target.closest('.pbb-menu') && !ev.target.closest('.pbb-fab')) menuClose();
      document.removeEventListener('click', h);
    }), 0);
  }
  function bubbleClose(){ const b = document.getElementById('pbbBub'); if(b) b.remove(); }
  function bubble(q){
    if (!q || !fab) return;
    bubbleClose();
    const b = document.createElement('div'); b.className = 'pbb-bub'; b.id = 'pbbBub';
    b.innerHTML = '<span class="x" data-a="later" title="' + F('Später','Later') + '">✕</span>'
      + '<div class="n">' + F(CFG.name + ' hat eine Frage', CFG.name + ' has a question') + '</div>'
      + '<div class="t">' + q.t + '</div>'
      + '<div class="a"><span class="go" data-a="go">' + F('Darüber reden','Let us talk') + '</span>'
      + '<span class="later" data-a="later">' + F('Später','Later') + '</span>'
      + '<span class="later" data-a="mute">' + F('Ruhe geben','Keep quiet') + '</span></div>';
    document.body.appendChild(b);
    const r = fab.getBoundingClientRect();
    b.style.left = Math.max(12, Math.min(r.right - b.offsetWidth, window.innerWidth - b.offsetWidth - 12)) + 'px';
    b.style.top = Math.max(12, r.top - b.offsetHeight - 12) + 'px';
    b.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if(!a) return;
      const k = a.dataset.a; bubbleClose();
      if (k === 'go') CFG.open(q.s); else if (k === 'mute') sleep('day');
    });
    /* Niemand drängt sich auf: nach 45 s verschwindet die Blase von selbst */
    setTimeout(()=>{ if(document.getElementById('pbbBub') === b) bubbleClose(); }, 45000);
  }
  function maybeNudge(no){
    if (no < 3 || paused()) return;
    let done = {}; try{ done = JSON.parse(localStorage.getItem(key('nudged'))||'{}'); }catch(e){}
    const u = user(); if (done[u]) return;
    let q = null; try{ q = CFG.question && CFG.question(); }catch(e){}
    if (!q) return;
    setTimeout(()=>{
      if (paused() || (CFG.isOpen && CFG.isOpen())) return;
      bubble(q);
      try{ done[u] = 1; localStorage.setItem(key('nudged'), JSON.stringify(done)); }catch(e){}
    }, 7000);
  }

  /* ---------- Styles ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .pbb-fab{position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:50%;z-index:80;
    background:radial-gradient(120% 120% at 32% 22%,#3c434c 0%,#20242a 58%,#13161a 100%);
    color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;
    box-shadow:0 6px 20px rgba(15,16,16,.34);user-select:none;border:2px solid rgba(255,255,255,.14);
    transition:transform .16s,box-shadow .16s;font-family:inherit}
  .pbb-fab:hover{transform:scale(1.07);box-shadow:0 10px 26px rgba(15,16,16,.42)}
  .pbb-fab .pbb-av{display:block;transition:transform .22s}
  .pbb-fab:hover .pbb-av{transform:rotate(-6deg)}
  .pbb-av .pbb-eye{transform-box:fill-box;transform-origin:center;animation:pbbBlink 7.5s infinite}
  @keyframes pbbBlink{0%,93%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.12)}97.5%{transform:scaleY(1)}}
  .pbb-av .pbb-z{animation:pbbZ 3.6s ease-in-out infinite}
  @keyframes pbbZ{0%{opacity:0;transform:translateY(2px)}35%{opacity:.9}100%{opacity:0;transform:translateY(-6px)}}
  .pbb-fab.pbb-sleep{filter:saturate(.3);box-shadow:0 3px 10px rgba(15,16,16,.2)}
  /* Ein Knopf statt zwei: wo dieser Avatar steht, ist die 🚦-Ampel in sein Abzeichen gewandert */
  body.pbb-solo .fab,body.pbb-solo .fab-bubble{display:none!important}
  body.pbb-paused .fab{animation:none!important}
  body.pbb-paused .fab-bubble{display:none!important}
  .pbb-fab .pbb-pause{position:absolute;top:-4px;left:-4px;width:21px;height:21px;border-radius:50%;
    background:#fff;color:#2c3138;font-size:10px;line-height:21px;text-align:center;font-weight:700;
    box-shadow:0 2px 6px rgba(0,0,0,.32);opacity:0;transition:opacity .15s}
  .pbb-fab:hover .pbb-pause,.pbb-fab.pbb-sleep .pbb-pause{opacity:1}
  .pbb-menu{position:fixed;z-index:82;background:var(--card,#fff);color:var(--ink,#151515);border-radius:12px;
    box-shadow:0 16px 40px rgba(0,0,0,.3);padding:6px;min-width:210px;font-family:inherit;font-size:12.5px}
  .pbb-menu b{display:block;padding:6px 10px 4px;font-size:10.5px;color:var(--sub,#6b6d70);letter-spacing:.5px;text-transform:uppercase}
  .pbb-menu a{display:block;padding:7px 10px;border-radius:8px;cursor:pointer;text-decoration:none;color:inherit}
  .pbb-menu a:hover{background:rgba(128,128,128,.12)}
  .pbb-bub{position:fixed;z-index:82;width:290px;max-width:calc(100vw - 24px);background:var(--card,#fff);color:var(--ink,#151515);
    border-radius:14px;border-top:4px solid var(--brand,#1a44ea);box-shadow:0 18px 46px rgba(0,0,0,.3);padding:12px 14px 11px;
    font-family:inherit;font-size:13px;line-height:1.5;animation:pbbIn .32s cubic-bezier(.2,1.35,.4,1)}
  @keyframes pbbIn{from{opacity:0;transform:translateY(10px) scale(.94)}to{opacity:1;transform:none}}
  .pbb-bub .x{position:absolute;right:9px;top:6px;cursor:pointer;color:var(--sub,#97a0af);font-size:14px}
  .pbb-bub .n{font-size:10.5px;font-weight:700;color:var(--brand-dark,#0f2ec2);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px}
  .pbb-bub .t b{color:var(--brand-dark,#0f2ec2)}
  .pbb-bub .a{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap}
  .pbb-bub .a span{cursor:pointer;border-radius:14px;padding:5px 11px;font-size:11.5px;font-weight:700}
  .pbb-bub .a .go{background:var(--brand,#1a44ea);color:#fff}
  .pbb-bub .a .later{border:1px solid var(--line,#d8d8db);color:var(--sub,#6b6d70);font-weight:600}`;
  document.head.appendChild(css);
  if (window.pbTheme) pbTheme.refresh();

  /* ---------- Montage ---------- */
  function mount(cfg){
    CFG = Object.assign({ id:'buddy', name:'Buddy', accent:'#D5001C',
      mood:()=>'ok', question:()=>null, open:()=>{}, isOpen:()=>false, close:()=>{} }, cfg||{});
    if (fab) fab.remove();
    fab = document.createElement('div'); fab.className = 'pbb-fab';
    fab.addEventListener('click', e => {
      if (e.target.closest('.pbb-pause')){ menu(); return; }
      bubbleClose(); menuClose();
      if (paused()) wake();                                  /* schlafenden Assistenten weckt der Klick */
      if (CFG.isOpen && CFG.isOpen()) CFG.close(); else CFG.open();
    });
    fab.addEventListener('contextmenu', e => { e.preventDefault(); menu(); });
    document.body.appendChild(fab);
    document.body.classList.add('pbb-solo');
    paint();
    setInterval(paint, 60000);                               /* Stimmung + Ablauf der Ruhezeit nachziehen */
    maybeNudge(loginNo());
    /* Der Name ist jetzt bekannt. Seiten, die ihn in ihrer Oberflaeche zeigen, rendern hierauf nach —
       pb-buddy.js laedt nach dem Seiten-Script, vorher steht dort nur die Umschreibung „dem Assistenten".
       (Gefunden am 24.08.2026: der Monte-Carlo-Knopf im Cockpit blieb auf dem Fallback stehen.) */
    try{ window.dispatchEvent(new CustomEvent('pbbuddy:ready',{detail:{name:CFG.name}})); }catch(e){}
    return fab;
  }

  window.pbBuddy = { mount, avatar, paint, paused, sleep, wake, loginNo, mood,
    name: () => (CFG && CFG.name) || '', nudge: () => { try{ bubble(CFG.question()); }catch(e){} },
    question: () => { try{ return CFG.question(); }catch(e){ return null; } } };
})();
