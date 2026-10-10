"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BookOpen, CalendarDays, ChevronRight, MessageCircle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DigitalHuman from "@/components/digital-human";
import { DIGITAL_DOCTOR_NAME, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/branding";

const pages = ["首页", "咨询王主任", "复诊准备", "随访提醒"] as const;
type Page = (typeof pages)[number];

const tips = [
  { title: "整理既往资料", body: "带上近期检查报告、出院小结、用药清单，并写下最想咨询的 2～3 个问题。" },
  { title: "记录症状变化", body: "出现时间、频率、是否加重，以及已采取的措施，便于医生快速了解。" },
  { title: "隐私与去标识", body: "在线向王主任咨询时，请勿发送身份证号、完整住址等敏感信息；可打码后再粘贴报告文字。" },
];

export default function PatientApp() {
  const [page, setPage] = useState<Page>("首页");
  const [modelConfigured, setModelConfigured] = useState(false);

  useEffect(() => {
    void fetch("/api/workspace", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setModelConfigured(Boolean(d.integrations?.model)))
      .catch(() => setModelConfigured(false));
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "digital-human") setPage("咨询王主任");
  }, []);

  return (
    <div className="patient-shell">
      <header className="patient-topbar">
        <Link href="/" className="patient-back"><ArrowLeft size={16}/> {PRODUCT_NAME}</Link>
        <span className="patient-badge">患者服务 · 演示</span>
      </header>
      <div className="patient-layout">
        <aside className="patient-nav">
          <div className="portal-brand compact">
            <span className="brand-icon"><Activity size={22}/></span>
            <div><strong>{PRODUCT_NAME}</strong><span>{PRODUCT_TAGLINE}</span></div>
          </div>
          <nav>
            {pages.map(label => {
              const Icon = label === "首页" ? Home : label === "咨询王主任" ? MessageCircle : label === "复诊准备" ? BookOpen : CalendarDays;
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
              <div className="eyebrow">{PRODUCT_NAME} / PATIENT</div>
              <h1>{page}</h1>
              <p>
                {page === "首页" && `欢迎使用 ${PRODUCT_NAME} 患者端，与${DIGITAL_DOCTOR_NAME}一起整理就医问题。`}
                {page === "咨询王主任" && `${DIGITAL_DOCTOR_NAME}为平台统一数字医助，回答供参考，重要决定请与线下主诊医生确认。`}
                {page === "复诊准备" && "就诊前准备清单，帮助您更高效地与医生沟通。"}
                {page === "随访提醒" && "演示随访计划样式；正式提醒需医院或医生团队开通通知渠道。"}
              </p>
            </div>
            {page === "咨询王主任" && (
              <Button className="primary" onClick={() => document.querySelector<HTMLButtonElement>(".human-floating-launcher")?.click()}>
                打开对话
              </Button>
            )}
          </div>

          {page === "首页" && (
            <>
              <section className="panel patient-welcome">
                <h2>您好，我是{DIGITAL_DOCTOR_NAME}</h2>
                <p>我是 {PRODUCT_NAME} 的数字医助，可以帮您整理就诊疑问、复诊资料和康复随访问题。我基于 AI 与平台规范作答，不能替代线下诊疗。</p>
                <Button className="primary" onClick={() => setPage("咨询王主任")}>开始咨询 <ChevronRight size={16}/></Button>
              </section>
              <div className="patient-quick-grid">
                {tips.map(t => (
                  <section className="panel" key={t.title}>
                    <h3>{t.title}</h3>
                    <p className="body-text">{t.body}</p>
                  </section>
                ))}
              </div>
            </>
          )}

          {page === "咨询王主任" && (
            <section className="panel human-workspace-intro patient-chat-intro">
              <h2>与{DIGITAL_DOCTOR_NAME}对话</h2>
              <p>右下角浮窗可在任意页面继续本次对话。支持文字、朗读与快捷问题。</p>
            </section>
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
                { title: "术后第 7 天康复随访", due: "示例 · 待医生确认", body: "了解居家康复情况，如有不适请记录并联系主诊医生。" },
                { title: "复查安排确认", due: "示例 · 待通知", body: "收到复查通知后请按医院指引准备；本端暂未接入短信或微信提醒。" },
              ].map(f => (
                <section className="panel followup-card" key={f.title}>
                  <span className="status orange always-visible">演示</span>
                  <h2>{f.title}</h2>
                  <p>{f.body}</p>
                  <div className="followup-meta"><span>{f.due}</span></div>
                </section>
              ))}
            </div>
          )}

          <footer className="page-footer">{PRODUCT_NAME} · 患者端演示 <span>内容仅供参考 · 请以线下医生意见为准</span></footer>
        </main>
      </div>
      <DigitalHuman variant="patient" active={page === "咨询王主任"} modelConfigured={modelConfigured} onSettings={() => window.open("/doctor?view=digital-human", "_self")}/>
    </div>
  );
}
