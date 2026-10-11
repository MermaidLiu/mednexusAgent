import { env } from "cloudflare:workers";
import { chatSchema, replyToChat } from "@/lib/avatar-chat";
import { readWorkspace } from "@/lib/server-store";
import { sessionAccount, saveChatMessage, getBinding } from "@/lib/patient-store";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const runtime = () => env as unknown as Record<string, string | undefined>;

function patientToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)medcare_patient_session=([^;]+)/);
  return match?.[1] ?? null;
}

async function knowledgeForRequest(request: Request, audience: "doctor" | "patient") {
  const config = runtime();
  let owner = request.headers.get("oai-authenticated-user-id") || config.PATIENT_KNOWLEDGE_OWNER || "local_seedy";
  if (audience === "patient") {
    const token = patientToken(request);
    const session = await sessionAccount(token);
    if (session) {
      const binding = await getBinding(session.account_id);
      if (binding?.workspace_owner) owner = binding.workspace_owner;
    }
  }
  try {
    const data = await readWorkspace(owner);
    return data.state.knowledge;
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "请求来源无效。" }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 60000) return json({ error: "对话内容过长，请开始新对话。" }, 413);
    const parsed = chatSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return json({ error: "对话格式无效，单条消息限 3000 字。" }, 400);
    const audience = parsed.data.audience ?? "doctor";
    const authed = Boolean(request.headers.get("oai-authenticated-user-id"));
    const token = patientToken(request);
    const session = await sessionAccount(token);
    if (!authed && audience !== "patient") return json({ error: "请先登录医生工作空间，或使用患者端咨询。" }, 401);

    const knowledge = await knowledgeForRequest(request, audience);
    const result = await replyToChat(parsed.data.messages, runtime(), fetch, audience, knowledge);

    if (audience === "patient" && session) {
      const userMsg = parsed.data.messages.at(-1)!;
      await saveChatMessage(session.account_id, "user", userMsg.content, JSON.stringify({ audience }));
      await saveChatMessage(session.account_id, "assistant", result.reply, JSON.stringify({ mode: result.mode, channel: result.channel }));
    }

    return json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "请求格式无效。" }, 400);
    const message = error instanceof Error ? error.message : "回复生成失败，请稍后重试。";
    return json({ error: message.includes("暂不可用") ? message : "回复生成失败，请检查模型配置或稍后重试。您的输入已保留。" }, 502);
  }
}
