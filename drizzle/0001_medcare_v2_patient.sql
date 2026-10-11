CREATE TABLE `patient_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`phone_hash` text NOT NULL,
	`phone_mask` text NOT NULL,
	`privacy_accepted_at` text,
	`data_opt_in` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patient_accounts_phone_hash_unique` ON `patient_accounts` (`phone_hash`);
--> statement-breakpoint
CREATE TABLE `patient_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patient_bindings` (
	`account_id` text PRIMARY KEY NOT NULL,
	`workspace_owner` text NOT NULL,
	`invite_code` text NOT NULL,
	`group_id` text NOT NULL,
	`patient_record_id` text NOT NULL,
	`bound_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patient_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`meta` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patient_inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text
);
