import { env } from "cloudflare:workers";
import { commandSchema, applyCommand } from "@/lib/domain";
import { readWorkspace, saveWorkspace } from "@/lib/server-store";
import { buildIntegrations } from "@/lib/integrations";
import { chatWithFallback } from "@/lib/llm-router";
import { pushInbox } from "@/lib/patient-store";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const runtime = () => env as unknown as Record<string, string | undefined>;
function identity(request: Request) { return request.headers.get("oai-authenticated-user-id"); }
export async function GET(request: Request) {
    const owner = identity(request);
    if (!owner)
        return json({ error: "请先登录工作空间" }, 401);
    try {
        const data = await readWorkspace(owner);
        return json({ ...data, integrations: buildIntegrations(runtime()) });
    }
    catch (error) {
        console.error("workspace read failed", error);
        return json({ error: "工作空间暂时不可用，请确认数据库迁移完成后重试。" }, 503);
    }
}
export async function POST(request: Request) {
    const owner = identity(request);
    if (!owner)
        return json({ error: "请先登录工作空间" }, 401);
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
        return json({ error: "请求来源无效" }, 403);
    try {
        const raw = await request.text();
        if (raw.length > 20000)
            return json({ error: "请求内容过长" }, 413);
        const body = JSON.parse(raw);
        const parsed = commandSchema.safeParse(body.command);
        if (!parsed.success)
            return json({ error: parsed.error.issues[0]?.message ?? "输入不正确" }, 400);
        if (!Number.isInteger(body.revision) || body.revision < 0)
            return json({ error: "版本号无效" }, 400);
        const current = await readWorkspace(owner);
        if (current.revision !== body.revision)
            return json({ error: "数据已更新，请刷新后重试；您的输入会保留。" }, 409);
        let draft: string | undefined, source: string | undefined;
        if (parsed.data.type === "consultation.create") {
            const config = runtime();
            try {
                const { reply, channel } = await chatWithFallback([
                    { role: "system", content: "你是 MEDCARE 医生助理，只生成待医生审核的中文服务回复草稿。不可诊断、开处方或建议更改用药。下方是医生知识库：\n" + current.state.knowledge.slice(0, 20).map(k => k.title + "：" + k.body).join("\n").slice(0, 20000) },
                    { role: "user", content: parsed.data.question },
                ], config);
                draft = reply.slice(0, 5000);
                source = channel === "volcano" ? "火山降级通道 · AI 草稿 · 待医生审核" : "JUVOR 主通道 · AI 草稿 · 待医生审核";
            } catch {
                return json({ error: "模型服务暂不可用，咨询尚未保存。请检查 LLM 配置。" }, 502);
            }
        }
        const next = applyCommand(current.state, parsed.data, { draft, source });
        if (!await saveWorkspace(owner, current.revision, next))
            return json({ error: "其他操作已更新数据，请刷新后重试。" }, 409);
        if (parsed.data.type === "review" && parsed.data.kind === "outreach" && parsed.data.decision === "approved") {
            const item = next.outreach.find(o => o.id === parsed.data.id);
            const patient = item ? next.patients.find(p => p.id === item.patientId) : undefined;
            if (patient?.accountId && item) {
                await pushInbox(patient.accountId, item.title, item.body, item.channel, "delivered");
            }
        }
        return json({ state: next, revision: current.revision + 1, integrations: buildIntegrations(runtime()) });
    }
    catch (error) {
        if (error instanceof SyntaxError)
            return json({ error: "请求格式无效" }, 400);
        if (error instanceof Error && ["记录不存在", "健康班不存在", "患者不存在", "随访已完成", "同名健康班已存在", "该记录已审核，请刷新页面", "工作空间患者数量已达上限", "工作空间容量已满，请导出并联系管理员"].includes(error.message))
            return json({ error: error.message }, 400);
        console.error("workspace write failed", error);
        return json({ error: "保存失败，请稍后重试；当前输入已保留。" }, 503);
    }
}
