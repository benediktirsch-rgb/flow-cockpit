// Zieht das VA-Board (vishnuartists.atlassian.net) per REST-API und schreibt site/va/va-data.json
// Env: JIRA_EMAIL, JIRA_TOKEN — optional: JIRA_BASE, JIRA_PROJECTS, JIRA_BOARD
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.JIRA_BASE || 'https://vishnuartists.atlassian.net';
// Ticket-Projekte: leer = ALLE sichtbaren Projekte ausser dem Strategie-Projekt (dessen Vorgaenge sind die
// FL2/FL3-Ebene, keine Team-Tickets). Einzelne erzwingen per JIRA_PROJECTS=VA,VAEV,...
const PROJECTS = (process.env.JIRA_PROJECTS || '').split(',').map(s => s.trim()).filter(Boolean);
const FL_PROJECT = process.env.JIRA_FL_PROJECT || 'STA';
const BOARD = process.env.JIRA_BOARD || '38';
const AUTH = 'Basic ' + Buffer.from(process.env.JIRA_EMAIL + ':' + process.env.JIRA_TOKEN).toString('base64');

async function api(path) {
  // 3 Versuche: Atlassian bricht Verbindungen sporadisch ab (ECONNRESET/terminated, Run #202)
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
      if (r.status >= 500 || r.status === 429) throw new Error('HTTP ' + r.status + ' fuer ' + path);
      if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status + ' fuer ' + path), { noRetry: true });
      return await r.json();
    } catch (e) {
      if (e.noRetry || attempt >= 3) throw e;
      await new Promise(res => setTimeout(res, attempt * 2000));
    }
  }
}

// 1) Spalten-Mapping auf das 6-Spalten-Schema (0 Backlog .. 5 Done)
//    Bevorzugt: Board-Konfiguration (Agile-API). Fallback bei 401/403 (scoped Token ohne
//    Jira-Software-Scope): Heuristik aus den Projekt-Status (Name + Kategorie).
const statuses = await api('/rest/api/3/status');
const cat = {}; statuses.forEach(s => cat[s.id] = s.statusCategory.key);
const colOf = {};
const colNames = ['Backlog', 'Discovery', 'Ready', 'In Progress', 'Review', 'Done'];
let cols = null;
try {
  const cfg = await api('/rest/agile/1.0/board/' + BOARD + '/configuration');
  cols = cfg.columnConfig.columns;
} catch (e) {
  console.warn('Board-Konfiguration nicht lesbar (' + e.message + ') — Fallback auf Status-Heuristik.');
}
if (cols) {
  // Regel: done->5 · new-Spalten: letzte->2 (Ready), vorletzte->1 (Discovery), fruehere->0 (Backlog)
  //        indeterminate-Spalten: erste->3 (In Progress), weitere->4 (Review)
  const newCols = [], midCols = [];
  cols.forEach((c) => {
    const keys = c.statuses.map(s => cat[s.id]);
    if (keys.every(k => k === 'done')) c.__idx = 5;
    else if (keys.some(k => k === 'indeterminate')) midCols.push(c);
    else newCols.push(c);
  });
  newCols.forEach((c, i) => { c.__idx = i === newCols.length - 1 ? 2 : (i === newCols.length - 2 ? 1 : 0); });
  midCols.forEach((c, i) => { c.__idx = i === 0 ? 3 : 4; });
  cols.forEach(c => c.statuses.forEach(s => colOf[s.id] = c.__idx));
  cols.forEach(c => { if (c.__idx != null && colNames[c.__idx] !== undefined) colNames[c.__idx] = c.name; });
  const firstZero = cols.find(c => c.__idx === 0); if (firstZero) colNames[0] = firstZero.name;
} else {
  // Heuristik: Projekt-Status je Issuetype einsammeln und nach Name/Kategorie mappen
  const seen = {};
  try {
    const pst = await api('/rest/api/3/project/' + (PROJECTS[0] || 'VA') + '/statuses');
    pst.forEach(t => t.statuses.forEach(s => seen[s.id] = { name: s.name, cat: s.statusCategory.key }));
  } catch (e) {
    statuses.forEach(s => seen[s.id] = { name: s.name, cat: s.statusCategory.key });
  }
  const named = {};
  Object.keys(seen).forEach(id => {
    const n = seen[id].name.toLowerCase(), k = seen[id].cat;
    const idx = k === 'done' ? 5
      : k === 'indeterminate' ? (/check|review|test|qa|abnahme/.test(n) ? 4 : 3)
      : (/refine|discovery|analys/.test(n) ? 1 : /ready|selected|bereit/.test(n) ? 2 : 0);
    colOf[id] = idx;
    if (!named[idx]) { named[idx] = true; colNames[idx] = seen[id].name; }
  });
}
// 1a) Status, die NICHT auf dem VA-Board liegen (Tickets aus Vaikuntha, VACOM, COM, ...): nach Statuskategorie
//     einsortieren, damit fremde Projekte nicht pauschal im Backlog landen (new->0, in Arbeit->3, done->5).
let nFremdSt = 0;
statuses.forEach(s => { if (colOf[s.id] == null) { colOf[s.id] = cat[s.id] === 'done' ? 5 : cat[s.id] === 'indeterminate' ? 3 : 0; nFremdSt++; } });
if (nFremdSt) console.log('Status ausserhalb des Boards nach Kategorie eingeordnet: ' + nFremdSt);


// 1b) Flagged-Feld ermitteln (Jira-Fahne "Impediment") — Blocker-Erkennung
let flagField = null;
try {
  const allFields = await api('/rest/api/3/field');
  const ff = allFields.find(f => /^(flagged|impediment)$/i.test(f.name || ''));
  if (ff) flagField = ff.id;
} catch (e) { console.warn('Feldliste nicht lesbar (' + e.message + ') — Flag nur ueber Components.'); }

// 2) Issues (26-Wochen-Fenster fuer Erledigte)
const jql = (PROJECTS.length ? 'project in (' + PROJECTS.join(',') + ')' : 'project != ' + FL_PROJECT)
  + ' AND issuetype not in subTaskIssueTypes() AND (statusCategory != Done OR resolved >= -26w)';
let issues = [], token = null;
for (let p = 0; p < 100; p++) {
  const q = new URLSearchParams({ jql, maxResults: '100',
    fields: 'summary,status,assignee,reporter,creator,created,resolutiondate,resolution,issuetype,labels,duedate,components,project,parent'
      + (flagField ? ',' + flagField : '') });
  if (token) q.set('nextPageToken', token);
  const j = await api('/rest/api/3/search/jql?' + q);
  issues = issues.concat(j.issues || []);
  if (!j.nextPageToken) break; token = j.nextPageToken;
}
issues = issues.filter(i => !(i.fields.issuetype && i.fields.issuetype.subtask)); // Subtasks verzerren Flussmetriken
console.log('Tickets: ' + issues.length);

// Notbremse (02.09.2026): Ein Datenlauf ohne Zugriff antwortet mit HTTP 200 und leeren Listen — ein Fehler,
// den der Job von sich aus nicht bemerkt. Genau so hat er am 26.08.2026 vormittags die gute va-data.json
// durch eine leere ersetzt und ausgeliefert: Cockpit und Compass zeigten danach eine Woche lang ein leeres
// Board. Lieber hart abbrechen — der FTPS-Schritt faellt dann aus, die letzte gute Datei bleibt live, und
// der rote Lauf faellt auf. Ein wirklich leeres Board (Sonderfall) laesst sich mit ALLOW_LEER=1 ausliefern.
if (!process.env.ALLOW_LEER && (!statuses.length || !issues.length)) {
  console.error('Abbruch: Jira liefert nichts (' + statuses.length + ' Status, ' + issues.length + ' Tickets).');
  console.error('Sehr wahrscheinlich sieht der Zugang JIRA_EMAIL/JIRA_TOKEN das Projekt nicht mehr '
    + '(abgelaufenes oder gescoptes API-Token). Pruefen: curl -u "$JIRA_EMAIL:$JIRA_TOKEN" '
    + BASE + '/rest/api/3/myself und /rest/api/3/status');
  console.error('site/va/va-data.json bleibt unveraendert — der Deploy-Schritt laeuft nicht.');
  process.exit(1);
}

// 3) Changelogs (Status-Historie), Concurrency 8
const cl = {};
const queue = issues.slice();
await Promise.all(Array.from({ length: 8 }, async () => {
  let it;
  while ((it = queue.shift())) {
    let h = [], startAt = 0;
    for (let p = 0; p < 6; p++) {
      const j = await api('/rest/api/3/issue/' + it.key + '/changelog?maxResults=100&startAt=' + startAt);
      j.values.forEach(v => v.items.forEach(x => {
        if (x.fieldId === 'status') h.push([v.created.slice(0, 10), x.from, x.to]);
      }));
      if (j.isLast || !j.values.length) break; startAt += j.values.length;
    }
    cl[it.key] = h;
  }
}));

// 3b) Flight Level 2/3: STA-Projekt komplett — Themes (Epics), Initiativen, Risiken, KPIs (Key Results).
//     Seit 18.08.2026 auch ERLEDIGTE Initiativen (Quartals-Historie: Durchsatz/Cycle Time auf FL2) und je
//     Vorgang die Pflege-Felder Owner (assignee), created/updated/due/resolved, Beschreibungslaenge sowie
//     die Status-Historie (Changelog: Arbeitsbeginn/Done) — Grundlage fuer Verantwortung + Pflege-Ampel im
//     Cockpit (FL2+3-Tab, Startansicht). Nur Aggregate/Owner-Namen wie in Jira sichtbar; keine Individualdaten.
let sta = [], t2 = null;
try {
  for (let p = 0; p < 50; p++) {
    const q2 = new URLSearchParams({ jql: 'project = ' + FL_PROJECT + ' AND issuetype not in subTaskIssueTypes()', maxResults: '100',
      fields: 'summary,issuetype,status,parent,issuelinks,assignee,created,updated,duedate,resolutiondate,resolution,description,labels' });
    if (t2) q2.set('nextPageToken', t2);
    const j2 = await api('/rest/api/3/search/jql?' + q2);
    sta = sta.concat(j2.issues || []);
    if (!j2.nextPageToken) break; t2 = j2.nextPageToken;
  }
} catch (e) { console.warn('STA nicht lesbar (' + e.message + ') — FL-Tab bleibt leer.'); }

// Status-Historie der Initiativen (Arbeitsbeginn = erster Wechsel in eine "in Arbeit"-Kategorie bzw. In Flight,
// Done = erster Wechsel in eine Done-Kategorie). Concurrency 8 wie bei den VA-Tickets.
const stName = {}; statuses.forEach(s => stName[s.id] = s.name);
const isWorkSt = id => cat[id] === 'indeterminate' || /in flight|in progress|doing|umsetzung/i.test(stName[id] || '');
const isDoneSt = id => cat[id] === 'done';
const staCl = {};
{
  const q = sta.filter(i => i.fields.issuetype && i.fields.issuetype.name === 'Initiative');
  await Promise.all(Array.from({ length: 8 }, async () => {
    let it;
    while ((it = q.shift())) {
      let h = [], startAt = 0;
      try {
        for (let p = 0; p < 6; p++) {
          const j = await api('/rest/api/3/issue/' + it.key + '/changelog?maxResults=100&startAt=' + startAt);
          j.values.forEach(v => v.items.forEach(x => {
            if (x.fieldId === 'status') h.push([v.created.slice(0, 10), x.from, x.to]);
          }));
          if (j.isLast || !j.values.length) break; startAt += j.values.length;
        }
      } catch (e) { /* ohne Historie: Rueckfall auf created/resolved */ }
      staCl[it.key] = h.sort((a, b) => a[0] < b[0] ? -1 : 1);
    }
  }));
}
const adfText = n => { if (!n) return ''; if (typeof n === 'string') return n; let s = n.text || '';
  (n.content || []).forEach(c => { s += adfText(c); }); return s; };
const d10 = s => (s ? String(s).slice(0, 10) : '');
const fl = { themes: [], inits: [], risks: [], kpis: [], hist: [] };
const linkedVa = new Set();
sta.forEach(i => {
  const f = i.fields, ty = f.issuetype.name, st = f.status.name, cat3 = f.status.statusCategory.key;
  const owner = f.assignee ? f.assignee.displayName : '';
  const upd = d10(f.updated), cre = d10(f.created), due = f.duedate || '', res = d10(f.resolutiondate);
  const parent = f.parent ? f.parent.key : '';
  const vaLinks = [];
  (f.issuelinks || []).forEach(l => {
    const o = l.outwardIssue || l.inwardIssue;
    if (o && /^VA-/.test(o.key)) {
      if (cat3 !== 'done') linkedVa.add(o.key);
      vaLinks.push([o.key, o.fields && o.fields.status ? o.fields.status.statusCategory.key : '']);
    }
  });
  if (ty === 'Initiative') {
    // Historie: alle Initiativen (offen + erledigt) mit Fluss-Zeitpunkten
    const h = staCl[i.key] || [];
    let started = '', done = '';
    h.forEach(x => { if (!started && isWorkSt(x[2])) started = x[0]; if (!done && isDoneSt(x[2])) done = x[0]; });
    // Ohne Arbeits-Wechsel im Changelog: direkt "in Arbeit" angelegt (kein Changelog) -> created; mit Changelog, aber nie
    // in Arbeit (z. B. New -> Done = Board-Cleaning) -> kein Arbeitsbeginn, zaehlt nicht in die Cycle Time.
    if (!started && cat3 !== 'new' && !h.length) started = cre;
    if (!done && cat3 === 'done') done = res || upd;
    if (cat3 === 'done' && !res && !done) done = upd;
    fl.hist.push([i.key, cre, started, done, f.resolution ? (f.resolution.name || '') : '', owner, parent, st, f.summary]);
  }
  if (cat3 === 'done') return;
  if (ty === 'Epic') fl.themes.push([i.key, f.summary, st, owner, upd]);
  else if (ty === 'Risk') fl.risks.push([i.key, f.summary, st, owner, upd]);
  else if (ty === 'KPIs' || ty === 'Objective') fl.kpis.push([i.key, f.summary, st, owner, upd, parent]);
  else if (ty === 'Initiative') {
    const done = vaLinks.filter(x => x[1] === 'done').length;
    const h = staCl[i.key] || [];
    let started = '';
    h.forEach(x => { if (!started && isWorkSt(x[2])) started = x[0]; });
    if (!started && cat3 !== 'new' && !h.length) started = cre;
    fl.inits.push([i.key, f.summary, st, parent, vaLinks.length, done,
      vaLinks.filter(x => x[1] !== 'done').map(x => x[0]),
      owner, cre, upd, due, started, adfText(f.description).trim().length]);
  }
});
console.log('FL: ' + fl.themes.length + ' Themes, ' + fl.inits.length + ' Initiativen (' + fl.hist.length + ' inkl. erledigte), '
  + fl.risks.length + ' Risiken, ' + fl.kpis.length + ' KPIs; ' + linkedVa.size + ' verlinkte VA-Tickets');

// Coverage: VA-Ticket ist einer Initiative zugeordnet, wenn es selbst oder ein
// (Gross-)Elternteil von einem STA-Issue verlinkt ist (transitiv ueber parent)
const parentOf = {};
issues.forEach(i => { if (i.fields.parent) parentOf[i.key] = i.fields.parent.key; });
const isCovered = k => { let c = k, d = 0; while (c && d++ < 6) { if (linkedVa.has(c)) return true; c = parentOf[c]; } return false; };
// Welche Initiative (STA) traegt das Ticket? Erst direkt verlinkt, sonst ueber die Eltern-Kette (Feld 14).
// Grundlage fuers Flight-Level-Umschalten im Vishnu Flow Compass: FL1-Ticket -> FL2-Initiative -> FL3-Thema.
const initOfVa = {};
fl.inits.forEach(r => (r[6] || []).forEach(k => { if (!initOfVa[k]) initOfVa[k] = r[0]; }));
const initOf = k => { let c = k, d = 0; while (c && d++ < 6) { if (initOfVa[c]) return initOfVa[c]; c = parentOf[c]; } return ''; };

// 4) Kompaktformat [key, team, proj, type, created, resolved, due, flagged, assignee, refBits, transitions, stalink, resolution, summary, init, reporter]
//    Feld 12 = Resolution-Name (Cockpit zaehlt nur Resolution "Done" als erledigt; Won't Do/Duplicate nicht)
//    Feld 13 = Ticket-Titel, Feld 14 = zugeordnete Initiative (STA-Key) — beide fuer das native Kanban im Compass
//    Feld 15 = Reporter (wer das Ticket angelegt hat; Fallback creator) — Team-Rangliste "erstellt" in va-app.js.
//              Aeltere Datenstaende haben das Feld nicht; die Rangliste blendet sich dann selbst aus.
//    Feld 2 = echter Projekt-Key (VA, VAEV, VAIKWEB, COM, ...), damit der Compass nach Projekt filtern kann
//    flagged = Jira-Fahne ODER Warte-Component (Waiting-time, Dependency, ...)
const WAITRX = /waiting|dependen|blocked|wartet|on.?hold/i;
const ty = n => /story/i.test(n) ? 'S' : /epic/i.test(n) ? 'E' : /tech/i.test(n) ? 'X' : /task|aufgabe/i.test(n) ? 'T' : 'O';
let nFlagged = 0;
const out = issues.map(i => {
  const f = i.fields;
  const h = (cl[i.key] || []).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const ic = h.length ? colOf[h[0][1]] : colOf[f.status.id];
  const trn = [[f.created.slice(0, 10), ic == null ? 0 : ic]];
  h.forEach(x => { const c = colOf[x[2]]; if (c != null && c !== trn[trn.length - 1][1]) trn.push([x[0], c]); });
  const lb = (f.labels || []).map(l => l.toLowerCase());
  const fv = flagField ? f[flagField] : null;
  const jiraFlag = Array.isArray(fv) ? fv.length > 0 : !!fv;
  const compWait = (f.components || []).some(c => WAITRX.test(c.name || ''));
  const flagged = (jiraFlag || compWait) ? 1 : 0;
  if (flagged) nFlagged++;
  return [i.key, 't1', (f.project && f.project.key) || 'VA', ty(f.issuetype.name),
    f.created.slice(0, 10), f.resolutiondate ? f.resolutiondate.slice(0, 10) : '', f.duedate || '', flagged,
    f.assignee ? f.assignee.displayName : '',
    (lb.includes('refinement_needed') ? 1 : 0) + (lb.includes('refinement_done') ? 2 : 0), trn,
    isCovered(i.key) ? 1 : 0,
    f.resolution ? (f.resolution.name || '') : '',
    f.summary || '', initOf(i.key),
    (f.reporter && f.reporter.displayName) || (f.creator && f.creator.displayName) || ''];
});
console.log('Geflaggt/wartend: ' + nFlagged + ' (Flag-Feld: ' + (flagField || 'keins') + ')');
const jeProjekt = {}; out.forEach(r => jeProjekt[r[2]] = (jeProjekt[r[2]] || 0) + 1);
console.log('Projekte: ' + Object.keys(jeProjekt).sort().map(k => k + '=' + jeProjekt[k]).join(' · '));

const today = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 182 * 86400000).toISOString().slice(0, 10);
mkdirSync('site/va', { recursive: true });
writeFileSync('site/va/va-data.json', JSON.stringify({
  meta: { importDate: today, doneWindowStart: start, generatedAt: new Date().toISOString(), colNames, board: BOARD, fl },
  issues: out
}));
console.log('site/va/va-data.json geschrieben (' + out.length + ' Tickets, Spalten: ' + colNames.join(' | ') + ')');
