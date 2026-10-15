const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
test('patched URI decoder preserves SDK 57 query-string parsing and bounds malformed input',()=>{
 const query=require('query-string');const value={q:'#Riset kampus ☕',username:'nama_user',cursor:'a+b/c=='};assert.deepEqual({...query.parse(query.stringify(value))},value);
 execFileSync(process.execPath,['-e',"const q=require('query-string');const r=q.parse('q='+('%ED%A0%80'.repeat(1000)));if(typeof r.q!=='string')process.exit(1);"],{timeout:3000,stdio:'pipe'});
});
test('patched uuid retains xcode identifier generation',()=>{
 const xcode=require('xcode');const project=xcode.project('unused-test-only.xcodeproj');project.hash={project:{objects:{}}};const id=project.generateUuid();assert.match(id,/^[0-9A-F]{24}$/);
});
