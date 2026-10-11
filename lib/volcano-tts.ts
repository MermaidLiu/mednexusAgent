export type TtsEnv = {
  VOLCANO_TTS_APP_ID?: string;
  VOLCANO_TTS_TOKEN?: string;
  VOLCANO_TTS_VOICE?: string;
  VOLCANO_TTS_CLUSTER?: string;
};

/** 火山 TTS：未配置时返回 null，由前端仅展示文字 */
export async function synthesizeSpeech(text: string, config: TtsEnv, fetcher: typeof fetch = fetch): Promise<ArrayBuffer | null> {
  const { VOLCANO_TTS_APP_ID, VOLCANO_TTS_TOKEN, VOLCANO_TTS_VOICE, VOLCANO_TTS_CLUSTER } = config;
  if (!VOLCANO_TTS_APP_ID || !VOLCANO_TTS_TOKEN || !VOLCANO_TTS_VOICE) return null;

  const endpoint = "https://openspeech.bytedance.com/api/v1/tts";
  const response = await fetcher(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(12000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer; ${VOLCANO_TTS_TOKEN}`,
    },
    body: JSON.stringify({
      app: { appid: VOLCANO_TTS_APP_ID, token: "access_token", cluster: VOLCANO_TTS_CLUSTER || "volcano_tts" },
      user: { uid: "medcare" },
      audio: { voice_type: VOLCANO_TTS_VOICE, encoding: "mp3", speed_ratio: 1 },
      request: { reqid: crypto.randomUUID(), text: text.slice(0, 800), operation: "query" },
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json() as { data?: string };
  if (!payload.data) return null;
  const binary = Uint8Array.from(atob(payload.data), c => c.charCodeAt(0));
  return binary.buffer;
}

export function ttsConfigured(config: TtsEnv) {
  return Boolean(config.VOLCANO_TTS_APP_ID && config.VOLCANO_TTS_TOKEN && config.VOLCANO_TTS_VOICE);
}
