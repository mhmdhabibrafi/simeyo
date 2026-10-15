import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'../../..');
const password=readFileSync(path.join(root,'apps/api/.env'),'utf8').match(/^DEMO_PASSWORD=(.+)$/m)?.[1].trim();
function fixture(){return JSON.parse(execFileSync('php',['-d','extension=pdo_pgsql',path.join(root,'infrastructure/scripts/e2e-social-fixture.php'),Date.now().toString(36)],{cwd:root,encoding:'utf8'}));}
async function login(page:Page,email:string){await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Kata sandi',{exact:true}).fill(password!);await page.getByRole('button',{name:'Masuk',exact:true}).click();await expect(page.getByRole('tab',{name:'Beranda',exact:true})).toBeVisible();}
test('Expo components use scoped API tokens for persisted posts, profiles and theme',async({page,browser})=>{
 const users=fixture();const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));
 await login(page,users.a.email);
 await page.getByRole('tab',{name:'Cerita',exact:true}).click();const body=`Cerita klien native ${Date.now()}`;await page.getByLabel('Tulis cerita',{exact:true}).fill(body);
 const posted=page.waitForResponse(r=>r.url().endsWith('/api/v1/posts')&&r.request().method()==='POST'&&r.status()===201);await page.getByRole('button',{name:'Bagikan',exact:true}).click();const response=await posted;const post=(await response.json()).data;
 await page.getByRole('tab',{name:'Beranda',exact:true}).click();await page.getByRole('tab',{name:'Kampus',exact:true}).click();await expect(page.getByText(body,{exact:true})).toBeVisible();
 const card=page.getByTestId(`post-${post.id}`);const liked=page.waitForResponse(r=>r.url().endsWith(`/posts/${post.id}/interactions/like`)&&r.request().method()==='PUT'&&r.status()===200);await card.getByRole('button',{name:'Sukai cerita',exact:true}).click();expect((await (await liked).json()).data.liked).toBe(true);await expect(card.getByRole('button',{name:'Sukai cerita',exact:true})).toContainText('♥ 1');
 await page.screenshot({path:path.join(root,'docs/testing/screenshots/native-feed-mobile.png'),fullPage:true});
 await page.getByRole('tab',{name:'Profil',exact:true}).click();await page.getByRole('button',{name:'Ubah profil',exact:true}).click();const bio=`Bio native ${Date.now()}`;await page.getByLabel('Bio',{exact:true}).fill(bio);const saved=page.waitForResponse(r=>r.url().endsWith('/api/v1/me')&&r.request().method()==='PATCH'&&r.status()===200);await page.getByRole('button',{name:'Simpan profil',exact:true}).click();await saved;await expect(page.getByText(bio,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Pengaturan',exact:true}).click();await page.getByRole('radio',{name:'Gelap',exact:true}).click();await page.screenshot({path:path.join(root,'docs/testing/screenshots/native-settings-dark.png'),fullPage:true});
 const observer=await browser.newContext({viewport:{width:390,height:844}});const second=await observer.newPage();await login(second,users.b.email);
 await second.getByRole('tab',{name:'Jelajahi',exact:true}).click();await second.getByRole('button',{name:'Temukan teman',exact:true}).click();await second.getByLabel('Cari nama atau username',{exact:true}).fill(users.a.username);await second.getByRole('button',{name:'Cari pengguna',exact:true}).click();await second.getByRole('link',{name:`Profil @${users.a.username}`,exact:true}).click();await expect(second.getByText(bio,{exact:true})).toBeVisible();
 const authorization=response.request().headers()['authorization'];expect(authorization).toMatch(/^Bearer /);
 const durable=await second.request.get(`http://localhost:8000/api/v1/posts/${post.id}`,{headers:{Authorization:authorization}});expect(durable.status()).toBe(200);expect((await durable.json()).data.body).toBe(body);
 expect(failures).toEqual([]);await observer.close();
});
