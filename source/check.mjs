import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const html=readFileSync(join(root,'index.html'),'utf8');
assert.match(html,/scROLL_PLAY/);assert.match(html,/CODEX/);
assert.ok(!html.includes('window.claude'));assert.ok(!html.includes('/api/yt-fetch'));
for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(script[1]);
for(const file of ['library.js','sw.js'])new Script(readFileSync(join(root,file),'utf8'));
for(const path of ['basic-pitch.js','model-data.js','library.js','youtube-client.js','manifest.webmanifest','help.html','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable.png','icons/scroll-play-icon.png','assets/scroll-play-logo.jpg'])assert.ok(existsSync(join(root,path)),path);
const manifest=JSON.parse(readFileSync(join(root,'manifest.webmanifest'),'utf8'));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.name,'scROLL_PLAY');
const index=JSON.parse(readFileSync(join(root,'lib/index.json'),'utf8'));assert.equal(index.length,300);
const chunks=new Map();let notes=0;
for(const row of index){
 assert.match(row.k,/^c\d\d\.json$/);if(!chunks.has(row.k))chunks.set(row.k,JSON.parse(readFileSync(join(root,'lib',row.k),'utf8')));
 const flat=chunks.get(row.k)[row.i].split(',').map(Number);assert.ok(flat.length>0&&flat.length%5===0,row.t);
 for(let i=0;i<flat.length;i+=5){assert.ok(flat.slice(i,i+5).every(Number.isFinite),row.t);assert.ok(flat[i]>=0&&flat[i+1]>0&&flat[i+2]>=0&&flat[i+2]<=127,row.t);assert.ok([0,1,2].includes(flat[i+4]),row.t);notes++;}
}
for(const entry of readdirSync(root))assert.ok(!entry.toLowerCase().endsWith('.pdf'),'Personal PDFs must not be deployed');
console.log(`Codex app checks passed: ${index.length} pieces, ${notes} notes, ${chunks.size} library chunks; HTML scripts and service worker parse.`);
