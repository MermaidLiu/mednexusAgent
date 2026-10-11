import { env } from "cloudflare:workers";
import { createWorkspace, normalizeWorkspace, type Workspace } from "./domain";
export function database() { if (!env.DB)
    throw new Error("数据库尚未配置"); return env.DB; }
export async function readWorkspace(owner: string) {
    const db = database();
    let row = await db.prepare("SELECT payload, revision FROM workspaces WHERE owner = ?").bind(owner).first<{
        payload: string;
        revision: number;
    }>();
    if (!row) {
        const initial = createWorkspace();
        await db.prepare("INSERT OR IGNORE INTO workspaces (owner, payload, revision, updated_at) VALUES (?, ?, 0, ?)").bind(owner, JSON.stringify(initial), new Date().toISOString()).run();
        row = await db.prepare("SELECT payload, revision FROM workspaces WHERE owner = ?").bind(owner).first<{
            payload: string;
            revision: number;
        }>();
    }
    if (!row)
        throw new Error("无法读取工作空间");
    return { state: normalizeWorkspace(JSON.parse(row.payload)), revision: row.revision };
}
export async function saveWorkspace(owner: string, revision: number, state: Workspace) {
    const payload = JSON.stringify(state);
    if (new TextEncoder().encode(payload).length > 1500000)
        throw new Error("工作空间容量已满，请导出并联系管理员");
    const result = await database().prepare("UPDATE workspaces SET payload = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND revision = ?").bind(payload, new Date().toISOString(), owner, revision).run();
    return result.meta.changes === 1;
}
