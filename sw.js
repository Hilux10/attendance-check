/* ============================================================
   Recon service worker — מתעדכן מעצמו.

   אין כאן מספר גרסה שצריך לשנות בכל העלאה. הכלל פשוט:
   דפי HTML מגיעים תמיד מהרשת כשיש חיבור, והמטמון משמש
   רק כרשת ביטחון כשאין. נכסים סטטיים מוגשים מיד מהמטמון
   ומתרעננים ברקע.
   ============================================================ */

const SHELL_CACHE = 'recon-shell';

/* index.html במפורש אינו כאן — הוא לעולם לא נטען מראש */
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './rail-logo.png',
  './station.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      /* addAll נכשל כולו אם קובץ אחד חסר — לכן כל אחד בנפרד */
      .then(cache => Promise.all(ASSETS.map(u => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())          // נכנס לתוקף מיד
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())        // משתלט על הלשוניות הפתוחות
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // קריאות לשרת — תמיד מהרשת

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  /* ---------- HTML: רשת קודם, תמיד ---------- */
  if (isHTML) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then(c => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))    // רק כשאין רשת
    );
    return;
  }

  /* ---------- נכסים: מטמון קודם, רענון שקט ברקע ---------- */
  event.respondWith(
    caches.match(req).then(hit => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});
