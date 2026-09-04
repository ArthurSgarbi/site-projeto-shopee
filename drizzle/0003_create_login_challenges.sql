CREATE TABLE `login_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_challenges_email_idx` ON `login_challenges` (`email`);
--> statement-breakpoint
CREATE INDEX `login_challenges_expires_at_idx` ON `login_challenges` (`expires_at`);
--> statement-breakpoint
PRAGMA optimize;
