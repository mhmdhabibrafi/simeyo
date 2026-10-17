import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync(new URL('../src/lib/api.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {uploadWithProgress,ApiError}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

test('upload uses the CSRF session, reports transferred bytes and distinguishes server failure', async () => {
  const previous = { fetch: globalThis.fetch, document: globalThis.document, XMLHttpRequest: globalThis.XMLHttpRequest };
  const instances = [];
  class FakeXHR {
    upload = {}; headers = {}; status = 201; responseText = '{"data":{"id":1}}';
    constructor() { instances.push(this); }
    open(method,url) { this.method=method;this.url=url; }
    setRequestHeader(key,value) { this.headers[key.toLowerCase()]=value; }
    send(body) { this.body=body; }
    abort() { this.onabort?.();this.onloadend?.(); }
    finish() { this.onload?.();this.onloadend?.(); }
  }
  try {
    let csrf=0;
    globalThis.document={cookie:'XSRF-TOKEN=synthetic%3Dtoken'};
    globalThis.fetch=async () => {csrf++;return {ok:true};};
    globalThis.XMLHttpRequest=FakeXHR;
    const form=new FormData();form.set('image',new Blob(['test']),'photo.png');
    const progress=[];
    const result=uploadWithProgress('media/posts',form,p=>progress.push(p),new AbortController().signal);
    await new Promise(resolve=>setImmediate(resolve));
    const xhr=instances[0];
    assert.equal(csrf,1);assert.equal(xhr.withCredentials,true);assert.equal(xhr.headers['x-xsrf-token'],'synthetic=token');
    assert.equal(xhr.headers['content-type'],undefined);assert.equal(xhr.body,form);
    xhr.upload.onprogress({lengthComputable:true,loaded:25,total:100});
    xhr.upload.onprogress({lengthComputable:false,loaded:50,total:0});
    xhr.upload.onprogress({lengthComputable:true,loaded:100,total:100});
    xhr.finish();assert.deepEqual(await result,{data:{id:1}});assert.deepEqual(progress,[25,100]);
    const failure=uploadWithProgress('media/posts',form,()=>{},new AbortController().signal);
    await new Promise(resolve=>setImmediate(resolve));
    instances[1].status=422;instances[1].responseText='{"message":"Invalid image","errors":{"image":["Invalid"]}}';instances[1].finish();
    await assert.rejects(failure,e=>e instanceof ApiError && e.status===422 && e.errors.image[0]==='Invalid');
    const controller=new AbortController();
    const aborted=uploadWithProgress('media/posts',form,()=>{},controller.signal);
    await new Promise(resolve=>setImmediate(resolve));controller.abort();
    await assert.rejects(aborted,{name:'AbortError'});
    globalThis.fetch=async()=>({ok:false,status:419});
    await assert.rejects(uploadWithProgress('media/posts',form,()=>{},new AbortController().signal),e=>e.status===419);
    assert.equal(instances.length,3);
  } finally { Object.assign(globalThis,previous); }
});
