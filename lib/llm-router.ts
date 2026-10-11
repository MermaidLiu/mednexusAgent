export type LlmEnv = {
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_BASE_URL?: string;
  VOLCANO_LLM_API_KEY?: string;
  VOLCANO_LLM_MODEL?: string;
  VOLCANO_LLM_BASE_URL?: string;
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function endpoint(base?: string) {
  const url = new URL(base || "https://api.openai.com/v1");
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("模型服务地址配置无效，请使用 HTTPS API 地址。");
  }
  return url.href.replace(/\/$/, "") + "/chat/completions";
}

async function callChannel(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  baseUrl: string | undefined,
  fetcher: typeof fetch,
  timeoutMs: number,
) {
  const response = await fetcher(endpoint(baseUrl), {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 1200 }),
  });
  if (!response.ok) throw new Error(`channel_http_${response.status}`);
  const body = await response.json() as { choices?: { message?: { content?: unknown } }[] };
  const reply = body.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) throw new Error("channel_empty");
  return reply.trim().slice(0, 3000);
}

export async function chatWithFallback(
  messages: ChatMessage[],
  config: LlmEnv,
  fetcher: typeof fetch = fetch,
  timeoutMs = 8000,
): Promise<{ reply: string; channel: "juvor" | "volcano" }> {
  const primaryKey = config.LLM_API_KEY;
  const primaryModel = config.LLM_MODEL;
  const fallbackKey = config.VOLCANO_LLM_API_KEY;
  const fallbackModel = config.VOLCANO_LLM_MODEL;

  if (!primaryKey && !fallbackKey) {
    throw new Error("服务暂不可用：大模型尚未配置，请联系管理员。");
  }

  if (primaryKey && primaryModel) {
    try {
      const reply = await callChannel(messages, primaryKey, primaryModel, config.LLM_BASE_URL, fetcher, timeoutMs);
      return { reply, channel: "juvor" };
    } catch {
      /* fall through to volcano */
    }
  }

  if (fallbackKey && fallbackModel) {
    const reply = await callChannel(
      messages,
      fallbackKey,
      fallbackModel,
      config.VOLCANO_LLM_BASE_URL || config.LLM_BASE_URL,
      fetcher,
      timeoutMs,
    );
    return { reply, channel: "volcano" };
  }

  throw new Error("服务暂不可用：主通道与降级通道均失败，请稍后重试。");
}

export function llmConfigured(config: LlmEnv) {
  return Boolean(
    (config.LLM_API_KEY && config.LLM_MODEL) ||
    (config.VOLCANO_LLM_API_KEY && config.VOLCANO_LLM_MODEL),
  );
}
