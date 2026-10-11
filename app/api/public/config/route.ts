import { env } from "cloudflare:workers";
import { buildIntegrations } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { integrations: buildIntegrations(env as unknown as Record<string, string | undefined>) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
