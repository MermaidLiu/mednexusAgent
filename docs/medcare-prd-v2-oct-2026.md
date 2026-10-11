# MedCare PRD v2.0（2026-10）实现对照

来源：`MedCare_PRD_月内迭代版_v1.0_2026-10-10`

## 已落地（代码可跑）

| 模块 | PRD | 实现 |
|---|---|---|
| M1-1 | JUVOR 主 + 火山降级 | `lib/llm-router.ts`，8s 超时降级 |
| M1-3 | 知识库 RAG | `lib/rag.ts` + 数字人/咨询上下文 |
| M1-4 | 合规边界 | `lib/compliance.ts` 固定话术 + AI 标识 |
| M1-7 | 下线演示回复 | `lib/avatar-chat.ts` 无模型即报错 |
| M1-2 | 火山 TTS | `lib/volcano-tts.ts` + `/api/tts`（未配密钥则文字-only） |
| M3 | 视频工作室 | `video.generate` 命令 + 占位预览 + 审核 |
| M4 | 随访触达 | `outreach.create` + 审核 + 患者站内信箱 |
| M5 | 患者登录 | `/api/patient/auth` 手机验证码（内测 123456） |
| M5-2/3 | 绑定与对话持久化 | `/api/patient/bind` + `patient_chat_messages` |
| M6-1 | 审核扩展 | 视频/触达进入审核中心 |
| M6-3 | 患者登录态列 | 医生端患者列表 `accountStatus` |

## 待接外部 API（已留 env / 占位）

- 火山 TTS / 数字人视频 / 声音克隆真实联调
- 短信通道与签名报备
- 口型 viseme（M1-5 P1）
- 医生 2D 形象批量试点（M2）
- Token 计费账本 UI（§13.3，仅事件字段预留）

## 本地

```sh
npm run db:local   # 含 0001 患者表迁移
npm run dev
```

患者端：登录 → 绑定邀请码 `WJ2026`（与医生端设置一致）→ 咨询王主任。
