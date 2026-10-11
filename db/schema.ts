// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
 owner: text("owner").primaryKey(),
 payload: text("payload").notNull(),
 revision: integer("revision").notNull().default(0),
 updatedAt: text("updated_at").notNull(),
});

export const patientAccounts = sqliteTable("patient_accounts", {
 id: text("id").primaryKey(),
 phoneHash: text("phone_hash").notNull().unique(),
 phoneMask: text("phone_mask").notNull(),
 privacyAcceptedAt: text("privacy_accepted_at"),
 dataOptIn: integer("data_opt_in").notNull().default(0),
 createdAt: text("created_at").notNull(),
});

export const patientSessions = sqliteTable("patient_sessions", {
 token: text("token").primaryKey(),
 accountId: text("account_id").notNull(),
 expiresAt: text("expires_at").notNull(),
});

export const patientBindings = sqliteTable("patient_bindings", {
 accountId: text("account_id").primaryKey(),
 workspaceOwner: text("workspace_owner").notNull(),
 inviteCode: text("invite_code").notNull(),
 groupId: text("group_id").notNull(),
 patientRecordId: text("patient_record_id").notNull(),
 boundAt: text("bound_at").notNull(),
});

export const patientChatMessages = sqliteTable("patient_chat_messages", {
 id: text("id").primaryKey(),
 accountId: text("account_id").notNull(),
 role: text("role").notNull(),
 content: text("content").notNull(),
 meta: text("meta").notNull().default(""),
 createdAt: text("created_at").notNull(),
});

export const patientInbox = sqliteTable("patient_inbox", {
 id: text("id").primaryKey(),
 accountId: text("account_id").notNull(),
 title: text("title").notNull(),
 body: text("body").notNull(),
 channel: text("channel").notNull(),
 status: text("status").notNull(),
 createdAt: text("created_at").notNull(),
 readAt: text("read_at"),
});
