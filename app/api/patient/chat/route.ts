import { sessionAccount, listChatMessages } from "@/lib/patient-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(/medcare_patient_session=([^;]+)/)?.[1] ?? null;
  const session = await sessionAccount(token);
  if (!session) return Response.json({ messages: [] }, { headers: { "Cache-Control": "no-store" } });
  const messages = await listChatMessages(session.account_id);
  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
