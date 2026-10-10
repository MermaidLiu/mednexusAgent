"use client";
import Link from "next/link";
import { Activity, HeartHandshake, Stethoscope, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DIGITAL_DOCTOR_NAME, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/branding";

export default function PortalHome() {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-brand">
          <span className="brand-icon"><Activity size={26}/></span>
          <div>
            <strong>{PRODUCT_NAME}</strong>
            <span>{PRODUCT_TAGLINE}</span>
          </div>
        </div>
      </header>
      <main className="portal-main">
        <div className="portal-hero">
          <p className="eyebrow">{PRODUCT_NAME} · 双端服务</p>
          <h1>选择您要进入的工作台</h1>
          <p>医生端管理患者与审核；患者端向{DIGITAL_DOCTOR_NAME}咨询与查看服务指引。数字医助全平台统一为{DIGITAL_DOCTOR_NAME}。</p>
        </div>
        <div className="portal-cards">
          <section className="portal-card">
            <div className="portal-card-icon teal"><Stethoscope size={28}/></div>
            <h2>医生端</h2>
            <p>健康班、AI 医助草稿、审核中心、随访与数字人工作室。登录后保存工作空间数据。</p>
            <Button asChild className="primary"><Link href="/doctor">进入医生工作台 <ArrowRight size={16}/></Link></Button>
          </section>
          <section className="portal-card">
            <div className="portal-card-icon purple"><HeartHandshake size={28}/></div>
            <h2>患者端</h2>
            <p>与{DIGITAL_DOCTOR_NAME}对话、整理就诊问题、了解复诊准备与随访提醒（演示体验，不替代线下诊疗）。</p>
            <Button asChild variant="outline"><Link href="/patient">进入患者服务 <ArrowRight size={16}/></Link></Button>
          </section>
        </div>
        <p className="portal-footnote">医疗内容仅供参考，个性化诊疗请以主诊{DIGITAL_DOCTOR_NAME}或线下医生意见为准。</p>
      </main>
    </div>
  );
}
