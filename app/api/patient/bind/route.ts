import { z } from "zod";
import { readWorkspace, saveWorkspace } from "@/lib/server-store";
import { getBinding, sessionAccount, upsertBinding } from "@/lib/patient-store";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const bindSchema = z.object({ inviteCode: z.string().trim().min(4).max(20) });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "请求来源无效" }, 403);
  const token = request.headers.get("cookie")?.match(/medcare_patient_session=([^;]+)/)?.[1] ?? null;
  const session = await sessionAccount(token);
  if (!session) return json({ error: "请先登录" }, 401);
  const parsed = bindSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "邀请码无效" }, 400);

  const owner = request.headers.get("x-medcare-workspace-owner") || "local_seedy";
  try {
    const current = await readWorkspace(owner);
    if (current.state.settings.inviteCode !== parsed.data.inviteCode) {
      return json({ error: "邀请码不正确，请向主管医生索取" }, 400);
    }
    const patient = current.state.patients.find(p => p.accountStatus !== "已登录") ?? current.state.patients[0];
    if (!patient) return json({ error: "暂无可绑定档案" }, 400);
    patient.accountStatus = "已登录";
    patient.accountId = session.account_id;
    if (!await saveWorkspace(owner, current.revision, current.state)) {
      return json({ error: "绑定冲突，请重试" }, 409);
    }
    await upsertBinding(session.account_id, owner, parsed.data.inviteCode, patient.groupId, patient.id);
    return json({ ok: true, doctor: current.state.settings.doctor, groupId: patient.groupId, patientName: patient.name });
  } catch (e) {
    console.error("bind failed", e);
    return json({ error: "绑定失败，请稍后重试" }, 503);
  }
}

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(/medcare_patient_session=([^;]+)/)?.[1] ?? null;
  const session = await sessionAccount(token);
  if (!session) return json({ bound: false });
  const binding = await getBinding(session.account_id);
  return json({ bound: Boolean(binding), binding });
}
