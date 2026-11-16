import {readFileSync,readdirSync,existsSync} from 'node:fs';import {join,resolve} from 'node:path';import {Script} from 'node:vm';import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),html=readFileSync(join(root,'index.html'),'utf8');
assert.match(html,/<title>scROLL_PLAY<\/title>/);assert.ok(!html.includes('CODEX'));assert.ok(!html.includes('youtubeForm'));assert.ok(!html.includes('Ode to Joy'));
for(const file of ['library.js','player.js','library-ui.js','catalogue-model.js','cloud-library.js','account-ui.js','sw.js'])new Script(readFileSync(join(root,file),'utf8'),{filename:file});
for(const path of ['basic-pitch.js','model-data.js','library.js','player.js','library-ui.js','catalogue-model.js','app.css','manifest.webmanifest','help.html','catalogue.json','icons/scroll-play-icon.png','assets/scroll-play-logo.jpg'])assert.ok(existsSync(join(root,path)),path);
const manifest=JSON.parse(readFileSync(join(root,'manifest.webmanifest'),'utf8'));assert.equal(manifest.scope,'./');assert.equal(manifest.name,'scROLL_PLAY');
const index=JSON.parse(readFileSync(join(root,'catalogue.json'),'utf8'));assert.equal(index.length,1644);assert.equal(index.filter(r=>r.file).length,1344);
for(const row of index){if(!row.legacyChunk)continue;const chunk=JSON.parse(readFileSync(join(root,'lib',row.legacyChunk),'utf8'));const flat=chunk[row.legacyIndex].split(',').map(Number);assert.ok(flat.length>0&&flat.length%5===0,row.title);assert.ok(flat.every(Number.isFinite),row.title);}
for(const entry of readdirSync(root))assert.ok(!entry.toLowerCase().endsWith('.pdf'));
console.log('App checks passed: clean landing, no unwanted demo or YouTube controls, scripts parse, 1,644 playable catalogue entries.');
