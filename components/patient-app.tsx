"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BookOpen, CalendarDays, ChevronRight, MessageCircle, Home, ArrowLeft, Inbox, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DigitalHuman from "@/components/digital-human";
import { DIGITAL_DOCTOR_NAME, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/branding";

const pages = ["首页", "咨询王主任", "我的消息", "复诊准备", "随访提醒"] as const;
type Page = (typeof pages)[number];

const tips = [
  { title: "整理既往资料", body: "带上近期检查报告、出院小结、用药清单，并写下最想咨询的 2～3 个问题。" },
  { title: "记录症状变化", body: "出现时间、频率、是否加重，以及已采取的措施，便于医生快速了解。" },
  { title: "隐私与去标识", body: "在线向王主任咨询时，请勿发送身份证号、完整住址等敏感信息；可打码后再粘贴报告文字。" },
];

export default function PatientApp() {
  const [page, setPage] = useState<Page>("首页");
  const [modelConfigured, setModelConfigured] = useState(false);
  const [ttsConfigured, setTtsConfigured] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [phoneMask, setPhoneMask] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [bindMsg, setBindMsg] = useState("");
  const [inbox, setInbox] = useState<{ id: string; title: string; body: string; status: string; created_at: string }[]>([]);
  const [authError, setAuthError] = useState("");

  const reloadSession = () => {
    void fetch("/api/patient/auth", { cache: "no-store" }).then(r => r.json()).then(d => {
      setLoggedIn(Boolean(d.loggedIn));
      setPhoneMask(d.phoneMask ?? "");
    }).catch(() => setLoggedIn(false));
  };

  useEffect(() => {
    void fetch("/api/public/config", { cache: "no-store" }).then(r => r.json()).then(d => {
      setModelConfigured(Boolean(d.integrations?.model));
      setTtsConfigured(Boolean(d.integrations?.tts));
    }).catch(() => {});
    reloadSession();
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "digital-human") setPage("咨询王主任");
  }, []);

  useEffect(() => {
    if (loggedIn && page === "我的消息") {
      void fetch("/api/patient/inbox", { cache: "no-store" }).then(r => r.json()).then(d => setInbox(d.items ?? [])).catch(() => setInbox([]));
    }
  }, [loggedIn, page]);

  async function login() {
    setAuthError("");
    const r = await fetch("/api/patient/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", phone, code, privacyAccepted: privacy, ageConfirmed: ageOk, dataOptIn: false }),
    });
    const d = await r.json() as { error?: string; ok?: boolean };
    if (!r.ok) { setAuthError(d.error ?? "登录失败"); return; }
    reloadSession();
  }

  async function bindDoctor() {
    setBindMsg("");
    const r = await fetch("/api/patient/bind", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-medcare-workspace-owner": "local_seedy" },
      body: JSON.stringify({ inviteCode }),
    });
    const d = await r.json() as { error?: string; doctor?: string; ok?: boolean };
    setBindMsg(d.error ?? (d.ok ? `已绑定 ${d.doctor}` : "绑定失败"));
  }

  return (
    <div className="patient-shell">
      <header className="patient-topbar">
        <Link href="/" className="patient-back"><ArrowLeft size={16}/> {PRODUCT_NAME}</Link>
        <span className="patient-badge">{loggedIn ? `已登录 ${phoneMask}` : "未登录 · 临时会话"}</span>
      </header>
      <div className="patient-layout">
        <aside className="patient-nav">
          <div className="portal-brand compact">
            <span className="brand-icon"><Activity size={22}/></span>
            <div><strong>{PRODUCT_NAME}</strong><span>{PRODUCT_TAGLINE}</span></div>
          </div>
          <nav>
            {pages.map(label => {
              const Icon = label === "首页" ? Home : label === "咨询王主任" ? MessageCircle : label === "我的消息" ? Inbox : label === "复诊准备" ? BookOpen : CalendarDays;
              return (
                <button key={label} type="button" className={page === label ? "active" : ""} onClick={() => setPage(label)}>
                  <Icon size={18}/> {label}
                </button>
              );
            })}
          </nav>
          <p className="patient-nav-note">数字医助：<b>{DIGITAL_DOCTOR_NAME}</b></p>
          <Link href="/doctor" className="patient-doctor-link">医生登录入口 <ChevronRight size={14}/></Link>
        </aside>
        <main className="patient-main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{PRODUCT_NAME} / PATIENT v2</div>
              <h1>{page}</h1>
              <p>
                {page === "首页" && `欢迎使用 ${PRODUCT_NAME} 患者端。登录后对话可跨设备续聊，并接收随访站内消息。`}
                {page === "咨询王主任" && `${DIGITAL_DOCTOR_NAME}基于医生知识库与大模型回答；未配置模型时不会返回演示假回复。`}
                {page === "我的消息" && "医生审核通过的随访/提醒会出现在此处（短信需另行配置）。"}
                {page === "复诊准备" && "就诊前准备清单，帮助您更高效地与医生沟通。"}
                {page === "随访提醒" && "登录后可接收真实触达；未登录仅展示演示样式。"}
              </p>
            </div>
          </div>

          {!loggedIn && page === "首页" && (
            <section className="panel patient-login">
              <h2><LogIn size={18}/> 手机号登录</h2>
              <p className="muted">内测验证码：<b>123456</b> · 需年满 18 周岁</p>
              <label className="form-field"><span>手机号</span><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="11 位手机号"/></label>
              <label className="form-field"><span>验证码</span><Input value={code} onChange={e => setCode(e.target.value)} placeholder="短信验证码"/></label>
              <label className="patient-check"><input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)}/> 我已阅读并同意隐私政策与数据授权</label>
              <label className="patient-check"><input type="checkbox" checked={ageOk} onChange={e => setAgeOk(e.target.checked)}/> 我确认已年满 18 周岁</label>
              {authError && <p className="form-error">{authError}</p>}
              <Button className="primary" onClick={() => void login()}>登录 / 注册</Button>
              <div className="settings-divider"/>
              <h3>绑定主管医生</h3>
              <label className="form-field"><span>医生邀请码</span><Input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="例如 WJ2026"/></label>
              {bindMsg && <p className="muted">{bindMsg}</p>}
              <Button variant="outline" disabled={!loggedIn} onClick={() => void bindDoctor()}>绑定健康班</Button>
            </section>
          )}

          {loggedIn && page === "首页" && (
            <>
              <section className="panel patient-welcome">
                <h2>您好，{phoneMask}</h2>
                <p>已启用登录态对话持久化。绑定邀请码后可关联{DIGITAL_DOCTOR_NAME}团队知识库。</p>
                <label className="form-field"><span>医生邀请码</span><Input value={inviteCode} onChange={e => setInviteCode(e.target.value)}/></label>
                <Button variant="outline" onClick={() => void bindDoctor()}>绑定</Button>
                {bindMsg && <p className="muted">{bindMsg}</p>}
                <Button className="primary" onClick={() => setPage("咨询王主任")}>咨询{DIGITAL_DOCTOR_NAME} <ChevronRight size={16}/></Button>
              </section>
            </>
          )}

          {page === "首页" && loggedIn && (
            <div className="patient-quick-grid">
              {tips.map(t => (
                <section className="panel" key={t.title}><h3>{t.title}</h3><p className="body-text">{t.body}</p></section>
              ))}
            </div>
          )}

          {page === "首页" && !loggedIn && (
            <div className="patient-quick-grid">
              {tips.map(t => (
                <section className="panel" key={t.title}><h3>{t.title}</h3><p className="body-text">{t.body}</p></section>
              ))}
            </div>
          )}

          {page === "咨询王主任" && (
            <section className="panel human-workspace-intro patient-chat-intro">
              <h2>与{DIGITAL_DOCTOR_NAME}对话</h2>
              <p>{ttsConfigured ? "已配置火山 TTS 真声。" : "TTS 未配置时将尝试浏览器备用语音。"} {modelConfigured ? "大模型已就绪。" : "大模型未配置，无法发送对话。"}</p>
            </section>
          )}

          {page === "我的消息" && (
            <div className="knowledge-list">
              {!loggedIn && <p className="muted">登录后查看站内随访消息。</p>}
              {loggedIn && !inbox.length && <p className="muted">暂无消息。医生审核触达后会出现在这里。</p>}
              {inbox.map(item => (
                <section className="panel" key={item.id}>
                  <div className="section-head"><h2>{item.title}</h2><span className="status teal always-visible">{item.status}</span></div>
                  <p className="body-text">{item.body}</p>
                  <span className="muted">{item.created_at?.slice(0, 16)}</span>
                </section>
              ))}
            </div>
          )}

          {page === "复诊准备" && (
            <div className="knowledge-list">
              {tips.map(t => (
                <section className="panel" key={t.title}>
                  <div className="section-head"><h2><BookOpen size={18}/>{t.title}</h2></div>
                  <p className="body-text">{t.body}</p>
                </section>
              ))}
            </div>
          )}

          {page === "随访提醒" && (
            <div className="content-grid">
              {[
                { title: "复诊提醒", due: loggedIn ? "登录态可接收" : "演示", body: "审核通过后写入「我的消息」；短信通道待配置。" },
                { title: "用药提醒", due: "计划触达", body: "医生可在工作台创建触达任务，默认需审核。" },
              ].map(f => (
                <section className="panel followup-card" key={f.title}>
                  <span className="status orange always-visible">PRD M4</span>
                  <h2>{f.title}</h2>
                  <p>{f.body}</p>
                  <div className="followup-meta"><span>{f.due}</span></div>
                </section>
              ))}
            </div>
          )}

          <footer className="page-footer">{PRODUCT_NAME} · 患者端 v2 <span>AI 标识 · 内容仅供参考</span></footer>
        </main>
      </div>
      <DigitalHuman variant="patient" active={page === "咨询王主任"} modelConfigured={modelConfigured} ttsConfigured={ttsConfigured} patientLoggedIn={loggedIn} onSettings={() => window.open("/doctor?view=digital-human", "_self")}/>
    </div>
  );
}
