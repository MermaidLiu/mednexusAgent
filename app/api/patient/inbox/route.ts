import { sessionAccount, listInbox } from "@/lib/patient-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(/medcare_patient_session=([^;]+)/)?.[1] ?? null;
  const session = await sessionAccount(token);
  if (!session) return Response.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  const items = await listInbox(session.account_id);
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
