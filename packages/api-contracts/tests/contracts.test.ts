import test from 'node:test';
import assert from 'node:assert/strict';
import {authFormSchema,registrationSchema,userSchema} from '../src/index.ts';
import {messagesSchema} from '../src/communications.ts';
const valid={name:'Nadia Putri',username:'nadia',email:'nadia@example.test',password:'SecurePassword123',password_confirmation:'SecurePassword123'};

test('read receipt contract accepts older APIs and validates the recipient watermark',()=>{
 const page={data:[],user:{id:2,name:'Nadia',username:'nadia'},next_cursor:null,can_send:true};
 assert.equal(messagesSchema.parse(page).recipient_read_message_id,0);
 assert.equal(messagesSchema.parse({...page,recipient_read_message_id:42}).recipient_read_message_id,42);
 assert.equal(messagesSchema.safeParse({...page,recipient_read_message_id:-1}).success,false);
});
test('registration requires strong matching credentials and canonical username',()=>{
 assert.equal(registrationSchema.safeParse(valid).success,true);
 for(const change of [{password:'short'},{password_confirmation:'DifferentPassword123'},{username:'Nadia'},{username:'admin<script>'},{email:'invalid'}])assert.equal(registrationSchema.safeParse({...valid,...change}).success,false);
});
test('login can authenticate an existing password independently of registration strength',()=>{
 assert.equal(authFormSchema('login').safeParse({email:'nadia@example.test',password:'existing-password'}).success,true);
 assert.equal(authFormSchema('register').safeParse({email:'nadia@example.test',password:'existing-password'}).success,false);
});
test('response schema rejects malformed resource data and strips unexpected fields',()=>{
 const user={id:1,name:'Nadia',username:'nadia',verified:true,bio:null,location:null,avatar_url:null,cover_url:null,links:[],interests:[],academic_visible:false,private_account:false,institution:null,faculty:null,department:null,cohort:null,affiliation:null};
 assert.equal(userSchema.safeParse({...user,id:'1'}).success,false);
 const result=userSchema.parse({...user,password:'must-never-exist',role:'administrator'});
 assert.equal('password' in result,false);assert.equal('role' in result,false);
});
