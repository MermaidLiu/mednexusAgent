import { llmConfigured, type LlmEnv } from "./llm-router";
import { ttsConfigured, type TtsEnv } from "./volcano-tts";

export function buildIntegrations(env: Record<string, string | undefined>) {
  const llm: LlmEnv = env;
  const tts: TtsEnv = env;
  return {
    model: llmConfigured(llm),
    tts: ttsConfigured(tts),
    video: Boolean(env.VOLCANO_VIDEO_APP_ID) || true,
    videoProvider: env.VOLCANO_VIDEO_APP_ID ? "volcano" : "stub",
    sms: Boolean(env.SMS_API_KEY),
    wechat: false,
    avatar: true,
    dualChannel: Boolean(env.LLM_API_KEY && env.VOLCANO_LLM_API_KEY),
  };
}
