import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const root=resolve(import.meta.dirname,'../..');
const file=resolve(root,'apps/api/.env');
let contents=await readFile(file,'utf8');
if(!/^APP_ENV=local\r?$/m.test(contents)) throw new Error('This helper is for the project-local environment only.');
const values={BROADCAST_CONNECTION:'reverb',REVERB_APP_ID:'ruang-local',REVERB_APP_KEY:randomBytes(16).toString('hex'),REVERB_APP_SECRET:randomBytes(32).toString('hex'),REVERB_HOST:'localhost',REVERB_PORT:'8080',REVERB_SCHEME:'http',REVERB_SERVER_HOST:'127.0.0.1',REVERB_SERVER_PORT:'8080'};
for(const [key,value] of Object.entries(values)) {
 const pattern=new RegExp(`^${key}=.*$`,'m');
 const existing=contents.match(pattern)?.[0].slice(key.length+1).trim();
 if(key.includes('APP_')&&existing&&existing!=='null') continue;
 contents=pattern.test(contents)?contents.replace(pattern,`${key}=${value}`):`${contents.trimEnd()}\n${key}=${value}\n`;
}
await writeFile(file,contents,'utf8');
const mode=process.argv[2]??'server';
const args=mode==='worker'?['queue:work','--sleep=1','--tries=3','--timeout=30']:['reverb:start','--host=127.0.0.1','--port=8080'];
console.log(`Starting project-local ${mode==='worker'?'queue worker':'Reverb'}; credentials stay in the ignored API environment.`);
const child=spawn('php',['-d','extension=pdo_pgsql','artisan',...args],{cwd:resolve(root,'apps/api'),stdio:'inherit'});
child.on('exit',code=>process.exit(code??1));
