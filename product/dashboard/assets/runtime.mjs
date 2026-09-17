export const instance=globalThis.cockpitInstance;
if(!instance)throw Error('Cockpit instance configuration missing');
let identity;
export async function ensureProfile(){
 if(!identity)identity=(async()=>{
  try{const r=await fetch('gate.php?wer=1',{cache:'no-store',credentials:'same-origin'});if(!r.ok)return null;const who=await r.json();if(!who.ok)return null;
   const profile={u:String(who.person),name:who.name||'',role:'coach',regRole:'coach',coach:instance.fullDashboard===true,team:instance.defaultTeam,teams:Object.keys(instance.views)};
   // Display policy only; the existing server gate remains the access authority.
   sessionStorage.setItem('vsAuth',JSON.stringify(profile));return profile;
  }catch{return null;}
 })();return identity;
}
export function normalizeData(raw,team){
 if(!raw?.meta||!Array.isArray(raw.issues)||!/^\d{4}-\d{2}-\d{2}$/.test(raw.meta.importDate||'')||String(raw.meta.board)!==String(instance.views[team]?.board))throw Error('Unexpected board data');
 // VA: slot 11 = strategy link, 12 = resolution, 13 = title. Preserve the live format.
 const success=new Set(instance.successfulResolutions.map(s=>s.toLowerCase()));
 return {meta:{...raw.meta,team,filterId:raw.meta.board},issues:raw.issues.map(r=>{
  if(!Array.isArray(r)||!Array.isArray(r[10]))throw Error('Invalid issue history');
  const row=r.slice(0,11),resolution=String(r[12]||'');
  row[11]=success.has(resolution.toLowerCase())?'Done':resolution;row[12]=String(r[13]||'');return row;
 })};
}
export async function loadData(team=instance.defaultTeam){
 const r=await fetch(instance.views[team].dataUrl,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error('Data unavailable');return normalizeData(await r.json(),team);
}
export async function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.append(s);});}
