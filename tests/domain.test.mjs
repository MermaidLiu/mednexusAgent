import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace,applyCommand,commandSchema} from '../lib/domain.ts';
const at='2026-09-21T08:00:00.000Z';
test('patient creation validates and persists a group relationship without mutating original',()=>{
 const state=createWorkspace(at);const command=commandSchema.parse({type:'patient.create',name:'测试患者',age:38,gender:'未说明',phone:'',groupId:'g1',stage:'门诊随诊',note:'测试'});
 const next=applyCommand(state,command,{now:at,id:'test-patient'});assert.equal(state.patients.length,12);assert.equal(next.patients.length,13);assert.equal(next.patients[0].groupId,'g1');assert.equal(next.audit[0].action,'新增患者：测试患者');
 assert.throws(()=>applyCommand(state,{...command,groupId:'missing'}),/健康班不存在/);
});
test('invalid ages and empty names are rejected at boundary',()=>{
 assert.equal(commandSchema.safeParse({type:'patient.create',name:' ',age:140,gender:'男',phone:'',groupId:'g1',stage:'门诊随诊',note:''}).success,false);
});
test('consultation always enters human review; approval cannot run twice',()=>{
 const state=applyCommand(createWorkspace(at),{type:'consultation.create',patientId:'p1',question:'怎么复诊？'},{id:'test-consultation',now:at});
 assert.equal(state.consultations[0].status,'pending');assert.match(state.consultations[0].source,/模板/);
 const cmd={type:'review',id:'test-consultation',kind:'consultation',decision:'approved',body:'经医生确认的内容'};
 const next=applyCommand(state,cmd,{now:at});assert.equal(next.consultations[0].response,cmd.body);assert.equal(next.consultations[0].status,'approved');assert.match(next.audit[0].action,/未对外发送/);assert.throws(()=>applyCommand(next,cmd),/已审核/);
});
test('unknown patients cannot receive consultations or followups',()=>{
 assert.throws(()=>applyCommand(createWorkspace(at),{type:'consultation.create',patientId:'none',question:'test'}),/患者不存在/);
 assert.throws(()=>applyCommand(createWorkspace(at),{type:'followup.create',patientId:'none',title:'test',due:'2026-09-21',content:'test'}),/患者不存在/);
});
test('followup completion records result and prevents duplicate completion',()=>{
 const next=applyCommand(createWorkspace(at),{type:'followup.complete',id:'f1',result:'已完成电话沟通'},{now:at});assert.equal(next.followups[0].status,'completed');assert.equal(next.followups[0].result,'已完成电话沟通');assert.throws(()=>applyCommand(next,{type:'followup.complete',id:'f1',result:'重复'}),/已完成/);
});
test('impossible dates are rejected',()=>{
 assert.equal(commandSchema.safeParse({type:'followup.create',patientId:'p1',title:'test',due:'2026-02-30',content:'test'}).success,false);
});
test('content starts pending and review saves the edited body',()=>{
 const s=applyCommand(createWorkspace(at),{type:'content.create',title:'科普脚本',kind:'数字人脚本',body:'原始草稿'},{id:'video-script'});assert.equal(s.contents[0].status,'pending');
 const next=applyCommand(s,{type:'review',kind:'content',id:'video-script',decision:'approved',body:'医生修改的版本'});assert.equal(next.contents[0].body,'医生修改的版本');assert.equal(next.contents[0].videoUrl,undefined);
});
test('settings and knowledge are stored independently of existing records',()=>{
 const s=createWorkspace(at);const a=applyCommand(s,{type:'settings.update',doctor:'测试医生',department:'康复科',hospital:'测试机构'});const b=applyCommand(a,{type:'knowledge.create',title:'指南',category:'就医指南',body:'资料内容'});assert.equal(b.settings.doctor,'测试医生');assert.equal(b.knowledge[0].title,'指南');assert.equal(b.patients.length,s.patients.length);
});
