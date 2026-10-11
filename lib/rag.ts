import type { Knowledge } from "./domain";

export function retrieveKnowledge(knowledge: Knowledge[], query: string, limit = 5): Knowledge[] {
  const terms = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t => t.length >= 2);
  if (!terms.length) return knowledge.slice(0, limit);
  const scored = knowledge.map(k => {
    const hay = `${k.title}\n${k.body}`.toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += 1;
    return { k, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return (scored.length ? scored.map(x => x.k) : knowledge.slice(0, limit)).slice(0, limit);
}

export function formatKnowledgeContext(chunks: Knowledge[]) {
  if (!chunks.length) return "（当前知识库暂无匹配条目，请引导患者线下咨询或补充资料。）";
  return chunks.map(k => `【${k.category}】${k.title}：${k.body}`).join("\n").slice(0, 18000);
}
