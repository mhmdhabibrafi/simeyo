import {randomBytes} from 'node:crypto';
import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
for(const file of ['.env','apps/api/.env','apps/web/.env.local']){
 const destination=resolve(root,file);try{await access(destination);continue;}catch{}
 let template=await readFile(resolve(root,file==='apps/web/.env.local'?'apps/web/.env.example':`${file}.example`),'utf8');
 for(const key of ['POSTGRES_PASSWORD','MINIO_ROOT_PASSWORD','MEILI_MASTER_KEY','DB_PASSWORD','DEMO_PASSWORD','REVERB_APP_KEY','REVERB_APP_SECRET'])template=template.replace(new RegExp(`^${key}=$`,'m'),`${key}=${randomBytes(24).toString('hex')}`);
 if(file==='apps/api/.env')template=template.replace(/^APP_KEY=$/m,`APP_KEY=base64:${randomBytes(32).toString('base64')}`);
 await writeFile(destination,template,{mode:0o600});console.log(`Created ${file}; secrets are not printed.`);
}
// Existing local workspaces may predate realtime. Fill only missing Compose signing keys.
const composeFile=resolve(root,'.env');
let compose=await readFile(composeFile,'utf8');
let changed=false;
for(const key of ['REVERB_APP_KEY','REVERB_APP_SECRET']){
 const expression=new RegExp(`^${key}=.*$`,'m');
 if(compose.match(expression)?.[0].slice(key.length+1).trim())continue;
 const entry=`${key}=${randomBytes(24).toString('hex')}`;
 compose=expression.test(compose)?compose.replace(expression,entry):`${compose.trimEnd()}\n${entry}\n`;
 changed=true;
}
if(changed){await writeFile(composeFile,compose,{mode:0o600});console.log('Filled missing local Compose signing keys; existing credentials preserved.');}
