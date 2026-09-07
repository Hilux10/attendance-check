/* סרוויס וורקר — שומר את מעטפת האפליקציה כדי שתיפתח מיידית וגם ללא רשת.
   הסריקה עצמה תמיד דורשת אינטרנט. */
const CACHE = 'ekbd-v5';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;                              // בקשות לאיי-פי-איי
  if(new URL(req.url).origin !== self.location.origin) return;  // תמיד מהרשת
  e.respondWith(
    caches.match(req).then(hit=>{
      if(hit){
        fetch(req).then(res=>{ if(res.ok) caches.open(CACHE).then(c=>c.put(req,res)); }).catch(()=>{});
        return hit;
      }
      return fetch(req).catch(()=>caches.match('./index.html'));
    })
  );
});
