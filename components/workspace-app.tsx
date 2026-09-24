"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Activity, MessageCircle, LayoutDashboard, Users, Bot, ClipboardCheck, CalendarDays, Video, BookOpen, Settings, Search, Bell, Plus, ChevronRight, ArrowRight, Download, RefreshCw, Check, FileText, ShieldCheck, CircleAlert, Link2, LogOut, Loader2 } from "lucide-react";
import { Sidebar, SidebarProvider, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Dashboard from "@/components/dashboard";
import DigitalHuman from "@/components/digital-human";
import { type Workspace, type Command } from "@/lib/domain";
const menu = [[LayoutDashboard, "工作台"], [Users, "患者与健康班"], [Bot, "AI 医助"], [ClipboardCheck, "审核中心"], [CalendarDays, "随访管理"], [MessageCircle, "数字人对话"], [Video, "数字人工作室"], [BookOpen, "知识库"], [Settings, "设置与接入"]] as const;
type Modal = "patient" | "group" | "consultation" | "followup" | "content" | "knowledge" | null;
type Form = Record<string, string>;
const subtitles: Record<string, string> = { "数字人对话": "整理卵巢癌相关资料，准备王教授复核清单。", "患者与健康班": "从一次门诊相识，到长期健康陪伴。", "AI 医助": "整理患者问题，生成草稿，由医生确认。", "审核中心": "每一份个性化回复，都由您把关。", "随访管理": "把关怀落在每一次持续的随访中。", "数字人工作室": "管理科普内容、医生脚本与患者服务素材。", "知识库": "沉淀医生的专业知识与服务规范。", "设置与接入": "管理医生资料，查看外部服务的连接状态。" };
function Picker({ value, onChange, items, label }: {
    value: string;
    onChange: (v: string) => void;
    items: {
        value: string;
        label: string;
    }[];
    label: string;
}) { return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="w-full"><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select>; }
function Field({ label, children }: {
    label: string;
    children: React.ReactNode;
}) { return <label className="form-field"><span>{label}</span>{children}</label>; }
function Empty({ text = "暂无记录" }: {
    text?: string;
}) { return <div className="empty-state"><FileText size={30}/><b>{text}</b><p>新的服务记录会显示在这里。</p></div>; }
function download(name: string, text: string, type = "text/plain;charset=utf-8") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
export default function WorkspaceApp() {
    const [page, setPage] = useState("工作台"), [data, setData] = useState<{
        state: Workspace;
        revision: number;
    } | null>(null), [error, setError] = useState(""), [unauthorized, setUnauthorized] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [integrations, setIntegrations] = useState({ model: false, wechat: false, avatar: false });
    const [query, setQuery] = useState(""), [filter, setFilter] = useState("all"), [tab, setTab] = useState("patients"), [reviewTab, setReviewTab] = useState("pending"), [modal, setModal] = useState<Modal>(null), [form, setForm] = useState<Form>({}), [formError, setFormError] = useState(""), [detailId, setDetailId] = useState<string | null>(null), [review, setReview] = useState<{
        id: string;
        kind: "consultation" | "content";
        title: string;
        body: string;
        status: string;
    } | null>(null), [followupId, setFollowupId] = useState<string | null>(null), [result, setResult] = useState("");
    const busyRef = useRef(false);
    const navigate = useCallback((next: string) => { setPage(next); setQuery(""); setFilter("all"); setReviewTab("pending"); }, []);
    const reload = useCallback(async () => { setLoading(true); try {
        const r = await fetch("/api/workspace", { cache: "no-store" });
        const d = await r.json() as {
            state: Workspace;
            revision: number;
            error: string;
            integrations: {
                model: boolean;
                wechat: boolean;
                avatar: boolean;
            };
        };
        if (!r.ok) {
            setUnauthorized(r.status === 401);
            throw new Error(d.error);
        }
        setData({ state: d.state, revision: d.revision });
        setIntegrations(d.integrations);
        setError("");
        setUnauthorized(false);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
    }
    finally {
        setLoading(false);
    } }, []);
    useEffect(() => { void reload(); }, [reload]);
    useEffect(() => { if (new URLSearchParams(window.location.search).get("view") === "digital-human") setPage("数字人对话"); }, []);
    useEffect(() => { type MC = {
        registerTool: (tool: unknown, options: {
            signal: AbortSignal;
        }) => void | Promise<void>;
    }; const mc = (document as Document & {
        modelContext?: MC;
    }).modelContext; if (!mc)
        return; const ac = new AbortController(); void Promise.resolve(mc.registerTool({ name: "navigate_mednexus_workspace", description: "Navigate to a MedNexusAgent workspace section; does not create or approve records.", inputSchema: { type: "object", properties: { section: { type: "string", enum: menu.map(m => m[1]) } }, required: ["section"], additionalProperties: false }, annotations: { readOnlyHint: true }, execute(input: unknown) { const value = input as {
            section?: string;
        }; if (!value || !menu.some(m => m[1] === value.section))
            throw new Error("Invalid section"); navigate(value.section!); return { section: value.section }; } }, { signal: ac.signal })).catch(() => { }); return () => ac.abort(); }, [navigate]);
    async function act(command: Command) { if (!data || busyRef.current)
        return false; busyRef.current = true; setBusy(true); setFormError(""); try {
        const r = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: data.revision, command }) });
        const d = await r.json() as {
            state: Workspace;
            revision: number;
            error: string;
            integrations: {
                model: boolean;
                wechat: boolean;
                avatar: boolean;
            };
        };
        if (!r.ok) {
            if (r.status === 409)
                await reload();
            throw new Error(d.error || "保存失败");
        }
        setData({ state: d.state, revision: d.revision });
        toast.success("已保存到工作空间");
        return true;
    }
    catch (e) {
        const message = e instanceof Error ? e.message : "保存失败";
        setFormError(message);
        toast.error(message);
        return false;
    }
    finally {
        busyRef.current = false;
        setBusy(false);
    } }
    const s = data?.state, pending = s ? s.consultations.filter(c => c.status === "pending").length + s.contents.filter(c => c.status === "pending").length : 0;
    const patient = (id: string) => s?.patients.find(p => p.id === id)?.name ?? "未知患者";
    const group = (id: string) => s?.groups.find(g => g.id === id)?.name ?? "未分组";
    function open(kind: Modal) { setForm({ name: "", age: "", gender: "未说明", phone: "", groupId: s?.groups[0]?.id ?? "", stage: "门诊随诊", note: "", patientId: s?.patients[0]?.id ?? "", title: "", due: new Date().toLocaleDateString("en-CA"), content: "", description: "", question: "", body: "", category: "就医指南", kind: "数字人脚本" }); setFormError(""); setModal(kind); }
    const f = (key: string, value: string) => setForm(old => ({ ...old, [key]: value }));
    async function submit(e: React.FormEvent) {
        e.preventDefault();
        let command: Command;
        switch (modal) {
            case "patient":
                command = { type: "patient.create", name: form.name, age: Number(form.age), gender: form.gender as "男", phone: form.phone, groupId: form.groupId, stage: form.stage as "门诊随诊", note: form.note };
                break;
            case "group":
                command = { type: "group.create", name: form.name, description: form.description };
                break;
            case "consultation":
                command = { type: "consultation.create", patientId: form.patientId, question: form.question };
                break;
            case "followup":
                command = { type: "followup.create", patientId: form.patientId, title: form.title, due: form.due, content: form.content };
                break;
            case "content":
                command = { type: "content.create", title: form.title, kind: form.kind as "科普文章", body: form.body };
                break;
            case "knowledge":
                command = { type: "knowledge.create", title: form.title, category: form.category as "就医指南", body: form.body };
                break;
            default: return;
        }
        if (await act(command))
            setModal(null);
    }
    const selectedPatient = s?.patients.find(p => p.id === detailId);
    const reviewItems = s ? [...s.consultations.map(c => ({ id: c.id, kind: "consultation" as const, title: patient(c.patientId) + "的咨询回复", body: c.response ?? c.draft, status: c.status, sub: c.question, date: c.createdAt })), ...s.contents.map(c => ({ id: c.id, kind: "content" as const, title: c.title, body: c.body, status: c.status, sub: c.kind, date: c.createdAt }))].filter(c => (reviewTab === "all" || c.status === reviewTab) && `${c.title}${c.sub}`.includes(query)) : [];
    const newActions: Record<string, [
        Modal,
        string
    ]> = { "工作台": ["patient", "添加患者"], "患者与健康班": [tab === "patients" ? "patient" : "group", tab === "patients" ? "添加患者" : "创建健康班"], "AI 医助": ["consultation", "录入患者问题"], "随访管理": ["followup", "安排随访"], "数字人工作室": ["content", "创建内容"], "知识库": ["knowledge", "添加知识"] };
    return <SidebarProvider style={{ "--sidebar-width": "238px" } as React.CSSProperties}><Toaster position="top-center"/><Sidebar className="app-sidebar"><SidebarHeader><div className="brand"><span className="brand-icon"><Activity size={23}/></span><div>MedNexus<span>AGENT · 医患服务平台</span></div></div></SidebarHeader><SidebarContent><div className="workspace-label">医生工作空间</div><SidebarMenu>{menu.map(([Icon, label]) => <SidebarMenuItem key={label}><SidebarMenuButton isActive={page === label} onClick={() => navigate(label)} className="nav-item"><Icon size={18}/><span>{label}</span>{label === "审核中心" && pending > 0 && <b className="nav-count">{pending}</b>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu><div className="sidebar-note"><span className="pulse"/>{integrations.model ? "AI 模型已配置" : "服务模板模式"}<p>每一次连接，都多一份关怀。</p><span className="tiny">示例工作空间 · 数据可保存</span></div></SidebarContent><SidebarFooter><button className="profile" onClick={() => navigate("设置与接入")}><div className="avatar">{s?.settings.doctor?.[0] ?? "医"}</div><div><strong>{s?.settings.doctor ?? "医生工作台"}</strong><span>{s?.settings.department ?? "MedNexusAgent"}</span></div><Settings size={16}/></button></SidebarFooter></Sidebar><div className="app-main"><header className="topbar"><div className="breadcrumb"><SidebarTrigger /><span>工作空间</span><ChevronRight size={14}/><b>{page}</b></div><div className="top-actions"><span className="demo-label">示例工作空间</span><button aria-label="搜索患者" onClick={() => { navigate("患者与健康班"); setTab("patients"); setTimeout(() => document.getElementById("workspace-search")?.focus(), 80); }}><Search size={19}/></button><button aria-label="查看待审核事项" onClick={() => navigate("审核中心")}><Bell size={19}/></button><button aria-label="医生设置" className="avatar small" onClick={() => navigate("设置与接入")}>{s?.settings.doctor?.[0] ?? "医"}</button></div></header><main className="workspace"><div className="page-heading"><div><div className="eyebrow">MEDNEXUSAGENT / DOCTOR WORKSPACE</div><h1>{page === "工作台" ? `您好，${s?.settings.doctor ?? "医生"}` : page}{page === "工作台" && <span className="sun"> ☀</span>}</h1><p>{page === "工作台" ? "让 AI 分担日常，把时间留给更需要您的患者。" : subtitles[page]}</p></div>{newActions[page] && <Button className="primary" disabled={!s || busy} onClick={() => open(newActions[page][0])}><Plus size={16}/>{newActions[page][1]}</Button>}</div>
 {error && <div className="error-banner" role="alert"><CircleAlert size={18}/><span>{error}</span>{unauthorized ? <a href="/signin-with-chatgpt?return_to=%2F" target="_top">登录工作空间 <ArrowRight size={15}/></a> : <Button variant="outline" onClick={() => void reload()}>重试</Button>}</div>}
 {!s && loading && <div className="stats">{[1, 2, 3, 4].map(n => <Skeleton key={n} className="h-36 rounded-xl"/>)}</div>}
 {s && <>
 {page === "工作台" && <Dashboard state={s} setPage={navigate}/>}
 <DigitalHuman active={page === "数字人对话"} modelConfigured={integrations.model} onSettings={() => navigate("设置与接入")}/>
 {page === "患者与健康班" && <><div className="toolbar"><Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="patients">患者档案 · {s.patients.length}</TabsTrigger><TabsTrigger value="groups">我的健康班 · {s.groups.length}</TabsTrigger></TabsList></Tabs><div className="search-box"><Search size={16}/><Input id="workspace-search" placeholder={tab === "patients" ? "搜索姓名、备注、阶段" : "搜索健康班"} value={query} onChange={e => setQuery(e.target.value)}/></div></div>{tab === "patients" ? <section className="panel table-panel"><div className="section-head"><h2>患者列表</h2><div className="filter-picker"><Picker label="筛选健康班" value={filter} onChange={setFilter} items={[{ value: "all", label: "全部健康班" }, ...s.groups.map(g => ({ value: g.id, label: g.name }))]}/></div></div><Table><TableHeader><TableRow>{["患者", "健康班", "管理阶段", "建档日期", "操作"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{s.patients.filter(p => (filter === "all" || p.groupId === filter) && `${p.name}${p.note}${p.stage}`.includes(query)).map(p => <TableRow key={p.id}><TableCell><div className="patient-cell"><div className="avatar">{p.name[0]}</div><div><b>{p.name}</b><p>{p.gender} · {p.age} 岁</p></div></div></TableCell><TableCell>{group(p.groupId)}</TableCell><TableCell><span className="status teal always-visible">{p.stage}</span></TableCell><TableCell className="muted">{p.createdAt.slice(0, 10)}</TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => { setForm({ groupId: p.groupId, stage: p.stage, note: p.note }); setFormError(""); setDetailId(p.id); }}>查看档案 <ChevronRight size={14}/></Button></TableCell></TableRow>)}</TableBody></Table>{!s.patients.some(p => (filter === "all" || p.groupId === filter) && `${p.name}${p.note}${p.stage}`.includes(query)) && <Empty text="没有匹配的患者"/>}</section> : <div className="content-grid">{s.groups.filter(g => `${g.name}${g.description}`.includes(query)).map(g => <section className="panel group-card" key={g.id}><div className="task-icon teal"><Users size={20}/></div><h2>{g.name}</h2><p>{g.description}</p><div className="group-card-bottom"><span><b>{s.patients.filter(p => p.groupId === g.id).length}</b> 位患者</span><Button variant="outline" size="sm" onClick={() => { setFilter(g.id); setQuery(""); setTab("patients"); }}>查看成员 <ArrowRight size={14}/></Button></div></section>)}</div>}</>}
 {page === "AI 医助" && <><div className="info-banner"><Bot size={20}/><div><b>{integrations.model ? "AI 模型草稿模式" : "服务模板模式"}</b><p>{integrations.model ? "模型结合医生知识库整理回复，所有草稿都需医生审核。" : "当前未接入大模型。录入问题后将生成服务模板草稿，不会伪装为 AI 推理结果。"}</p></div><Button variant="ghost" onClick={() => navigate("设置与接入")}>接入设置 <ArrowRight size={14}/></Button></div><div className="agent-grid">{[["就医领队", "就诊资料、预约咨询、门诊协助"], ["康复领队", "随访信息收集、康复问题转交"], ["内容助手", "医学科普、数字人脚本审核"]].map(([name, desc], i) => <div className="panel agent-tile" key={name}><div className={`task-icon ${["teal", "purple", "orange"][i]}`}><Bot size={21}/></div><div><b>{name}</b><p>{desc}</p></div></div>)}</div><section className="panel"><div className="section-head"><h2>患者咨询记录</h2><span className="muted">医生审核后仅保存，不自动外发</span></div>{s.consultations.map(c => <article className="consultation" key={c.id}><div className="section-head"><div className="patient-cell"><div className="avatar">{patient(c.patientId)[0]}</div><div><b>{patient(c.patientId)}</b><p>{new Date(c.createdAt).toLocaleString("zh-CN")}</p></div></div><span className={`status always-visible ${c.status === "pending" ? "orange" : "teal"}`}>{c.status === "pending" ? "待医生审核" : c.status === "approved" ? "已通过 · 未发送" : "已退回"}</span></div><p className="question-text">{c.question}</p><div className="draft-box"><div><SparkleLabel />{c.source}</div><p>{c.response ?? c.draft}</p></div>{c.status === "pending" && <Button variant="outline" size="sm" disabled={busy} onClick={() => { setFormError(""); setReview({ id: c.id, kind: "consultation", title: patient(c.patientId) + "的咨询回复", body: c.draft, status: c.status }); }}>审核草稿 <ArrowRight size={14}/></Button>}</article>)}{!s.consultations.length && <Empty />}</section></>}
 {page === "审核中心" && <><div className="toolbar"><Tabs value={reviewTab} onValueChange={setReviewTab}><TabsList>{[["pending", "待审核"], ["approved", "已通过"], ["rejected", "已退回"], ["all", "全部"]].map(([v, l]) => <TabsTrigger value={v} key={v}>{l}</TabsTrigger>)}</TabsList></Tabs><div className="search-box"><Search size={16}/><Input placeholder="搜索审核内容" value={query} onChange={e => setQuery(e.target.value)}/></div></div><div className="panel">{reviewItems.map(c => <div className="review-row" key={c.id}><div className={`task-icon ${c.kind === "consultation" ? "orange" : "purple"}`}>{c.kind === "consultation" ? <Bot size={19}/> : <FileText size={19}/>}</div><div className="grow"><b>{c.title}</b><p>{c.sub}</p></div><span className="muted">{c.date.slice(0, 10)}</span><Button variant="outline" size="sm" onClick={() => { setFormError(""); setReview(c); }}>{c.status === "pending" ? "审核" : "查看"}<ChevronRight size={14}/></Button></div>)}{!reviewItems.length && <Empty text={reviewTab === "pending" ? "当前没有待审核事项" : "暂无审核记录"}/>}</div></>}
 {page === "随访管理" && <><div className="toolbar"><Tabs value={filter} onValueChange={setFilter}><TabsList><TabsTrigger value="all">全部随访</TabsTrigger><TabsTrigger value="pending">待完成</TabsTrigger><TabsTrigger value="completed">已完成</TabsTrigger></TabsList></Tabs><span className="muted">随访计划保存在工作空间，尚未接入通知渠道</span></div><div className="content-grid">{s.followups.filter(f => filter === "all" || f.status === filter).map(f => <section key={f.id} className="panel followup-card"><div className="section-head"><span className={`status always-visible ${f.status === "completed" ? "teal" : "orange"}`}>{f.status === "completed" ? "已完成" : "待随访"}</span><CalendarDays size={18}/></div><h2>{f.title}</h2><p>{f.content}</p><div className="followup-meta"><b>{patient(f.patientId)}</b><span>{f.due}</span></div>{f.result && <div className="result-box">随访记录：{f.result}</div>}{f.status === "pending" && <Button className="full-button" variant="outline" onClick={() => { setFollowupId(f.id); setResult(""); setFormError(""); }}>记录随访结果 <ArrowRight size={14}/></Button>}</section>)}</div>{!s.followups.some(f => filter === "all" || f.status === filter) && <Empty text="暂无该状态的随访"/>}</>}
 {page === "数字人工作室" && <><div className="studio-banner"><div className="studio-symbol"><Video size={39}/></div><div><span className="eyebrow">DOCTOR DIGITAL STUDIO</span><h2>让专业，以更亲切的方式触达</h2><p>撰写脚本、医生审核、导出内容。真人形象与声音克隆需接入数字人供应商。</p><span className="soft-tag">数字人视频生成：未接入</span></div></div><div className="toolbar"><Tabs value={filter} onValueChange={setFilter}><TabsList>{[["all", "全部内容"], ["数字人脚本", "数字人脚本"], ["科普文章", "科普文章"], ["就诊通知", "就诊通知"]].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}</TabsList></Tabs></div><div className="content-grid">{s.contents.filter(c => filter === "all" || c.kind === filter).map(c => <section className="panel content-card" key={c.id}><div className={`content-cover ${c.kind === "数字人脚本" ? "purple" : "teal"}`}>{c.kind === "数字人脚本" ? <Video size={36}/> : <BookOpen size={36}/>}<span>{c.kind}</span></div><div className="section-head"><span className="muted">{c.createdAt.slice(0, 10)}</span><span className={`status always-visible ${c.status === "pending" ? "orange" : "teal"}`}>{c.status === "pending" ? "待审核" : c.status === "approved" ? "审核通过" : "已退回"}</span></div><h2>{c.title}</h2><p className="line-clamp-3">{c.body}</p><div className="row-actions"><Button variant="outline" size="sm" onClick={() => { setFormError(""); setReview({ id: c.id, kind: "content", title: c.title, body: c.body, status: c.status }); }}>查看内容</Button><Button variant="ghost" size="sm" onClick={() => download(`${c.title}.txt`, `${c.title}\n审核状态：${c.status}\n\n${c.body}`)}><Download size={14}/>导出</Button></div></section>)}</div>{!s.contents.some(c => filter === "all" || c.kind === filter) && <Empty text="还没有此类内容"/>}</>}
 {page === "知识库" && <><div className="toolbar"><span className="muted">医生录入的资料可作为 AI 草稿的参考上下文</span><div className="search-box"><Search size={16}/><Input placeholder="搜索知识标题与正文" value={query} onChange={e => setQuery(e.target.value)}/></div></div><div className="knowledge-list">{s.knowledge.filter(k => `${k.title}${k.body}`.includes(query)).map(k => <section className="panel" key={k.id}><div className="section-head"><h2><BookOpen size={18}/>{k.title}</h2><span className="status teal always-visible">{k.category}</span></div><p className="body-text">{k.body}</p><span className="muted">录入于 {k.createdAt.slice(0, 10)}</span></section>)}</div>{!s.knowledge.some(k => `${k.title}${k.body}`.includes(query)) && <Empty text="没有匹配的知识"/>}</>}
 {page === "设置与接入" && <div className="settings-grid"><section className="panel"><div className="section-head"><h2>医生资料</h2><ShieldCheck size={18}/></div><form key={JSON.stringify(s.settings)} onSubmit={async (e) => { e.preventDefault(); const values = new FormData(e.currentTarget); await act({ type: "settings.update", doctor: String(values.get("doctor")), department: String(values.get("department")), hospital: String(values.get("hospital")) }); }}><Field label="医生称呼"><Input name="doctor" required maxLength={40} defaultValue={s.settings.doctor}/></Field><Field label="科室"><Input name="department" required maxLength={60} defaultValue={s.settings.department}/></Field><Field label="医疗机构"><Input name="hospital" required maxLength={100} defaultValue={s.settings.hospital}/></Field><Button className="primary" disabled={busy}>保存资料</Button></form><div className="settings-divider"/><h2>工作空间数据</h2><p className="body-text muted">当前包含示例患者。导出文件可能包含您录入的个人信息，请妥善保管。</p><Button variant="outline" onClick={() => download("MedNexusAgent-export.json", JSON.stringify(s, null, 2), "application/json")}><Download size={15}/>导出工作空间</Button><a className="signout-link" href="/signout-with-chatgpt?return_to=%2F" target="_top"><LogOut size={14}/>退出登录</a></section><div className="primary-column"><section className="panel"><div className="section-head"><h2>服务连接</h2><Link2 size={18}/></div>{[["大语言模型", integrations.model ? "已配置" : "未接入", integrations.model ? "通过服务端生成草稿，调用失败会明确提示。" : "设置服务端 LLM_API_KEY、LLM_MODEL，可选 LLM_BASE_URL。"], ["企业微信 / 患者社群", "未接入", "当前审核只保存结果，不会向真实患者发送消息。"], ["数字人对话", "已启用", "全站右下角可打开王主任的分身，辅助整理卵巢癌资料；实际 AI 分析需配置大模型并由医生复核。"], ["数字人视频服务", "未接入", "支持脚本创建与审核，真人克隆和视频合成需要供应商接入。"], ["医院预约与报告系统", "未接入", "当前仅记录咨询需求，不代表医院挂号、床位或检查预约成功。"]].map(([name, status, desc]) => <div className="integration-row" key={name}><div><b>{name}</b><p>{desc}</p></div><span className="soft-tag">{status}</span></div>)}</section><section className="panel"><div className="section-head"><h2>最近操作记录</h2><RefreshCw size={16}/></div><div className="audit-list">{s.audit.slice(0, 15).map(a => <div key={a.id}><span className="audit-dot"/><div><p>{a.action}</p><time>{new Date(a.at).toLocaleString("zh-CN")}</time></div></div>)}</div></section></div></div>}
 </>}
 <footer className="page-footer">MedNexusAgent · 医患连接，让服务持续发生 <span>初始数据均为示例 · 医疗内容需医生审核</span></footer></main></div>
 <Dialog open={!!modal} onOpenChange={v => { if (!busy && !v)
        setModal(null); }}><DialogContent className="form-dialog"><DialogHeader><DialogTitle>{{ patient: "添加患者", group: "创建健康班", consultation: "录入患者问题", followup: "安排随访", content: "创建内容", knowledge: "添加知识" }[modal ?? "patient"]}</DialogTitle><DialogDescription>{modal === "consultation" ? "整理为待审核草稿。不会向外部患者发送消息。" : "填写后保存到当前工作空间。"}</DialogDescription></DialogHeader><form onSubmit={submit}>
 {(modal === "patient" || modal === "group") && <Field label={modal === "patient" ? "患者姓名" : "健康班名称"}><Input required maxLength={40} value={form.name ?? ""} onChange={e => f("name", e.target.value)}/></Field>}
 {modal === "patient" && <><div className="form-two"><Field label="年龄"><Input type="number" min={0} max={120} required value={form.age ?? ""} onChange={e => f("age", e.target.value)}/></Field><Field label="性别"><Picker label="性别" value={form.gender} onChange={v => f("gender", v)} items={["男", "女", "未说明"].map(v => ({ value: v, label: v }))}/></Field></div><Field label="联系电话（选填）"><Input type="tel" maxLength={30} value={form.phone ?? ""} onChange={e => f("phone", e.target.value)}/></Field><Field label="所属健康班"><Picker label="健康班" value={form.groupId} onChange={v => f("groupId", v)} items={s?.groups.map(g => ({ value: g.id, label: g.name })) ?? []}/></Field><Field label="管理阶段"><Picker label="管理阶段" value={form.stage} onChange={v => f("stage", v)} items={["门诊随诊", "术前评估", "术后康复", "长期管理"].map(v => ({ value: v, label: v }))}/></Field><Field label="档案备注（选填）"><Textarea maxLength={5000} value={form.note ?? ""} onChange={e => f("note", e.target.value)}/></Field></>}
 {modal === "group" && <Field label="健康班介绍"><Textarea required maxLength={500} value={form.description ?? ""} onChange={e => f("description", e.target.value)}/></Field>}
 {(modal === "consultation" || modal === "followup") && <Field label="患者"><Picker label="选择患者" value={form.patientId} onChange={v => f("patientId", v)} items={s?.patients.map(p => ({ value: p.id, label: p.name })) ?? []}/></Field>}
 {modal === "consultation" && <Field label="患者的问题"><Textarea required maxLength={5000} rows={5} value={form.question ?? ""} onChange={e => f("question", e.target.value)} placeholder="记录患者原始问题，不必输入身份信息"/></Field>}
 {["followup", "content", "knowledge"].includes(modal ?? "") && <Field label="标题"><Input required maxLength={120} value={form.title ?? ""} onChange={e => f("title", e.target.value)}/></Field>}
 {modal === "followup" && <><Field label="随访日期"><Input required type="date" value={form.due ?? ""} onChange={e => f("due", e.target.value)}/></Field><Field label="随访内容"><Textarea required maxLength={5000} rows={4} value={form.content ?? ""} onChange={e => f("content", e.target.value)}/></Field></>}
 {modal === "content" && <Field label="内容类型"><Picker label="内容类型" value={form.kind} onChange={v => f("kind", v)} items={["数字人脚本", "科普文章", "就诊通知", "感谢信"].map(v => ({ value: v, label: v }))}/></Field>}
 {modal === "knowledge" && <Field label="知识分类"><Picker label="知识分类" value={form.category} onChange={v => f("category", v)} items={["就医指南", "康复管理", "医生品牌", "服务规范"].map(v => ({ value: v, label: v }))}/></Field>}
 {(modal === "content" || modal === "knowledge") && <Field label={modal === "content" ? "正文 / 视频脚本" : "知识正文"}><Textarea required rows={6} maxLength={5000} value={form.body ?? ""} onChange={e => f("body", e.target.value)}/></Field>}
 {formError && <p className="form-error" role="alert">{formError}</p>}<div className="dialog-actions"><Button type="button" variant="outline" disabled={busy} onClick={() => setModal(null)}>取消</Button><Button className="primary" disabled={busy}>{busy && <Loader2 className="animate-spin" size={15}/>} {modal === "consultation" ? "生成待审核草稿" : "保存"}</Button></div></form></DialogContent></Dialog>
 <Sheet open={!!selectedPatient} onOpenChange={v => { if (!busy && !v)
        setDetailId(null); }}><SheetContent className="detail-sheet"><SheetHeader><SheetTitle>{selectedPatient?.name}的患者档案</SheetTitle><SheetDescription>患者信息、管理阶段与服务记录</SheetDescription></SheetHeader>{selectedPatient && <div className="sheet-body"><div className="patient-card"><div className="avatar">{selectedPatient.name[0]}</div><div><h2>{selectedPatient.name}</h2><p>{selectedPatient.gender} · {selectedPatient.age} 岁</p><p>{selectedPatient.phone || "未录入联系电话"}</p></div></div><Field label="所属健康班"><Picker label="所属健康班" value={form.groupId} onChange={v => f("groupId", v)} items={s?.groups.map(g => ({ value: g.id, label: g.name })) ?? []}/></Field><Field label="管理阶段"><Picker label="管理阶段" value={form.stage} onChange={v => f("stage", v)} items={["门诊随诊", "术前评估", "术后康复", "长期管理"].map(v => ({ value: v, label: v }))}/></Field><Field label="档案备注"><Textarea value={form.note ?? ""} maxLength={5000} rows={5} onChange={e => f("note", e.target.value)}/></Field>{formError && <p className="form-error">{formError}</p>}<Button className="primary" disabled={busy} onClick={async () => { if (await act({ type: "patient.update", id: selectedPatient.id, groupId: form.groupId, stage: form.stage as "门诊随诊", note: form.note }))
        setDetailId(null); }}>保存档案</Button><div className="settings-divider"/><h2>服务记录</h2>{s?.consultations.filter(c => c.patientId === selectedPatient.id).map(c => <div className="patient-history" key={c.id}><b>患者咨询</b><p>{c.question}</p></div>)}{s?.followups.filter(c => c.patientId === selectedPatient.id).map(c => <div className="patient-history" key={c.id}><b>{c.title}</b><p>{c.due} · {c.status === "completed" ? "已完成" : "待完成"}</p></div>)}</div>}</SheetContent></Sheet>
 <Dialog open={!!review} onOpenChange={v => { if (!busy && !v)
        setReview(null); }}><DialogContent className="form-dialog"><DialogHeader><DialogTitle>{review?.title}</DialogTitle><DialogDescription>{review?.status === "pending" ? "请核实并编辑草稿。审核通过仅保存结果，不自动发送。" : "已归档的审核记录"}</DialogDescription></DialogHeader><Textarea aria-label="审核正文" rows={10} maxLength={5000} value={review?.body ?? ""} readOnly={review?.status !== "pending"} onChange={e => setReview(r => r ? { ...r, body: e.target.value } : null)}/>{formError && <p className="form-error">{formError}</p>}{review?.status === "pending" && <div className="dialog-actions"><Button variant="outline" disabled={busy || !review.body.trim()} onClick={async () => { if (await act({ type: "review", id: review.id, kind: review.kind, decision: "rejected", body: review.body }))
        setReview(null); }}>退回并保存意见</Button><Button className="primary" disabled={busy || !review.body.trim()} onClick={async () => { if (await act({ type: "review", id: review.id, kind: review.kind, decision: "approved", body: review.body }))
        setReview(null); }}><Check size={15}/>审核通过</Button></div>}</DialogContent></Dialog>
 <Dialog open={!!followupId} onOpenChange={v => { if (!busy && !v)
        setFollowupId(null); }}><DialogContent><DialogHeader><DialogTitle>记录随访结果</DialogTitle><DialogDescription>填写实际沟通结果后，将随访标记为完成。</DialogDescription></DialogHeader><Textarea aria-label="随访结果" maxLength={5000} rows={6} value={result} onChange={e => setResult(e.target.value)}/>{formError && <p className="form-error">{formError}</p>}<Button className="primary" disabled={busy || !result.trim()} onClick={async () => { if (followupId && await act({ type: "followup.complete", id: followupId, result }))
        setFollowupId(null); }}>保存并完成随访</Button></DialogContent></Dialog>
 </SidebarProvider>;
}
function SparkleLabel() { return <Bot size={15}/>; }
