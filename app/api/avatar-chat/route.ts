import { env } from "cloudflare:workers";
import { chatSchema, replyToChat } from "@/lib/avatar-chat";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "请求来源无效。" }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 60000) return json({ error: "对话内容过长，请开始新对话。" }, 413);
    const parsed = chatSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return json({ error: "对话格式无效，单条消息限 3000 字。" }, 400);
    const audience = parsed.data.audience ?? "doctor";
    const authed = Boolean(request.headers.get("oai-authenticated-user-id"));
    if (!authed && audience !== "patient") return json({ error: "请先登录医生工作空间，或使用患者端咨询。" }, 401);
    return json(await replyToChat(parsed.data.messages, env as unknown as Record<string, string | undefined>, fetch, audience));
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "请求格式无效。" }, 400);
    // Do not expose provider responses or record message contents in logs.
    return json({ error: "回复生成失败，请检查模型配置或稍后重试。您的输入已保留。" }, 502);
  }
}
