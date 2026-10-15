import EmbeddedPostgres from 'embedded-postgres';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const state=resolve(root,'.local');await mkdir(state,{recursive:true});
let password;try{password=(await readFile(resolve(state,'postgres-password'),'utf8')).trim();}catch{password=randomBytes(24).toString('hex');await writeFile(resolve(state,'postgres-password'),password,{mode:0o600});}
const pg=new EmbeddedPostgres({databaseDir:resolve(state,'postgres'),user:'ruang_local',password,port:55439,persistent:true,authMethod:'scram-sha-256',postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:message=>{if(String(message).includes('FATAL'))console.error(String(message));}});
try{await access(resolve(state,'postgres','PG_VERSION'));}catch{await pg.initialise();}
await pg.start();
const client=pg.getPgClient();await client.connect();
for(const name of ['ruang','ruang_test']){const result=await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[name]);if(!result.rowCount)await client.query(`CREATE DATABASE ${name}`);}
await client.end();
const envPath=resolve(root,'apps/api/.env');let env=await readFile(envPath,'utf8');
const settings={APP_NAME:'Simeyo',DB_CONNECTION:'pgsql',DB_HOST:'127.0.0.1',DB_PORT:'55439',DB_DATABASE:'ruang',DB_USERNAME:'ruang_local',DB_PASSWORD:password,APP_URL:'http://localhost:8000',FRONTEND_URL:'http://localhost:3000',SANCTUM_STATEFUL_DOMAINS:'localhost:3000,localhost:8000',SESSION_DOMAIN:'null',SESSION_SECURE_COOKIE:'false',SESSION_SAME_SITE:'lax',SESSION_LIFETIME:'120',DEMO_PASSWORD:randomBytes(18).toString('base64url')};
for(const [key,value] of Object.entries(settings)){const line=new RegExp(`^#?\\s*${key}=.*$`,'m');if(key==='DEMO_PASSWORD' && new RegExp(`^${key}=.+$`,'m').test(env))continue;env=line.test(env)?env.replace(line,`${key}=${value}`):`${env}\n${key}=${value}`;}
await writeFile(envPath,env);
await writeFile(resolve(state,'postgres-test-env.json'),JSON.stringify({...settings,DB_DATABASE:'ruang_test',APP_ENV:'testing'}),{mode:0o600});
console.log('Simeyo PostgreSQL ready at 127.0.0.1:55439. Project-local .env configured; credentials not printed. Ctrl+C stops this server.');
let stopping=false;async function stop(){if(stopping)return;stopping=true;await pg.stop();process.exit(0);}process.on('SIGINT',stop);process.on('SIGTERM',stop);
setInterval(()=>{},1000);
