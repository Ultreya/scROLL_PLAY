// Codex scope only. Never remove caches belonging to another app or branch.
const CACHE='piano-codex-b42ef7ca88a4';
const CORE=['./','index.html','library.js','manifest.webmanifest','help.html','icons/scroll-play-icon.png','basic-pitch.js','model-data.js','lib/index.json','assets/scroll-play-logo.jpg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('piano-codex-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
  catch(e){const saved=await cache.match(event.request);if(saved)return saved;if(event.request.mode==='navigate'){const home=await cache.match('index.html');if(home)return home;}throw e;}
 })());
});
