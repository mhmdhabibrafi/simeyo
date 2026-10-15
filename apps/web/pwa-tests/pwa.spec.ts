import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'../../..');
const password=readFileSync(path.join(root,'apps/api/.env'),'utf8').match(/^DEMO_PASSWORD=(.+)$/m)?.[1].trim();
test('production PWA manifest, real service worker, private-cache exclusion and offline navigation',async({page,context})=>{
 const users=JSON.parse(execFileSync('php',['-d','extension=pdo_pgsql',path.join(root,'infrastructure/scripts/e2e-social-fixture.php'),Date.now().toString(36)],{cwd:root,encoding:'utf8'}));
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(users.a.email);await page.getByLabel('Kata sandi',{exact:true}).fill(password!);await page.getByRole('button',{name:'Masuk',exact:true}).click();await expect(page).toHaveURL('http://localhost:3001/home');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
 const manifest=await (await context.request.get('/manifest.webmanifest')).json();expect(manifest.name).toBe('Simeyo');expect(manifest.display).toBe('standalone');expect(manifest.icons).toHaveLength(3);
 const session=await context.newCDPSession(page);const appManifest=await session.send('Page.getAppManifest');expect(appManifest.errors).toEqual([]);
 const worker=await context.request.get('/sw.js');expect(worker.headers()['cache-control']).toContain('no-store');
 const privateResource=await page.evaluate(async()=>{const response=await fetch('/api/v1/me',{credentials:'include'});return {status:response.status,cache:response.headers.get('cache-control'),user:(await response.json()).data.username};});expect(privateResource.status).toBe(200);expect(privateResource.cache).toContain('no-store');expect(privateResource.user).toBe(users.a.username);
 const cacheURLs=await page.evaluate(async()=>{const urls:string[]=[];for(const key of await caches.keys())for(const request of await (await caches.open(key)).keys())urls.push(new URL(request.url).pathname);return urls;});expect(cacheURLs).toContain('/offline.html');expect(cacheURLs.filter(url=>!url.startsWith('/_next/static/')&&!url.startsWith('/icons/')&&url!=='/offline.html')).toEqual([]);
 await context.setOffline(true);const apiOnline=await page.evaluate(async()=>fetch('/api/v1/me').then(()=>true).catch(()=>false));expect(apiOnline).toBe(false);
 await page.goto('/messages');await expect(page.getByRole('heading',{name:'Kita tersambung lagi nanti.'})).toBeVisible();await expect(page.getByText(users.a.username)).toHaveCount(0);await page.screenshot({path:path.join(root,'docs/testing/screenshots/pwa-offline.png'),fullPage:true});
 await context.setOffline(false);await page.goto('/home');await expect(page.getByRole('heading',{name:'Beranda',exact:true})).toBeVisible();
});
