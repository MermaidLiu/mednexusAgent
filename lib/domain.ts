import { z } from "zod";
export type Patient = {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    groupId: string;
    stage: string;
    note: string;
    createdAt: string;
};
export type Group = {
    id: string;
    name: string;
    description: string;
};
export type Consultation = {
    id: string;
    patientId: string;
    question: string;
    draft: string;
    source: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    reviewedAt?: string;
    response?: string;
};
export type Followup = {
    id: string;
    patientId: string;
    title: string;
    due: string;
    content: string;
    status: "pending" | "completed";
    result: string;
};
export type Content = {
    id: string;
    title: string;
    kind: string;
    body: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    videoUrl?: string;
};
export type Knowledge = {
    id: string;
    title: string;
    category: string;
    body: string;
    createdAt: string;
};
export type Workspace = {
    patients: Patient[];
    groups: Group[];
    consultations: Consultation[];
    followups: Followup[];
    contents: Content[];
    knowledge: Knowledge[];
    settings: {
        doctor: string;
        department: string;
        hospital: string;
    };
    audit: {
        id: string;
        action: string;
        at: string;
    }[];
};
const text = z.string().trim().min(1, "此项不能为空").max(5000, "内容不能超过 5000 字");
const id = z.string().min(1).max(100);
export const commandSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("patient.create"), name: text.max(40), age: z.coerce.number().int().min(0).max(120), gender: z.enum(["男", "女", "未说明"]), phone: z.string().trim().max(30).regex(/^[\d+()\s-]*$/, "联系电话格式不正确"), groupId: id, stage: z.enum(["门诊随诊", "术前评估", "术后康复", "长期管理"]), note: z.string().trim().max(5000) }),
    z.object({ type: z.literal("patient.update"), id, groupId: id, stage: z.enum(["门诊随诊", "术前评估", "术后康复", "长期管理"]), note: z.string().trim().max(5000) }),
    z.object({ type: z.literal("group.create"), name: text.max(60), description: text.max(500) }),
    z.object({ type: z.literal("consultation.create"), patientId: id, question: text }),
    z.object({ type: z.literal("review"), id, kind: z.enum(["consultation", "content"]), decision: z.enum(["approved", "rejected"]), body: text }),
    z.object({ type: z.literal("followup.create"), patientId: id, title: text.max(120), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v), "日期无效"), content: text }),
    z.object({ type: z.literal("followup.complete"), id, result: text }),
    z.object({ type: z.literal("content.create"), title: text.max(120), kind: z.enum(["科普文章", "数字人脚本", "就诊通知", "感谢信"]), body: text }),
    z.object({ type: z.literal("knowledge.create"), title: text.max(120), category: z.enum(["就医指南", "康复管理", "医生品牌", "服务规范"]), body: text }),
    z.object({ type: z.literal("settings.update"), doctor: text.max(40), department: text.max(60), hospital: text.max(100) })
]);
export type Command = z.infer<typeof commandSchema>;
export function createWorkspace(now = new Date().toISOString()): Workspace {
    const groups = [{ id: "g1", name: "关节健康管理班", description: "长期管理与门诊随诊，持续关注关节健康" }, { id: "g2", name: "术后康复陪伴班", description: "术后随访、康复进展记录与复查协助" }, { id: "g3", name: "门诊就医服务班", description: "就诊准备、预约事项与报告查询协助" }];
    const names = ["王晓敏", "李建国", "张文芳", "刘志强", "赵淑兰", "陈明", "周桂英", "吴志远", "郑丽", "孙晓华", "徐军", "林雅琴"];
    const patients = names.map((name, i) => ({ id: `p${i + 1}`, name, age: [52, 67, 45, 38, 71, 56, 62, 49, 43, 58, 64, 36][i], gender: i % 2 ? "男" : "女", phone: "", groupId: i < 5 ? "g1" : i < 9 ? "g2" : "g3", stage: i < 5 ? "长期管理" : i < 9 ? "术后康复" : "门诊随诊", note: "演示患者，用于体验健康管理流程。", createdAt: now }));
    const consultations: Consultation[] = [{ id: "c1", patientId: "p1", question: "下次复诊需要带哪些资料？", draft: "您好，为便于医生了解您之前的诊疗情况，请整理既往就诊记录、检查报告与目前正在使用的药物清单。具体准备事项请以医院或主诊医生通知为准。", source: "示例草稿", status: "pending", createdAt: now }, { id: "c2", patientId: "p6", question: "想和医生确认一下后续康复计划。", draft: "已记录您的康复计划确认需求。请补充最近一次就诊时间、当前主要困扰以及医生之前提供的康复要求，转交主诊医生审核后答复。", source: "示例草稿", status: "pending", createdAt: now }, { id: "c3", patientId: "p10", question: "可以帮我登记加号申请吗？", draft: "已收到您的加号咨询。请告知希望就诊的日期与科室，工作人员会进一步核实。是否能够加号以医院实际安排为准。", source: "示例草稿", status: "pending", createdAt: now }];
    return { patients, groups, consultations, followups: [{ id: "f1", patientId: "p6", title: "术后第 7 天康复随访", due: now.slice(0, 10), content: "了解居家康复情况，记录患者的问题并安排医生复核。", status: "pending", result: "" }, { id: "f2", patientId: "p7", title: "复查安排确认", due: now.slice(0, 10), content: "确认患者是否收到复查安排，记录就诊协助需求。", status: "pending", result: "" }, { id: "f3", patientId: "p1", title: "健康管理回访", due: now.slice(0, 10), content: "询问近期就医体验，记录需要医生关注的情况。", status: "pending", result: "" }], contents: [{ id: "d1", title: "复诊前，记得整理这些资料", kind: "科普文章", body: "请在复诊前整理既往检查报告、就诊记录及当前用药清单，并记录希望与医生沟通的问题。具体准备要求请以医院通知为准。", status: "pending", createdAt: now }], knowledge: [{ id: "k1", title: "复诊资料准备", category: "就医指南", body: "复诊可提前整理既往检查报告、就诊记录、当前用药清单及希望咨询医生的问题。具体要求以医院通知为准。", createdAt: now }, { id: "k2", title: "个性化问题处理规范", category: "服务规范", body: "涉及诊断、处方、调整用药、个性化康复方案的问题应转交医生审核；医助可以收集信息，不可独立作出医疗决策。", createdAt: now }], settings: { doctor: "王主任", department: "骨科", hospital: "示例医疗机构" }, audit: [{ id: "a1", action: "创建演示工作空间", at: now }] };
}
function need<T>(item: T | undefined, message = "记录不存在"): T { if (!item)
    throw new Error(message); return item; }
export function applyCommand(state: Workspace, command: Command, options: {
    now?: string;
    id?: string;
    draft?: string;
    source?: string;
} = {}): Workspace {
    const s = structuredClone(state), now = options.now ?? new Date().toISOString(), uid = options.id ?? crypto.randomUUID();
    let action = "";
    switch (command.type) {
        case "patient.create":
            need(s.groups.find(g => g.id === command.groupId), "健康班不存在");
            if (s.patients.length >= 2000)
                throw new Error("工作空间患者数量已达上限");
            s.patients.unshift({ ...command, id: uid, createdAt: now });
            action = `新增患者：${command.name}`;
            break;
        case "patient.update": {
            need(s.groups.find(g => g.id === command.groupId), "健康班不存在");
            const p = need(s.patients.find(p => p.id === command.id));
            Object.assign(p, { groupId: command.groupId, stage: command.stage, note: command.note });
            action = `更新患者档案：${p.name}`;
            break;
        }
        case "group.create":
            if (s.groups.some(g => g.name === command.name))
                throw new Error("同名健康班已存在");
            s.groups.push({ id: uid, name: command.name, description: command.description });
            action = `创建健康班：${command.name}`;
            break;
        case "consultation.create":
            need(s.patients.find(p => p.id === command.patientId), "患者不存在");
            s.consultations.unshift({ id: uid, patientId: command.patientId, question: command.question, draft: options.draft ?? "已记录您的问题，请补充相关情况，待主诊医生审核后答复。", source: options.source ?? "服务模板 · 待医生审核", status: "pending", createdAt: now });
            action = "整理咨询草稿，提交医生审核";
            break;
        case "review": {
            if (command.kind === "consultation") {
                const c = need(s.consultations.find(c => c.id === command.id));
                if (c.status !== "pending")
                    throw new Error("该记录已审核，请刷新页面");
                c.status = command.decision;
                c.response = command.body;
                c.reviewedAt = now;
            }
            else {
                const c = need(s.contents.find(c => c.id === command.id));
                if (c.status !== "pending")
                    throw new Error("该记录已审核，请刷新页面");
                c.status = command.decision;
                c.body = command.body;
            }
            action = `${command.decision === "approved" ? "通过" : "退回"}${command.kind === "consultation" ? "咨询回复" : "内容"}审核（仅保存，未对外发送）`;
            break;
        }
        case "followup.create":
            need(s.patients.find(p => p.id === command.patientId), "患者不存在");
            s.followups.unshift({ ...command, id: uid, status: "pending", result: "" });
            action = `安排随访：${command.title}`;
            break;
        case "followup.complete": {
            const f = need(s.followups.find(f => f.id === command.id));
            if (f.status !== "pending")
                throw new Error("随访已完成");
            f.status = "completed";
            f.result = command.result;
            action = `完成随访：${f.title}`;
            break;
        }
        case "content.create":
            s.contents.unshift({ ...command, id: uid, status: "pending", createdAt: now });
            action = `创建${command.kind}：${command.title}`;
            break;
        case "knowledge.create":
            s.knowledge.unshift({ ...command, id: uid, createdAt: now });
            action = `录入知识：${command.title}`;
            break;
        case "settings.update":
            s.settings = { doctor: command.doctor, department: command.department, hospital: command.hospital };
            action = "更新医生工作空间资料";
            break;
    }
    s.audit.unshift({ id: crypto.randomUUID(), action, at: now });
    s.audit = s.audit.slice(0, 1000);
    return s;
}
