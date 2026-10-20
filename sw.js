const CACHE = 'family-hub-v21-general-greetings';
const CORE = ['./family-fun.js', './family-fun.css', './push-settings.js', './user-style.js', './user-style.css', './data-format.js', './data-management.js', './assets/family-pixar-final.webp', './', './index.html', './months.js', './month-controls.js', './vendor/supabase-2.118.0.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './family-hub-apple-v14.png', './apple-touch-icon-precomposed.png'];
const CORE_URLS = new Set(CORE.map(path => new URL(path, self.location.href).href));
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});
self.addEventListener('activate', event => event.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('family-hub-') && key !== CACHE).map(key => caches.delete(key))))
])));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Only cache the app shell. Account, family and authentication responses must never be cached.
  if (request.method !== 'GET' || url.origin !== self.location.origin || (!CORE_URLS.has(url.href) && request.mode !== 'navigate')) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok && !response.redirected && CORE_URLS.has(url.href)) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    return Response.error();
  }));
});

// Push payloads never choose arbitrary titles, URLs or lock-screen financial details.
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{}}catch{}
 const titles={task_assigned:'✅ عندك مهمة جديدة / New task',task_reminder:'⏰ تذكير بمهمة / Task reminder',task_completed:'👏 مهمة خلصت / Task completed',goal_contribution:'💻 مساهمة لهدف الكمبيوتر / Computer goal contribution',goal_completed:'🎉 هدف الكمبيوتر اكتمل / Computer goal completed'};
 const kind=Object.hasOwn(titles,payload.kind)?payload.kind:'update';
 const page=kind.startsWith('goal_')?'goals':'tasks';
 const eventId=String(payload.event_id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
 event.waitUntil(self.registration.showNotification(titles[kind]||'Family Hub — تحديث جديد',{
  body:'افتح التطبيق لمتابعة التفاصيل / Open the app for details',icon:new URL('./icon-192.png',self.registration.scope).href,
  tag:eventId?'family-hub-'+eventId:undefined,data:{page},dir:'auto'
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const page=event.notification.data?.page==='goals'?'goals':'tasks';
 event.waitUntil((async()=>{const scope=new URL(self.registration.scope);const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const app=windows.find(c=>{const u=new URL(c.url);return u.origin===scope.origin&&u.pathname.startsWith(scope.pathname)});if(app){await app.focus();app.postMessage({type:'FH_NOTIFICATION_OPEN',page});return}const target=new URL('./',scope);target.searchParams.set('notification',page);await self.clients.openWindow(target.href)})());
});
