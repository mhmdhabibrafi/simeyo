const CACHE = 'simeyo-public-v0.4.0-monochrome';
const PUBLIC = ['/offline.html','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if((name.startsWith('ruang-public-')||name.startsWith('simeyo-public-'))&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(['/api/','/sanctum/','/media/'].some(prefix=>url.pathname.startsWith(prefix)))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>await caches.match('/offline.html')||Response.error()));return;
 }
 // Only immutable app code and public icons are cached. API, media and RSC data never enter Cache Storage.
 if(!url.pathname.startsWith('/_next/static/')&&!PUBLIC.includes(url.pathname))return;
 event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;})());
});
