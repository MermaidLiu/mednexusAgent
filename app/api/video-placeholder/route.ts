export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const template = url.searchParams.get("template") ?? "科普短视频";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="100%" height="100%" fill="#0f3d36"/><text x="50%" y="45%" fill="#fff" font-size="32" text-anchor="middle" font-family="sans-serif">MEDCARE 数字人视频 · ${template}</text><text x="50%" y="58%" fill="#b8e4d8" font-size="20" text-anchor="middle" font-family="sans-serif">AI 生成 · 仅供演示 · 接入火山视频 API 后替换</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" } });
}
