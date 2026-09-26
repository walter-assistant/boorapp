const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const s=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/boorapp.js'),'utf8');
const code=s.slice(s.indexOf('async function startMilieuQuickscan()'),s.indexOf('function neemMilieuQuickscanOverInPva()'));
for(const fail of [false,true])test(fail?'BRO error cannot become clean result':'BRO hit affects conclusion, screen and saved PDF data',async()=>{
  const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{value:id==='mq-rdx'?'110708.99':id==='mq-rdy'?'515722.158':'',style:{},innerHTML:''});return elements.get(id);};
  const ctx={window:{},document:{getElementById:get},syncMilieuQuickscanFromOfferte(){},milieuQuickscanLog(){},numVal:Number,BODEMLOKET_LAGEN:[],runRegionaleLocatiecheck:async()=>({treffers:[],fouten:[]}),getOffertes:()=>[],getDropboxFieldValue:()=>'',fetch:async url=>{
    if(url.endsWith('bro-sld')&&fail)throw Error('offline');
    const data=url.endsWith('bro-sld')?{ok:true,sourceUpdated:'2026-09-24',results:[{broId:'SLD-test'}]}:url.endsWith('odnhn')?{ok:true,layers:[]}:{ok:true,inWerkgebied:false,layers:[],resultaten:[]};
    return {ok:true,json:async()=>data};
  }};
  vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.startMilieuQuickscan();
  assert.ok(ctx.window._lastMilieuQuickscan);
  const q=ctx.window._lastMilieuQuickscan;
  assert.equal(q.bro.ok,!fail);
  assert.match(q.conclusie,fail?/onvolledig/:/handmatig beoordelen/);
  assert.match(get('mq-resultaat').innerHTML,/BRO-SLD/);
  assert.match(q.dekking,/2031/);
});
