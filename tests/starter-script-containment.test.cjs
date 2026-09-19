const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {Script}=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
for(const file of ['site/flow-cockpit-starter.html','site/va/index.html']){
  test(`${file}: wizard is executable inline code, never external-script fallback`,()=>{
    const html=readFileSync(resolve(__dirname,'..',file),'utf8');
    const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    let wizard=0;
    for(const [,attributes,code] of scripts){
      if(/\bsrc\s*=/i.test(attributes)){
        assert.equal(code.trim(),'','external scripts must not contain ignored inline code');
      }else if(!/application\/json/i.test(attributes)){
        new Script(code,{filename:file});
        if(code.includes('function wizShow()')) wizard++;
      }
    }
    assert.equal(wizard,1,'exactly one executable wizard');
    assert.doesNotMatch(html,/<script[^>]+src=["'][^"']*(?:pb-i18n|avatare-loader)/i);
  });
}
