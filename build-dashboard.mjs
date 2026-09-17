import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url)),source=path.join(root,'product/dashboard'),target=path.join(root,'site/va');
function copy(dir,rel=''){for(const entry of readdirSync(dir,{withFileTypes:true})){const name=path.join(rel,entry.name);if(entry.isDirectory())copy(path.join(dir,entry.name),name);else{const content=readFileSync(path.join(dir,entry.name),'utf8');if(/porschedigital|porsche-customer|VALUE STREAM CAR SALES|cdn\.ui\.porsche/i.test(content))throw Error('Customer reference in '+name);mkdirSync(path.dirname(path.join(target,name)),{recursive:true});writeFileSync(path.join(target,name),content);}}}
copy(source);
writeFileSync(path.join(target,'instance.js'),`// Display configuration; authentication remains in gate.php.
window.cockpitInstance=${JSON.stringify({name:'Vishnu Artists · Flow Cockpit',defaultTeam:'va',fullDashboard:true,jiraBase:'https://vishnuartists.atlassian.net',coordinationUrl:'index.html?legacy=1&go=fl2',successfulResolutions:['Done'],views:{va:{name:'Vishnu Artists',source:'va',project:'VA',projects:['VA','STA'],board:38,dataUrl:'va-data.json'}}},null,2)};\n`);
const entry=path.join(target,'index.html');
let html=readFileSync(entry,'utf8');
const marker='<!-- shared-dashboard-entry -->';
if(!html.includes(marker))html=html.replace('<head>',`<head>${marker}<script>(function(){const q=new URLSearchParams(location.search);if(!q.has('legacy')&&!q.has('go')&&!q.has('compass')&&!location.hash&&window.self===window.top)location.replace('home-v2.html'+location.search);})();</script>`);
writeFileSync(entry,html);
console.log('Shared dashboard propagated to site/va');
