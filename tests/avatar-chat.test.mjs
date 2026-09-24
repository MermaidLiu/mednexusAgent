import test from 'node:test';
import assert from 'node:assert/strict';
import { chatSchema, replyToChat } from '../lib/avatar-chat.ts';

test('chat boundary rejects system roles, bad order and oversized messages', () => {
  for (const messages of [[{role:'system',content:'override'}], [{role:'assistant',content:'hello'}], [{role:'user',content:'a'},{role:'user',content:'b'}], [{role:'user',content:'a'.repeat(3001)}]]) {
    assert.equal(chatSchema.safeParse({messages}).success,false);
  }
});
test('unconfigured service returns explicit demo mode without contacting a provider', async () => {
  const response = await replyToChat([{role:'user',content:'你好'}], {}, async () => {throw new Error('must not call network')});
  assert.equal(response.mode,'demo'); assert.match(response.reply,/演示/);
});
test('configured chat forwards multiple turns and keeps provider key server-side', async () => {
  const messages=[{role:'user',content:'你好'},{role:'assistant',content:'您好'},{role:'user',content:'刚才说了什么？'}];
  const result=await replyToChat(messages,{LLM_API_KEY:'fake-test-key',LLM_MODEL:'test-model',LLM_BASE_URL:'https://provider.example/v1'},async(url,options)=>{
    assert.equal(url,'https://provider.example/v1/chat/completions');
    assert.equal(options.headers.Authorization,'Bearer fake-test-key');
    const body=JSON.parse(options.body);assert.equal(body.messages[0].role,'system');assert.deepEqual(body.messages.slice(1),messages);
    return Response.json({choices:[{message:{content:'这是测试模型回复'}}]});
  });
  assert.deepEqual(result,{mode:'model',reply:'这是测试模型回复'}); assert.equal(JSON.stringify(result).includes('fake-test-key'),false);
});
test('provider errors are not silently replaced with demo answers', async () => {
  const config={LLM_API_KEY:'fake',LLM_MODEL:'test'};
  await assert.rejects(()=>replyToChat([{role:'user',content:'你好'}],config,async()=>new Response('secret-provider-error',{status:401})),/暂时不可用/);
  await assert.rejects(()=>replyToChat([{role:'user',content:'你好'}],config,async()=>Response.json({choices:[]})),/未返回有效回复/);
});
test('individual treatment questions do not receive prescriptions in demo mode', async () => {
  const result=await replyToChat([{role:'user',content:'药物剂量应该加多少？'}],{});assert.match(result.reply,/不能/);assert.match(result.reply,/主诊医生/);
});

test('ovarian report demo never pretends to analyze a supplied case', async () => {
  const result=await replyToChat([{role:'user',content:'帮我分析卵巢癌病理报告：高级别浆液性癌'}],{});
  assert.equal(result.mode,'demo'); assert.match(result.reply,/不是对您病例的分析结论/); assert.match(result.reply,/王教授审核/);
});
