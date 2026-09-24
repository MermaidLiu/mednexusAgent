"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, MessageCircle, RotateCcw, Sparkles, Square, Volume2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import DoctorAvatar3D from "@/components/doctor-avatar-3d";
import type { ChatMessage } from "@/lib/avatar-chat";

const avatar = "/avatars/mednexus-doctor.jpg";
const prompts = ["整理卵巢癌病例需要哪些资料？", "帮我梳理病理报告要点", "整理 BRCA / HRD 检测信息", "准备给王教授的复核清单"];
type Message = ChatMessage & { id: string; mode?: "demo" | "model" };

export default function DigitalHuman({ active, modelConfigured, onSettings }: { active: boolean; modelConfigured: boolean; onSettings: () => void }) {
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
      // Nine complete turns plus the current question; no patient records or credentials.
      const history = next.slice(-19).map(({ role, content }) => ({ role, content }));
      const response = await fetch("/api/avatar-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }), signal: abort.signal });
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

  return <>
    {active && <section className="panel human-workspace-intro"><h2>卵巢癌分析辅助</h2><p>与王主任的分身一起整理病例、病理及分子检测资料，准备交给王教授复核的问题。</p><Button onClick={() => setOpen(true)}>打开对话</Button><p className="muted">切换页面仍可从右下角继续本次对话。</p></section>}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button className="human-floating-launcher" aria-label={open ? "收起王主任的分身" : "打开王主任的分身"}><span><b>王主任的分身</b><small>{speaking ? "正在朗读…" : pending ? "正在整理…" : "卵巢癌分析辅助"}</small></span><DoctorAvatar3D speaking={Boolean(speaking)} thinking={pending} paused={motionPaused}/></button></PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={12} collisionPadding={12} className="human-floating-panel" aria-label="王主任的分身：卵巢癌分析辅助" onInteractOutside={e => e.preventDefault()}>
      <button className="human-close" onClick={() => setOpen(false)} aria-label="关闭对话"><X size={18}/></button>
      <div className="digital-human-layout">
    <section className={`human-stage ${speaking ? "is-speaking" : ""}`} aria-label="数字医助王主任的分身">
      <div className="human-stage-top"><span><Sparkles size={15}/> MedNexus 数字医助</span><span className="human-type">2D 形象</span></div>
      <div className="human-image-wrap"><img className="human-image" src={avatar} alt="王主任的分身：黑框眼镜、白大褂、蓝色领带的卡通医生" width={1280} height={1280}/></div>
      <div className="human-stage-caption"><span className="human-overline">YOUR DIGITAL COMPANION</span><h2>你好，我是王主任的分身<span>。</span></h2><p>把想了解的事情告诉我，<br/>我们一起慢慢理清。</p></div>
      <div className="human-presence" role="status"><div className={`voice-bars ${speaking ? "playing" : ""}`} aria-hidden="true">{[0,1,2,3,4].map(i => <i key={i} style={{ animationDelay: `${i * .12}s` }}/>)}</div><span>{pending ? "正在整理回复…" : speaking ? "王主任的分身正在说话" : "准备好和你聊聊"}</span>{speaking && <button onClick={stopVoice} aria-label="停止朗读"><Square size={13}/></button>}</div>
    </section>
    <section className="human-conversation" aria-label="数字人对话">
      <header className="human-chat-header"><div><h2><MessageCircle size={19}/> 王主任的分身</h2><p>{modelConfigured ? "卵巢癌分析辅助 · AI 对话" : "卵巢癌分析辅助 · 演示模式"}</p></div><Button variant="ghost" size="sm" disabled={pending || !messages.length} onClick={() => { stopVoice(); setMessages([]); setInput(""); setError(""); }}><RotateCcw size={15}/>新对话</Button></header>
      {!modelConfigured && <div className="human-demo-note"><span>当前使用本地演示回复，连接大模型后可自由交流。</span><button onClick={() => { setOpen(false); onSettings(); }}>查看接入方式</button></div>}
      <div className="human-messages" ref={scrollRef} role="log" aria-label="对话记录" aria-live="polite" aria-relevant="additions">
        <div className="human-message assistant"><img src={avatar} alt="" width={34} height={34}/><div><span className="speaker-name">王主任的分身</span><div className="human-bubble">您好，我是王主任的分身，协助王教授整理卵巢癌相关资料。您可以粘贴去除姓名、证件号等身份信息的病理报告或病史文字，我们一起梳理已有信息、资料缺口和待复核问题。分析草稿需由王教授审核。</div></div></div>
        {!messages.length && <div className="human-starters">{prompts.map(p => <button key={p} onClick={() => void send(p)} disabled={pending}>{p}<ArrowUp size={14}/></button>)}</div>}
        {messages.map(message => <div className={`human-message ${message.role}`} key={message.id}>{message.role === "assistant" && <img src={avatar} alt="" width={34} height={34}/>}<div><span className="speaker-name">{message.role === "user" ? "你" : `王主任的分身${message.mode === "demo" ? " · 演示回复" : " · AI 回复"}`}</span><div className="human-bubble">{message.content}</div>{message.role === "assistant" && <button className="read-message" disabled={!canSpeak} title={!canSpeak ? "当前浏览器不支持朗读" : undefined} onClick={() => speaking === message.id ? stopVoice() : speak(message.content, message.id)}>{speaking === message.id ? <Square size={13}/> : <Volume2 size={14}/>} {speaking === message.id ? "停止朗读" : "朗读"}</button>}</div></div>)}
        {pending && <div className="human-thinking"><Loader2 size={15} className="animate-spin"/> 王主任的分身正在整理回复…</div>}
      </div>
      <div className="human-compose-area">
        {error && <p className="human-error" role="alert">{error}</p>}
        {voiceNotice && <p className="human-voice-notice" role="status">{voiceNotice}</p>}
        <form className="human-composer" onSubmit={e => { e.preventDefault(); void send(); }}><Textarea aria-label="给王主任的分身发送消息" placeholder="粘贴去标识化报告文字，或输入卵巢癌相关问题…" value={input} maxLength={3000} disabled={pending} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/><div className="human-composer-bottom"><span>Enter 发送 · Shift + Enter 换行</span>{pending ? <Button type="button" className="human-send" aria-label="停止生成" onClick={() => controller.current?.abort()}><Square size={16}/></Button> : <Button type="submit" className="human-send" disabled={!input.trim()} aria-label="发送消息"><ArrowUp size={20}/></Button>}</div></form>
        <div className="human-chat-options"><label htmlFor="human-auto-voice"><AudioLines size={15}/> 自动朗读<Switch id="human-auto-voice" checked={autoVoice} onCheckedChange={setAutoVoice} disabled={!canSpeak}/></label><span>{canSpeak ? "浏览器语音" : "此浏览器不支持朗读"}</span></div>
        <p className="human-disclaimer">虚拟助手，非王教授本人；分析供医生复核。刷新后对话清空。</p>
      </div>
    </section>
  </div></PopoverContent></Popover>
  <button className="human-motion-toggle" onClick={() => setMotionPaused(v => !v)} aria-pressed={motionPaused}>{motionPaused ? "播放动作" : "暂停动作"}</button>
  </>;
}
