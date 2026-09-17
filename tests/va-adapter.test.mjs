import {test} from 'node:test';
import assert from 'node:assert/strict';
globalThis.cockpitInstance={defaultTeam:'va',views:{va:{board:38,projects:['VA','STA']}},successfulResolutions:['Done'],jiraBase:'https://vishnuartists.atlassian.net'};
const {normalizeData}=await import('../product/dashboard/assets/runtime.mjs');
const {completed,summary,jira,rowsFor}=await import('../product/dashboard/assets/analytics/model.mjs');
const row=(resolution='Done')=>['VA-1','t1','VA','S','2026-01-01','2026-09-01','',0,'Synthetic Coach',0,[['2026-01-01',0],['2026-08-01',3],['2026-09-01',5]],1,resolution,'A useful title','STA-1','Reporter'];
const raw=issues=>({meta:{board:'38',importDate:'2026-09-17'},issues});
test('VA strategy flag cannot be mistaken for resolution; title and history survive without mutating source',()=>{
 const input=raw([row()]),before=structuredClone(input),normalized=normalizeData(input,'va');
 assert.equal(summary(normalized.issues[0]),'A useful title');assert.equal(completed(normalized.issues[0]),true);assert.deepEqual(input,before);assert.equal(input.issues[0][11],1);
 assert.match(jira(normalized.issues),/^https:\/\/vishnuartists.atlassian.net/);
});
test('only documented successful resolutions count; closed discarded and unknown issues are not delivery',()=>{
 for(const resolution of ['',"Won't Do",'Duplicate','Obsolete','Reicht nicht','Resolved'])assert.equal(completed(normalizeData(raw([row(resolution)]),'va').issues[0]),false,resolution);
});
test('wrong board and malformed history fail closed',()=>{
 assert.throws(()=>normalizeData({...raw([]),meta:{board:73,importDate:'2026-09-17'}},'va'));
 const malformed=row();malformed[10]=null;assert.throws(()=>normalizeData(raw([malformed]),'va'));
});
test('VA and STA project filters preserve separation and deduplicate keys',()=>{
 const a=row(),b=row();b[0]='STA-2';b[2]='STA';const data=normalizeData(raw([a,b,a]),'va');
 assert.equal(rowsFor(data,{project:'all'}).length,2);assert.equal(rowsFor(data,{project:'VA'}).length,1);assert.equal(rowsFor(data,{project:'STA'})[0][0],'STA-2');
});
