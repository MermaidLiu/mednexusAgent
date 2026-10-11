import { database } from "./server-store";
import { hashPhoneSync, maskPhone, newSessionToken } from "./patient-auth";

export type PatientAccountRow = {
  id: string;
  phone_hash: string;
  phone_mask: string;
  privacy_accepted_at: string | null;
  data_opt_in: number;
  created_at: string;
};

const SESSION_DAYS = 30;

export async function findOrCreateAccount(phone: string, privacyAccepted: boolean, dataOptIn: boolean) {
  const db = database();
  const phoneHash = hashPhoneSync(phone);
  const existing = await db.prepare("SELECT * FROM patient_accounts WHERE phone_hash = ?").bind(phoneHash).first<PatientAccountRow>();
  if (existing) return existing;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    "INSERT INTO patient_accounts (id, phone_hash, phone_mask, privacy_accepted_at, data_opt_in, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(id, phoneHash, maskPhone(phone), privacyAccepted ? now : null, dataOptIn ? 1 : 0, now).run();
  return { id, phone_hash: phoneHash, phone_mask: maskPhone(phone), privacy_accepted_at: privacyAccepted ? now : null, data_opt_in: dataOptIn ? 1 : 0, created_at: now };
}

export async function createSession(accountId: string) {
  const token = newSessionToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await database().prepare("INSERT INTO patient_sessions (token, account_id, expires_at) VALUES (?, ?, ?)").bind(token, accountId, expires).run();
  return { token, expires };
}

export async function sessionAccount(token: string | null) {
  if (!token) return null;
  const row = await database().prepare(
    "SELECT s.account_id, s.expires_at, a.phone_mask FROM patient_sessions s JOIN patient_accounts a ON a.id = s.account_id WHERE s.token = ?",
  ).bind(token).first<{ account_id: string; expires_at: string; phone_mask: string }>();
  if (!row) return null;
  if (Date.parse(row.expires_at) < Date.now()) return null;
  return row;
}

export async function saveChatMessage(accountId: string, role: "user" | "assistant", content: string, meta: string) {
  await database().prepare(
    "INSERT INTO patient_chat_messages (id, account_id, role, content, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), accountId, role, content.slice(0, 3000), meta.slice(0, 500), new Date().toISOString()).run();
}

export async function listChatMessages(accountId: string, limit = 40) {
  const { results } = await database().prepare(
    "SELECT role, content, meta, created_at FROM patient_chat_messages WHERE account_id = ? ORDER BY created_at DESC LIMIT ?",
  ).bind(accountId, limit).all<{ role: "user" | "assistant"; content: string; meta: string; created_at: string }>();
  return (results ?? []).reverse();
}

export async function upsertBinding(accountId: string, workspaceOwner: string, inviteCode: string, groupId: string, patientRecordId: string) {
  await database().prepare(
    `INSERT INTO patient_bindings (account_id, workspace_owner, invite_code, group_id, patient_record_id, bound_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET workspace_owner=excluded.workspace_owner, invite_code=excluded.invite_code, group_id=excluded.group_id, patient_record_id=excluded.patient_record_id, bound_at=excluded.bound_at`,
  ).bind(accountId, workspaceOwner, inviteCode, groupId, patientRecordId, new Date().toISOString()).run();
}

export async function getBinding(accountId: string) {
  return database().prepare("SELECT * FROM patient_bindings WHERE account_id = ?").bind(accountId).first<{
    workspace_owner: string;
    invite_code: string;
    group_id: string;
    patient_record_id: string;
  }>();
}

export async function listInbox(accountId: string) {
  const { results } = await database().prepare(
    "SELECT id, title, body, channel, status, created_at, read_at FROM patient_inbox WHERE account_id = ? ORDER BY created_at DESC LIMIT 50",
  ).bind(accountId).all();
  return results ?? [];
}

export async function pushInbox(accountId: string, title: string, body: string, channel: "in_app" | "sms", status: string) {
  await database().prepare(
    "INSERT INTO patient_inbox (id, account_id, title, body, channel, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), accountId, title, body.slice(0, 5000), channel, status, new Date().toISOString()).run();
}
