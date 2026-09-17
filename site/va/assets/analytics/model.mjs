import {instance} from "../runtime.mjs";
export const views=instance.views;
export const DAY=86400000;
export const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?Date.parse(s+'T00:00:00Z'):NaN;
export const day=n=>new Date(n).toISOString().slice(0,10);
export const project=r=>String(r[0]).split('-')[0];
export const summary=r=>typeof r[12]==='string'?r[12].trim():'';
export const column=r=>r[10]?.at(-1)?.[1]??null;
export const open=r=>column(r)!==5;
export const active=r=>column(r)>=1&&column(r)<=4;
export const completed=r=>column(r)===5&&r[11]==='Done'&&Number.isFinite(date(r[5]));
export function rowsFor(data,filters){
 const seen=new Set();
 return data.issues.filter(r=>{
  if(!Array.isArray(r)||!r[0]||seen.has(r[0]))return false;seen.add(r[0]);

  if(filters.project&&!['all','delivery'].includes(filters.project)&&project(r)!==filters.project)return false;
  if((!filters.type||filters.type==='work')&&r[3]==='E')return false;
  if(filters.type&&!['work','all'].includes(filters.type)&&r[3]!==filters.type)return false;
  if(filters.status==='active'&&!active(r)||filters.status==='open'&&!open(r)||filters.status==='done'&&column(r)!==5)return false;
  if(filters.flagged&&!r[7])return false;
  return !filters.q||(r[0]+' '+summary(r)).toLowerCase().includes(filters.q.toLowerCase().trim());
 });
}
export function percentile(values,p){if(!values.length)return null;const a=[...values].sort((a,b)=>a-b);return a[Math.max(0,Math.ceil(a.length*p)-1)];}
export function metrics(rows,from,to,asOf){
 const start=date(from),end=date(to)+DAY,snapshot=date(asOf);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)throw Error('Invalid period');
 const done=rows.filter(r=>completed(r)&&date(r[5])>=start&&date(r[5])<end);
 const wip=rows.filter(active),blocked=rows.filter(r=>open(r)&&r[7]);
 const leadRows=done.filter(r=>Number.isFinite(date(r[4]))&&date(r[5])>=date(r[4]));
 const cycleStart=r=>{const first=r[10]?.find(t=>t[1]>=1&&t[1]<=4);return first?date(first[0]):NaN;};
 const cycleRows=done.filter(r=>Number.isFinite(cycleStart(r))&&date(r[5])>=cycleStart(r));
 const lead=leadRows.map(r=>(date(r[5])-date(r[4]))/DAY),cycle=cycleRows.map(r=>(date(r[5])-cycleStart(r))/DAY);
 const aged=wip.filter(r=>Number.isFinite(cycleStart(r))&&snapshot-cycleStart(r)>30*DAY);
 const overdue=rows.filter(r=>open(r)&&Number.isFinite(date(r[6]))&&date(r[6])<snapshot);
 const weeks=[];for(let a=start;a<end;a+=7*DAY){const z=Math.min(a+7*DAY,end);weeks.push({start:day(a),end:day(z-DAY),rows:done.filter(r=>date(r[5])>=a&&date(r[5])<z)});}
 return {done,wip,blocked,leadRows,cycleRows,lead50:percentile(lead,.5),lead85:percentile(lead,.85),cycle50:percentile(cycle,.5),aged,overdue,weeks};
}
export function canView(profile,id){return !!profile?.u&&!!views[id];}
export function scopeOptions(id){return ['all',...(views[id]?.projects||[])];}
export function normalizeScope(id,scope){return scopeOptions(id).includes(scope)?scope:'all';}
export function jira(rows){const keys=[...new Set(rows.map(r=>r[0]))].filter(k=>/^[A-Z][A-Z0-9]*-\d+$/.test(k));return instance.jiraBase+'/issues/?jql='+encodeURIComponent(keys.length?'key in ('+keys.join(',')+') ORDER BY updated DESC':'key is EMPTY');}

export function periodCohort(rows,from,to){const start=date(from),end=date(to)+DAY;return rows.filter(r=>open(r)||(date(r[5])>=start&&date(r[5])<end));}
