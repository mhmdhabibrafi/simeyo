import test from "node:test";
import assert from "node:assert/strict";
import {readProfileDraft,saveProfileDraft,clearProfileDraft} from "../src/lib/profile-draft.ts";
const values={name:"Alya",username:"alya",bio:"Draft",location:"",links:"",interests:"",academic_visible:false,private_account:true};
function storage() {const items={};globalThis.sessionStorage={getItem:key=>items[key]??null,setItem:(key,value)=>{items[key]=value;},removeItem:key=>delete items[key]};return items;}
test("profile drafts isolate accounts, expire, validate and tolerate unavailable storage",()=>{
 const items=storage();assert.equal(saveProfileDraft(1,values),true);assert.deepEqual(readProfileDraft(1),values);assert.equal(readProfileDraft(2),null);
 items["simeyo-profile-draft:1"]=JSON.stringify({at:Date.now()-86400001,values});assert.equal(readProfileDraft(1),null);
 items["simeyo-profile-draft:1"]=JSON.stringify({at:Date.now(),values:{...values,bio:"x".repeat(501)}});assert.equal(readProfileDraft(1),null);
 globalThis.sessionStorage={getItem(){throw new Error("blocked");},setItem(){throw new Error("blocked");},removeItem(){throw new Error("blocked");}};
 assert.equal(saveProfileDraft(1,values),false);assert.equal(readProfileDraft(1),null);assert.doesNotThrow(()=>clearProfileDraft(1));
});
test("logout removes only profile drafts and explicit discard clears the selected account",()=>{
 const items=storage();saveProfileDraft(1,values);saveProfileDraft(2,values);items["another-app"]="keep";
 clearProfileDraft(1);assert.equal(readProfileDraft(1),null);assert.deepEqual(readProfileDraft(2),values);
 // sessionStorage keys are enumerable in browsers.
 Object.assign(globalThis.sessionStorage,items);globalThis.sessionStorage.removeItem=key=>{delete items[key];delete globalThis.sessionStorage[key];};
 clearProfileDraft();assert.equal(readProfileDraft(2),null);assert.equal(items["another-app"],"keep");
});
