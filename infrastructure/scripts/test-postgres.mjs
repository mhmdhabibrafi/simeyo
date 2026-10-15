import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const saved=JSON.parse(await readFile(resolve(root,'.local/postgres-test-env.json'),'utf8'));
if(saved.DB_DATABASE!=='ruang_test')throw new Error('Tests require the isolated ruang_test database.');
const child=spawn('php',['-d','extension=pdo_pgsql','vendor/phpunit/phpunit/phpunit'],{cwd:resolve(root,'apps/api'),env:{...process.env,...saved},stdio:'inherit'});
child.on('exit',code=>process.exit(code??1));
