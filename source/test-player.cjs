const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const {parseHTML}=require('linkedom');const {IDBFactory}=require('fake-indexeddb');
const base=path.resolve(__dirname,'..');
const css={surface:'#ffffff',line:'#dfdad3',fg:'#201d1b',muted:'#6e675f',high:'#f72bd2',low:'#32edff','on-accent':'#151515','key-white':'#ffffff','key-black':'#121212','key-edge':'#aaaaaa',raised:'#f0ede8'};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(db){
 const {window}=parseHTML(fs.readFileSync(base+'/index.html','utf8')),doc=window.document;const errors=[],fills=[];
 const canvas=doc.getElementById('roll'),viewport=doc.getElementById('canvasViewport');for(const [el,key,value] of [[canvas,'clientWidth',343],[canvas,'clientHeight',320],[viewport,'clientWidth',343]])Object.defineProperty(el,key,{value,configurable:true});
 const context2d=new Proxy({measureText:s=>({width:s.length*8}),fillRect(){fills.push(this.fillStyle);}}, {get(target,key){return key in target?target[key]:()=>{};},set(target,key,value){target[key]=value;return true;}});canvas.getContext=()=>context2d;
 for(const el of doc.querySelectorAll('select')){let value=el.querySelector('[selected]')?.getAttribute('value')??el.querySelector('option')?.getAttribute('value')??el.querySelector('option')?.textContent??'';Object.defineProperty(el,'value',{get(){return value;},set(v){value=String(v);},configurable:true});}
 for(const el of doc.querySelectorAll('*'))el.scrollIntoView=()=>{};
 const store=new Map();const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 class AC{constructor(){this.state='running';this.currentTime=0;this.destination={};}createGain(){return {gain:{value:0},connect(){},disconnect(){}};}createDynamicsCompressor(){return {connect(){}};}decodeAudioData(buf,res){const value={duration:1};res?.(value);return Promise.resolve(value);}resume(){return Promise.resolve();}}
 const sandbox={window,document:doc,localStorage,indexedDB:db,navigator:{storage:{persist:async()=>true}},location:{protocol:'https:'},URL,Blob,File,Response,Request,Headers,AbortController,AbortSignal,Uint8Array,Uint32Array,Float32Array,DataView,TextDecoder,Promise,Map,Set,Date,Math,JSON,Number,Array,console,setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},CustomEvent:window.CustomEvent,MutationObserver:class{observe(){}},getComputedStyle:()=>({getPropertyValue:k=>css[k.replace(/^--/,'')]||'',fontFamily:'system-ui'})};
 window.matchMedia=()=>({matches:false,addEventListener(){}});window.devicePixelRatio=1;window.AudioContext=AC;
 sandbox.fetch=async raw=>{const pathname=String(raw).split('?')[0];const data=fs.readFileSync(path.join(base,pathname));return new Response(data,{headers:{'content-type':pathname.endsWith('.json')?'application/json':'audio/mpeg'}});};window.fetch=sandbox.fetch;
 const ctx=vm.createContext(sandbox);for(const name of ['library.js','player.js','catalogue-model.js','library-ui.js']){try{vm.runInContext(fs.readFileSync(base+'/'+name,'utf8'),ctx,{filename:name});if(window.SongLibrary)ctx.SongLibrary=window.SongLibrary;}catch(e){errors.push(e);}}
 assert.equal(errors.length,0,errors.map(x=>x.stack).join('\n'));await window.ScrollPlayer.ready();await pause(80);return {window,doc,fills};
}
(async()=>{
 const db=new IDBFactory(),a=await boot(db);assert.equal(a.doc.getElementById('songName').textContent,'Choose a song');assert.equal(a.doc.getElementById('play').disabled,true);assert.equal(a.doc.getElementById('emptyPlayer').hidden,false);assert.ok(a.fills.includes('#000000'));assert.equal(a.doc.getElementById('colL').value,'#32edff');assert.equal(a.doc.getElementById('colR').value,'#f72bd2');
 assert.equal(a.doc.querySelectorAll('.song-card').length,30);const count=a.doc.getElementById('libraryCount').textContent;assert.ok(count.includes('1,644'),count);
 const catalogue=JSON.parse(fs.readFileSync(base+'/catalogue.json'));const modern=catalogue.find(x=>x.artist==='Lana Del Rey'&&x.file);await a.window.ScrollPlayer.openShared(modern);assert.equal(a.doc.getElementById('songName').textContent,modern.title);assert.equal(a.doc.getElementById('emptyPlayer').hidden,true);assert.equal(a.doc.getElementById('play').disabled,false);assert.equal(a.window.ScrollPlayer.saved().length,1);
 a.doc.getElementById('play').click();await pause(120);assert.ok(a.window.ScrollPlayer.saved()[0].playedAt>0);
 const reopened=await boot(db);assert.equal(reopened.window.ScrollPlayer.saved().length,1);assert.equal(reopened.doc.getElementById('songName').textContent,'Choose a song');
 const other=await boot(new IDBFactory());assert.equal(other.window.ScrollPlayer.saved().length,0);
 console.log('PASS: empty start, black canvas, requested colours, 1,644-song pagination, real-score opening, saved notes, recent play, reopening and separate browser libraries.');
})().catch(e=>{console.error(e);process.exitCode=1;});
