const CACHE='scroll-play-e5596f817405';
const CORE=['./','index.html','app.css','library.js','player.js','catalogue-model.js','library-ui.js','manifest.webmanifest','help.html','credits.html','icons/scroll-play-icon.png','assets/scroll-play-logo.jpg','basic-pitch.js','model-data.js','catalogue.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('piano-codex-')||key.startsWith('scroll-play-'))&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.pathname.includes('/api/'))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request.mode==='navigate'?new Request(event.request,{cache:'no-cache'}):event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}catch(e){const saved=await cache.match(event.request);if(saved)return saved;if(event.request.mode==='navigate'){const home=await cache.match('index.html');if(home)return home;}throw e;}})());
});
