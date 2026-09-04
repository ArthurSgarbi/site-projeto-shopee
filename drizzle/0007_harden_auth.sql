CREATE TABLE `auth_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` integer NOT NULL,
	`browser_hash` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`resends` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`last_sent_at` integer NOT NULL,
	`consumed_at` integer,
	`session_hash` text,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `auth_challenges_admin_id_unique` ON `auth_challenges` (`admin_id`);
--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`reset_at` integer NOT NULL
);

--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `last_seen_at` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `mfa_verified` integer DEFAULT 0 NOT NULL;
