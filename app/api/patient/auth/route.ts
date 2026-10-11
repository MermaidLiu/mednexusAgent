import { env } from "cloudflare:workers";
import { z } from "zod";
import { findOrCreateAccount, createSession, sessionAccount } from "@/lib/patient-store";
import { isValidCnMobile, verifyOtp } from "@/lib/patient-auth";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

const sendSchema = z.object({ phone: z.string().trim() });
const loginSchema = z.object({
  phone: z.string().trim(),
  code: z.string().trim().min(4).max(8),
  privacyAccepted: z.boolean(),
  dataOptIn: z.boolean().optional(),
  ageConfirmed: z.boolean().refine(v => v === true, { message: "需确认已年满 18 周岁" }),
});

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(/medcare_patient_session=([^;]+)/)?.[1] ?? null;
  const session = await sessionAccount(token);
  if (!session) return json({ loggedIn: false });
  return json({ loggedIn: true, phoneMask: session.phone_mask, accountId: session.account_id });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "请求来源无效" }, 403);
  try {
    const body = await request.json();
    if (body.action === "send_code") {
      const parsed = sendSchema.safeParse(body);
      if (!parsed.success || !isValidCnMobile(parsed.data.phone)) return json({ error: "请输入有效的大陆手机号" }, 400);
      return json({ ok: true, message: "验证码已发送（内测：使用 123456）", cooldownSec: 60 });
    }
    if (body.action === "logout") {
      return json({ ok: true }, 200, { "Set-Cookie": "medcare_patient_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" });
    }
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "登录信息无效" }, 400);
    if (!parsed.data.privacyAccepted) return json({ error: "请先阅读并同意隐私政策" }, 400);
    const devCode = (env as Record<string, string | undefined>).PATIENT_OTP_DEV;
    if (!verifyOtp(parsed.data.phone, parsed.data.code, devCode)) return json({ error: "验证码错误或已过期" }, 401);
    const account = await findOrCreateAccount(parsed.data.phone, true, Boolean(parsed.data.dataOptIn));
    const session = await createSession(account.id);
    return json(
      { ok: true, phoneMask: account.phone_mask, accountId: account.id },
      200,
      { "Set-Cookie": `medcare_patient_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}` },
    );
  } catch (e) {
    console.error("patient auth failed", e);
    return json({ error: "登录服务暂不可用，请确认数据库迁移已完成。" }, 503);
  }
}
