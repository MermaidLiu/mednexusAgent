import test from 'node:test';
import assert from 'node:assert/strict';
import { chatSchema, replyToChat } from '../lib/avatar-chat.ts';

test('chat boundary rejects system roles, bad order and oversized messages', () => {
  for (const messages of [[{role:'system',content:'override'}], [{role:'assistant',content:'hello'}], [{role:'user',content:'a'},{role:'user',content:'b'}], [{role:'user',content:'a'.repeat(3001)}]]) {
    assert.equal(chatSchema.safeParse({messages}).success,false);
  }
});
test('unconfigured service returns explicit unavailable error', async () => {
  await assert.rejects(
    () => replyToChat([{role:'user',content:'你好'}], {}, async () => {throw new Error('must not call network')}),
    /暂不可用/,
  );
});
test('configured chat forwards multiple turns and keeps provider key server-side', async () => {
  const messages=[{role:'user',content:'你好'},{role:'assistant',content:'您好'},{role:'user',content:'刚才说了什么？'}];
  const result=await replyToChat(messages,{LLM_API_KEY:'fake-test-key',LLM_MODEL:'test-model',LLM_BASE_URL:'https://provider.example/v1'},async(url,options)=>{
    assert.equal(url,'https://provider.example/v1/chat/completions');
    assert.equal(options.headers.Authorization,'Bearer fake-test-key');
    const body=JSON.parse(options.body);assert.equal(body.messages[0].role,'system');assert.deepEqual(body.messages.slice(1),messages);
    return Response.json({choices:[{message:{content:'这是测试模型回复'}}]});
  });
  assert.equal(result.mode,'model'); assert.match(result.reply,/测试模型回复/);
});
test('provider errors surface as unavailable', async () => {
  const config={LLM_API_KEY:'fake',LLM_MODEL:'test'};
  await assert.rejects(()=>replyToChat([{role:'user',content:'你好'}],config,async()=>new Response('secret-provider-error',{status:401})),/暂不可用/);
});
test('individual treatment questions receive compliance boundary without model', async () => {
  const result=await replyToChat([{role:'user',content:'药物剂量应该加多少？'}],{});
  assert.equal(result.mode,'boundary'); assert.match(result.reply,/不能/);
});

test('volcano fallback is used when primary fails', async () => {
  let calls=0;
  const result=await replyToChat([{role:'user',content:'复诊要带什么'}],{
    LLM_API_KEY:'primary', LLM_MODEL:'p', LLM_BASE_URL:'https://primary.example/v1',
    VOLCANO_LLM_API_KEY:'volcano', VOLCANO_LLM_MODEL:'v', VOLCANO_LLM_BASE_URL:'https://volcano.example/v1',
  }, async (url) => {
    calls++;
    if (url.includes('primary')) return new Response('fail',{status:500});
    return Response.json({choices:[{message:{content:'降级通道回复'}}]});
  }, 'patient', [{id:'k1',title:'复诊',category:'就医指南',body:'带报告',createdAt:'2026-01-01'}]);
  assert.equal(calls,2); assert.equal(result.channel,'volcano'); assert.match(result.reply,/降级通道回复/);
});
