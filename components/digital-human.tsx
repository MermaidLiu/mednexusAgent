"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, MessageCircle, RotateCcw, Sparkles, Square, Volume2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import DoctorAvatar3D from "@/components/doctor-avatar-3d";
import type { ChatMessage } from "@/lib/avatar-chat";
import { AVATAR_PATH, DIGITAL_DOCTOR_NAME, PRODUCT_NAME } from "@/lib/branding";

const doctorPrompts = ["整理病例需要哪些资料？", "帮我梳理病理报告要点", "整理 BRCA / HRD 检测信息", "准备待王主任复核的问题清单"];
const patientPrompts = ["复诊前需要准备什么？", "如何向医生描述我的不适？", "随访期间要注意什么？", "帮我整理想咨询的问题"];

type Message = ChatMessage & { id: string; mode?: "demo" | "model" };
type Variant = "doctor" | "patient";

export default function DigitalHuman({ active, modelConfigured, onSettings, variant = "doctor" }: { active: boolean; modelConfigured: boolean; onSettings: () => void; variant?: Variant }) {
  const isPatient = variant === "patient";
  const prompts = isPatient ? patientPrompts : doctorPrompts;
  const subtitle = isPatient ? "就医咨询与资料整理" : "病例与资料分析辅助";
  const [open, setOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  useEffect(() => { if (active) setOpen(true); }, [active]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [autoVoice, setAutoVoice] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const activeRef = useRef(open);
  const voiceEnabled = useRef(autoVoice);
  const voiceGeneration = useRef(0);
  const voiceStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopVoice() {
    voiceGeneration.current++;
    if (voiceStartTimer.current) clearTimeout(voiceStartTimer.current);
    voiceStartTimer.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(null);
    setVoiceNotice("");
  }
  useEffect(() => { setCanSpeak("speechSynthesis" in window && "SpeechSynthesisUtterance" in window); return () => { controller.current?.abort(); voiceGeneration.current++; if (voiceStartTimer.current) clearTimeout(voiceStartTimer.current); window.speechSynthesis?.cancel(); }; }, []);
  useEffect(() => { activeRef.current = open; if (!open) stopVoice(); }, [open]);
  useEffect(() => { voiceEnabled.current = autoVoice; if (!autoVoice) stopVoice(); }, [autoVoice]);
  useEffect(() => { const panel = scrollRef.current; if (panel) panel.scrollTop = panel.scrollHeight; }, [messages, pending, error, open]);

  function speak(text: string, id: string) {
    if (!canSpeak) return;
    stopVoice();
    const generation = voiceGeneration.current;
    setVoiceNotice("正在准备语音…");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    const chinese = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith("zh"));
    if (chinese) utterance.voice = chinese;
    utterance.onstart = () => { if (generation === voiceGeneration.current) { if (voiceStartTimer.current) clearTimeout(voiceStartTimer.current); setVoiceNotice(""); setSpeaking(id); } };
    utterance.onend = () => { if (generation === voiceGeneration.current) setSpeaking(null); };
    utterance.onerror = event => {
      if (generation !== voiceGeneration.current) return;
      if (voiceStartTimer.current) clearTimeout(voiceStartTimer.current);
      setSpeaking(null);
      if (!["canceled", "interrupted"].includes(event.error)) setVoiceNotice("浏览器暂时无法朗读，请检查系统语音或使用文字对话。");
    };
    voiceStartTimer.current = setTimeout(() => { if (generation === voiceGeneration.current) { stopVoice(); setVoiceNotice("浏览器未能启动朗读，请确认系统已安装中文语音，或换用 Chrome / Edge。"); } }, 5000);
    try { window.speechSynthesis.speak(utterance); } catch { stopVoice(); setVoiceNotice("浏览器朗读不可用，文字对话仍可继续。"); }
  }

  async function send(value = input) {
    const text = value.trim();
    if (!text || text.length > 3000 || locked.current) return;
    locked.current = true;
    stopVoice();
    setError("");
    const user: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const before = messages;
    const next = [...before, user];
    setMessages(next); setInput(""); setPending(true);
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort("timeout"), 40000);
    try {
      const history = next.slice(-19).map(({ role, content }) => ({ role, content }));
      const response = await fetch("/api/avatar-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, audience: variant }),
        signal: abort.signal,
      });
      const result = await response.json() as { reply?: string; mode?: "demo" | "model"; error?: string };
      if (!response.ok || !result.reply) throw new Error(result.error || "未能收到回复，请重试。");
      const answer: Message = { id: crypto.randomUUID(), role: "assistant", content: result.reply, mode: result.mode };
      setMessages([...next, answer]);
      if (voiceEnabled.current && activeRef.current) speak(answer.content, answer.id);
    } catch (e) {
      setMessages(before); setInput(text);
      setError(abort.signal.aborted ? (abort.signal.reason === "timeout" ? "等待回复超时，输入已保留，可重新发送。" : "已停止生成，输入已保留。") : e instanceof Error ? e.message : "连接失败，请重试。");
    } finally {
      window.clearTimeout(timeout); setPending(false); locked.current = false; controller.current = null;
    }
  }

  const introDoctor = `您好，我是${DIGITAL_DOCTOR_NAME}，${PRODUCT_NAME} 平台数字医助。可协助整理去标识化的病例、病理与检测资料，梳理资料缺口与待复核问题；分析结论需由主诊医生确认。`;
  const introPatient = `您好，我是${DIGITAL_DOCTOR_NAME}，${PRODUCT_NAME} 患者端数字医助。可以帮您整理就诊疑问、复诊准备和随访相关问题；不能诊断或调整用药，重要决定请与线下主诊医生确认。`;

  return <>
    {active && <section className="panel human-workspace-intro"><h2>{isPatient ? `咨询${DIGITAL_DOCTOR_NAME}` : subtitle}</h2><p>{isPatient ? `与${DIGITAL_DOCTOR_NAME}文字对话，整理就医问题与资料清单。` : `与${DIGITAL_DOCTOR_NAME}一起整理病例、病理及分子检测资料，形成待复核清单。`}</p><Button onClick={() => setOpen(true)}>打开对话</Button><p className="muted">切换页面仍可从右下角继续本次对话。</p></section>}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button className="human-floating-launcher" aria-label={open ? `收起${DIGITAL_DOCTOR_NAME}` : `打开${DIGITAL_DOCTOR_NAME}`}><span><b>{DIGITAL_DOCTOR_NAME}</b><small>{speaking ? "正在朗读…" : pending ? "正在整理…" : subtitle}</small></span><DoctorAvatar3D speaking={Boolean(speaking)} thinking={pending} paused={motionPaused}/></button></PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={12} collisionPadding={12} className="human-floating-panel" aria-label={`${DIGITAL_DOCTOR_NAME}：${subtitle}`} onInteractOutside={e => e.preventDefault()}>
      <button className="human-close" onClick={() => setOpen(false)} aria-label="关闭对话"><X size={18}/></button>
      <div className="digital-human-layout">
    <section className={`human-stage ${speaking ? "is-speaking" : ""}`} aria-label={`${PRODUCT_NAME} 数字医助 ${DIGITAL_DOCTOR_NAME}`}>
      <div className="human-stage-top"><span><Sparkles size={15}/> {PRODUCT_NAME} 数字医助</span><span className="human-type">2D 形象</span></div>
      <div className="human-image-wrap"><img className="human-image" src={AVATAR_PATH} alt={`${DIGITAL_DOCTOR_NAME}：黑框眼镜、白大褂、蓝色领带的卡通医生`} width={1280} height={1280}/></div>
      <div className="human-stage-caption"><span className="human-overline">{PRODUCT_NAME}</span><h2>你好，我是{DIGITAL_DOCTOR_NAME}<span>。</span></h2><p>把想了解的事情告诉我，<br/>我们一起慢慢理清。</p></div>
      <div className="human-presence" role="status"><div className={`voice-bars ${speaking ? "playing" : ""}`} aria-hidden="true">{[0,1,2,3,4].map(i => <i key={i} style={{ animationDelay: `${i * .12}s` }}/>)}</div><span>{pending ? "正在整理回复…" : speaking ? `${DIGITAL_DOCTOR_NAME}正在说话` : "准备好和你聊聊"}</span>{speaking && <button onClick={stopVoice} aria-label="停止朗读"><Square size={13}/></button>}</div>
    </section>
    <section className="human-conversation" aria-label="数字人对话">
      <header className="human-chat-header"><div><h2><MessageCircle size={19}/> {DIGITAL_DOCTOR_NAME}</h2><p>{modelConfigured ? `${subtitle} · AI 对话` : `${subtitle} · 演示模式`}</p></div><Button variant="ghost" size="sm" disabled={pending || !messages.length} onClick={() => { stopVoice(); setMessages([]); setInput(""); setError(""); }}><RotateCcw size={15}/>新对话</Button></header>
      {!modelConfigured && <div className="human-demo-note"><span>当前使用本地演示回复，连接大模型后可自由交流。</span><button onClick={() => { setOpen(false); onSettings(); }}>查看接入方式</button></div>}
      <div className="human-messages" ref={scrollRef} role="log" aria-label="对话记录" aria-live="polite" aria-relevant="additions">
        <div className="human-message assistant"><img src={AVATAR_PATH} alt="" width={34} height={34}/><div><span className="speaker-name">{DIGITAL_DOCTOR_NAME}</span><div className="human-bubble">{isPatient ? introPatient : introDoctor}</div></div></div>
        {!messages.length && <div className="human-starters">{prompts.map(p => <button key={p} onClick={() => void send(p)} disabled={pending}>{p}<ArrowUp size={14}/></button>)}</div>}
        {messages.map(message => <div className={`human-message ${message.role}`} key={message.id}>{message.role === "assistant" && <img src={AVATAR_PATH} alt="" width={34} height={34}/>}<div><span className="speaker-name">{message.role === "user" ? "你" : `${DIGITAL_DOCTOR_NAME}${message.mode === "demo" ? " · 演示回复" : " · AI 回复"}`}</span><div className="human-bubble">{message.content}</div>{message.role === "assistant" && <button className="read-message" disabled={!canSpeak} title={!canSpeak ? "当前浏览器不支持朗读" : undefined} onClick={() => speaking === message.id ? stopVoice() : speak(message.content, message.id)}>{speaking === message.id ? <Square size={13}/> : <Volume2 size={14}/>} {speaking === message.id ? "停止朗读" : "朗读"}</button>}</div></div>)}
        {pending && <div className="human-thinking"><Loader2 size={15} className="animate-spin"/> {DIGITAL_DOCTOR_NAME}正在整理回复…</div>}
      </div>
      <div className="human-compose-area">
        {error && <p className="human-error" role="alert">{error}</p>}
        {voiceNotice && <p className="human-voice-notice" role="status">{voiceNotice}</p>}
        <form className="human-composer" onSubmit={e => { e.preventDefault(); void send(); }}><Textarea aria-label={`给${DIGITAL_DOCTOR_NAME}发送消息`} placeholder={isPatient ? "描述您的就医疑问或粘贴去标识化报告文字…" : "粘贴去标识化报告文字，或输入资料整理相关问题…"} value={input} maxLength={3000} disabled={pending} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/><div className="human-composer-bottom"><span>Enter 发送 · Shift + Enter 换行</span>{pending ? <Button type="button" className="human-send" aria-label="停止生成" onClick={() => controller.current?.abort()}><Square size={16}/></Button> : <Button type="submit" className="human-send" disabled={!input.trim()} aria-label="发送消息"><ArrowUp size={20}/></Button>}</div></form>
        <div className="human-chat-options"><label htmlFor="human-auto-voice"><AudioLines size={15}/> 自动朗读<Switch id="human-auto-voice" checked={autoVoice} onCheckedChange={setAutoVoice} disabled={!canSpeak}/></label><span>{canSpeak ? "浏览器语音" : "此浏览器不支持朗读"}</span></div>
        <p className="human-disclaimer">AI 数字医助，非线下真人本人；内容供参考，诊疗请以主诊医生意见为准。刷新后对话清空。</p>
      </div>
    </section>
  </div></PopoverContent></Popover>
  <button className="human-motion-toggle" onClick={() => setMotionPaused(v => !v)} aria-pressed={motionPaused}>{motionPaused ? "播放动作" : "暂停动作"}</button>
  </>;
}
