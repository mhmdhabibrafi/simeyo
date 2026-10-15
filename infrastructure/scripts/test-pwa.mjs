import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'../..');const apiEnv=resolve(root,'apps/api/.env');
let environment=await readFile(apiEnv,'utf8');
if(!/^APP_ENV=local\r?$/m.test(environment))throw new Error('PWA acceptance uses the project-local API only.');
const name='SANCTUM_STATEFUL_DOMAINS';const pattern=new RegExp(`^${name}=(.*)$`,'m');
const original=environment.match(pattern)?.[1].trim()??'localhost:3000,localhost:8000';
const addition='localhost:3001';const added=!original.split(',').includes(addition);
if(added){const line=`${name}=${original},${addition}`;environment=pattern.test(environment)?environment.replace(pattern,line):`${environment.trimEnd()}\n${line}\n`;await writeFile(apiEnv,environment);}
const server=spawn(process.execPath,[resolve(root,'apps/web/node_modules/next/dist/bin/next'),'start','--hostname','localhost','--port','3001'],{cwd:resolve(root,'apps/web'),stdio:'inherit'});
let exitCode=1;
try{
 let ready=false;for(let attempts=0;attempts<60;attempts++){try{const r=await fetch('http://localhost:3001/login');if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 if(!ready)throw new Error('Local production preview did not start.');
 exitCode=await new Promise(resolveCode=>{const tests=spawn(process.execPath,[resolve(root,'apps/web/node_modules/@playwright/test/cli.js'),'test','--config=playwright.pwa.config.ts'],{cwd:resolve(root,'apps/web'),stdio:'inherit'});tests.on('exit',code=>resolveCode(code??1));});
}finally{
 server.kill();
 if(added){const latest=await readFile(apiEnv,'utf8');const domains=latest.match(pattern)?.[1].trim().split(',').filter(value=>value!==addition).join(',');if(domains)await writeFile(apiEnv,latest.replace(pattern,`${name}=${domains}`));}
}
process.exit(exitCode);
