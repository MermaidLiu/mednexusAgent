import { env } from "cloudflare:workers";
import { z } from "zod";
import { synthesizeSpeech, ttsConfigured } from "@/lib/volcano-tts";

export const dynamic = "force-dynamic";
const schema = z.object({ text: z.string().trim().min(1).max(800) });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "请求来源无效" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "文本无效" }, { status: 400 });
  const config = env as unknown as Record<string, string | undefined>;
  if (!ttsConfigured(config)) {
    return Response.json({ error: "TTS 未配置", configured: false }, { status: 503 });
  }
  const audio = await synthesizeSpeech(parsed.data.text, config);
  if (!audio) return Response.json({ error: "语音合成失败" }, { status: 502 });
  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
