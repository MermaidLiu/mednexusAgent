import { z } from "zod";
import { DIGITAL_DOCTOR_NAME, PRODUCT_NAME } from "./branding.ts";
import { boundaryReply, AI_DISCLAIMER } from "./compliance.ts";
import { formatKnowledgeContext, retrieveKnowledge } from "./rag.ts";
import { chatWithFallback, type LlmEnv, llmConfigured } from "./llm-router.ts";
import type { Knowledge } from "./domain";

export const chatAudience = z.enum(["doctor", "patient"]).optional();
export type ChatAudience = z.infer<typeof chatAudience>;

export const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(3000),
  }).strict()).min(1).max(19),
  audience: chatAudience,
}).strict().superRefine(({ messages }, ctx) => {
  if (messages.some((m, i) => m.role !== (i % 2 === 0 ? "user" : "assistant"))) {
    ctx.addIssue({ code: "custom", message: "对话顺序无效" });
  }
  if (messages.at(-1)?.role !== "user") {
    ctx.addIssue({ code: "custom", message: "请以用户问题结束对话" });
  }
});
export type ChatMessage = z.infer<typeof chatSchema>["messages"][number];

export type ChatModelConfig = LlmEnv;

function systemPrompt(audience: ChatAudience, knowledgeBlock: string) {
  const patientHint = audience === "patient"
    ? "当前为患者端，用语面向患者，避免引用医生端菜单。"
    : "当前为医生工作空间，可提及工作台功能。";
  return `你是 ${PRODUCT_NAME} 平台统一数字医助「${DIGITAL_DOCTOR_NAME}」。${patientHint}
仅基于下方「医生知识库摘录」作答；未覆盖的问题应明确说明并引导线下咨询，不得编造检查、分期、用药或预约结果。
你是 AI 虚拟助手，不是线下真人医生。不能诊断、开处方或调药。若知识库未命中，提示联系主诊医生。
回答结构：已有事实（注明依据）→ 可执行建议 → 待医生确认的问题。末尾保留合规标识。
【医生知识库摘录】
${knowledgeBlock}`;
}

export async function replyToChat(
  messages: ChatMessage[],
  config: ChatModelConfig,
  fetcher: typeof fetch = fetch,
  audience: ChatAudience = "doctor",
  knowledge: Knowledge[] = [],
) {
  const last = messages.at(-1)?.content ?? "";
  const bounded = boundaryReply(last);
  if (bounded) {
    return { reply: bounded, mode: "boundary" as const, channel: null as null };
  }

  if (!llmConfigured(config)) {
    throw new Error("服务暂不可用：大模型尚未配置，请联系管理员。");
  }

  const chunks = retrieveKnowledge(knowledge, last);
  const knowledgeBlock = formatKnowledgeContext(chunks);
  if (knowledge.length && !chunks.length && /怎么|如何|什么|是否|能不能/.test(last)) {
    return {
      reply: `知识库中暂无与您问题直接相关的内容。建议您整理具体资料后联系${DIGITAL_DOCTOR_NAME}或主诊医生确认。${AI_DISCLAIMER}`,
      mode: "rag_miss" as const,
      channel: null as null,
    };
  }

  const { reply, channel } = await chatWithFallback(
    [{ role: "system", content: systemPrompt(audience, knowledgeBlock) }, ...messages],
    config,
    fetcher,
  );
  const withDisclaimer = reply.includes("AI 生成") ? reply : reply + AI_DISCLAIMER;
  return { reply: withDisclaimer, mode: "model" as const, channel };
}
