/* Workout Intelligence V2.1.2 — offline app shell. Bump VERSION on every release. */
'use strict';
const VERSION = '2.1.2';
const SCOPE = self.registration.scope;
const PREFIX = 'workout-intelligence:' + SCOPE + ':';
const CACHE = PREFIX + VERSION;
const SHELL = new URL('./index.html', SCOPE).href;
const FILES = ['index.html','manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'].map(f => new URL(f,SCOPE).href);
const STATIC = new Set(FILES);
const APP_PATHS = new Set(['./','./index.html','./index1.html','./Workout_Intelligence_V2.html'].map(f=>new URL(f,SCOPE).pathname));
self.addEventListener('install', event => {
  // Atomic precache: failed install never replaces the working active version.
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'})))));
  // On update, wait until the user confirms or all old tabs have closed.
});
self.addEventListener('activate', event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'&&APP_PATHS.has(url.pathname)){
    // Stable cached version even when a new release is being uploaded.
    event.respondWith((async()=>{
      const cached=await (await caches.open(CACHE)).match(SHELL);
      return cached||fetch(req);
    })());return;
  }
  if(STATIC.has(url.href))event.respondWith((async()=>{
    const cached=await (await caches.open(CACHE)).match(url.href);
    return cached||fetch(req);
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='REPAIR_CACHE'&&event.ports[0])event.waitUntil((async()=>{
    let ready=false;
    try{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'})));ready=true;}catch{}
    event.ports[0].postMessage({ready,version:VERSION});
  })());
  if(event.data?.type==='OFFLINE_STATUS'&&event.ports[0])event.waitUntil((async()=>{
    let ready=false;
    try{const cache=await caches.open(CACHE);ready=(await Promise.all(FILES.map(f=>cache.match(f)))).every(Boolean);}catch{}
    event.ports[0].postMessage({ready,version:VERSION});
  })());
});
