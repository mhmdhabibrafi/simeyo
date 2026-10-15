import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApiClient,createSessionTransport,normalizeOrigin,ApiError} from '../src/lib/client.ts';
import {notificationTarget} from '../src/lib/notification-target.ts';
test('API origin validation requires production HTTPS and rejects credential/query injection',()=>{
 assert.equal(normalizeOrigin('https://campus.example',false),'https://campus.example');
 assert.equal(normalizeOrigin('http://10.0.2.2:8000',true),'http://10.0.2.2:8000');
 for(const url of ['http://campus.example','https://u:p@campus.example','https://campus.example/path','https://campus.example?token=x','file:///tmp'])assert.throws(()=>normalizeOrigin(url,false));
});
test('native client uses only bearer auth, refuses path escapes and preserves JSON errors',async()=>{
 const original=globalThis.fetch;let expired='';
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://campus.example/api/v1/me');assert.equal(options?.credentials,'omit');assert.equal(options?.redirect,'error');assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer synthetic-token');return new Response(JSON.stringify({data:{id:1}}),{headers:{'Content-Type':'application/json'}});};
 try{const api=createApiClient('https://campus.example',()=> 'synthetic-token',token=>{expired=token;});assert.deepEqual(await api('me'),{data:{id:1}});await assert.rejects(api('../../outside'),e=>e instanceof ApiError&&e.status===400);assert.equal(expired,'');
 globalThis.fetch=async()=>new Response(JSON.stringify({message:'Ditolak',errors:{body:['Terlalu panjang']}}),{status:422});await assert.rejects(api('me'),e=>e instanceof ApiError&&e.status===422&&e.errors.body[0]==='Terlalu panjang');
 globalThis.fetch=async()=>new Response('<html>broken</html>',{status:502});await assert.rejects(api('me'),e=>e instanceof ApiError&&e.status===502);
 }finally{globalThis.fetch=original;}
});
test('an old 401 cannot sign out the next account',async()=>{
 const original=globalThis.fetch;let response:(value:Response)=>void=()=>{};let cleared=0;globalThis.fetch=()=>new Promise(resolve=>{response=resolve;});
 try{const transport=createSessionTransport('https://campus.example',()=>{cleared++;});transport.setToken('old');const old=transport.api('me').catch(e=>e);transport.setToken('new');response(new Response('{}',{status:401}));await old;assert.equal(transport.getToken(),'new');assert.equal(cleared,0);
 const current=transport.api('me').catch(e=>e);response(new Response('{}',{status:401}));await current;assert.equal(transport.getToken(),null);assert.equal(cleared,1);
 }finally{globalThis.fetch=original;}
});
test('push targets are bound to current account and never use an arbitrary URL',()=>{
 const id='019a0000-1234-4123-8123-123456789abc';assert.equal(notificationTarget({user_id:2,notification_id:id,url:'https://evil.example'},2),id);assert.equal(notificationTarget({user_id:3,notification_id:id},2),null);assert.equal(notificationTarget({user_id:2,notification_id:'../messages'},2),null);assert.equal(notificationTarget(undefined,2),null);
});
test('a retained push response cannot reopen activity after a profile refresh',()=>{
 const id='019a0000-1234-4123-8123-123456789abc';
 const data={user_id:2,notification_id:id};
 assert.equal(notificationTarget(data,2),id);
 assert.equal(notificationTarget(data,2,id),null);
 assert.equal(notificationTarget(data,3),null);
 assert.equal(notificationTarget({...data,notification_id:'019a0000-1234-4123-8123-123456789abd'},2,id),'019a0000-1234-4123-8123-123456789abd');
});
