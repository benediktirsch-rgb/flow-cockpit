import {DAY,date,day,active,column,completed,percentile} from './model.mjs?v=20260917-insights2';

export function history(row){return (row[10]||[]).filter(t=>Number.isFinite(date(t[0]))&&Number.isInteger(t[1])&&t[1]>=0&&t[1]<=5).slice().sort((a,b)=>date(a[0])-date(b[0]));}
export function start(row){return date(history(row).find(t=>t[1]>=1&&t[1]<=4)?.[0]);}
export function coach(profile,team,entra){
 if(entra)return entra==='coach';
 return !!profile?.u&&(profile.coach===true||profile.coach===1||['coach','Coach','Agile Coach','Scrum Master'].includes(profile.role)||['coach','Coach','Agile Coach','Scrum Master'].includes(profile.regRole)||(Array.isArray(profile.coachTeams)&&profile.coachTeams.includes(team)));
}
export function assessment(value,profile,team){return value?.user===profile?.u&&value?.team===team&&Number.isInteger(value.lvl)&&value.lvl>=0&&value.lvl<=6?value:null;}
export function allowed(minLevel,isCoach,self){return isCoach||minLevel<=(self?.lvl??0);}
export function aging(rows,doneRows,asOf){
 const snapshot=date(asOf),items=rows.filter(active).map(row=>({row,col:column(row),age:(snapshot-start(row))/DAY})).filter(x=>Number.isFinite(x.age)&&x.age>=0);
 const bands=[1,2,3,4].map(col=>{
  // One observation per completed item and column, including revisits until final departure.
  const ages=doneRows.map(row=>{const h=history(row),s=start(row);let leave=NaN;h.forEach((t,i)=>{if(t[1]===col&&h[i+1])leave=date(h[i+1][0]);});return (leave-s)/DAY;}).filter(x=>Number.isFinite(x)&&x>=0);
  return {col,n:ages.length,p50:percentile(ages,.5),p85:percentile(ages,.85),p95:percentile(ages,.95)};
 });
 return {items,bands,missing:rows.filter(active).length-items.length};
}
export function durations(doneRows){return doneRows.map(row=>({row,closed:date(row[5]),lead:(date(row[5])-date(row[4]))/DAY,cycle:(date(row[5])-start(row))/DAY})).filter(x=>Number.isFinite(x.lead)&&x.lead>=0);}
export function cfd(rows,from,to,asOf){
 const end=Math.min(date(to),date(asOf)),begin=date(from);if(!Number.isFinite(begin)||begin>end)return [];
 const step=Math.max(1,Math.ceil((end-begin)/DAY/90)),out=[];
 for(let t=begin;t<=end;t=Math.min(end,t+step*DAY)){
  const counts=Array(6).fill(0);for(const row of rows){if(date(row[4])>t)continue;const h=history(row).filter(x=>date(x[0])<=t);if(h.length)counts[h.at(-1)[1]]++;}
  out.push({date:day(t),counts});if(t===end)break;
 }return out;
}
export function efficiency(doneRows){let activeDays=0,total=0,n=0;
 for(const row of doneRows){const h=history(row),created=date(row[4]),end=date(row[5]);if(!h.length||date(h[0][0])>created||!(end>created))continue;
  let work=0;h.forEach((t,i)=>{const a=Math.max(created,date(t[0])),b=Math.min(end,i+1<h.length?date(h[i+1][0]):end);if((t[1]===3||t[1]===4)&&b>a)work+=(b-a)/DAY;});activeDays+=work;total+=(end-created)/DAY;n++;
 }return {n,activeDays,total,percent:total?activeDays/total*100:null};}
export function arrivals(rows,from,to){const out=[],end=date(to)+DAY;for(let t=date(from);t<end;t+=7*DAY){const z=Math.min(end,t+7*DAY);out.push({date:day(t),created:rows.filter(r=>date(r[4])>=t&&date(r[4])<z).length,done:rows.filter(r=>completed(r)&&date(r[5])>=t&&date(r[5])<z).length});}return out;}
export function forecastBasis(rows,from,to,asOf,coverage){
 const end=Math.min(date(to)+DAY,date(asOf)),floor=date(coverage);let begin=date(from),fallback=false;
 if(!Number.isFinite(end)||!Number.isFinite(begin)||!Number.isFinite(floor))return {weeks:[],reason:'coverage'};
 begin=Math.max(begin,floor);if(end-begin<5*7*DAY){begin=Math.max(floor,end-12*7*DAY);fallback=true;}
 const weeks=[]; // Whole 7-day windows only; include zero-throughput weeks. Never sample the unfinished import day.
 for(let t=end-7*DAY;t>=begin;t-=7*DAY)weeks.unshift({start:day(t),count:rows.filter(r=>completed(r)&&date(r[5])>=t&&date(r[5])<t+7*DAY).length});
 return {weeks,fallback,start:weeks[0]?.start,end:day(end-DAY),reason:weeks.length<5?'short':weeks.every(w=>w.count===0)?'zero':null};
}
export function simulate(counts,weeks,target,seed=17,runs=4000){
 if(counts.length<5||counts.some(x=>!Number.isInteger(x)||x<0)||!counts.some(x=>x>0)||!Number.isInteger(weeks)||weeks<1||weeks>26||!Number.isInteger(target)||target<1||target>500) return null;
 let state=seed>>>0;const pick=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return counts[Math.floor(state/4294967296*counts.length)];};
 const amounts=[],times=[];let censored=0;
 for(let n=0;n<runs;n++){let a=0;for(let w=0;w<weeks;w++)a+=pick();amounts.push(a);let done=0,w=0;while(done<target&&w<520){done+=pick();w++;}if(done<target){censored++;times.push(Infinity);}else times.push(w);}
 return {amounts,minimum85:percentile(amounts,.15),median:percentile(amounts,.5),weeks50:percentile(times,.5),weeks85:percentile(times,.85),weeks95:percentile(times,.95),censored,runs,weeks,target};
}
