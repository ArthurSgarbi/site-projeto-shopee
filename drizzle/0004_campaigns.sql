CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`budget_cents` integer NOT NULL,
	`spent_cents` integer DEFAULT 0 NOT NULL,
	`revenue_cents` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`conversions` integer DEFAULT 0 NOT NULL,
	`theme` text DEFAULT 'forest' NOT NULL,
	`status` text DEFAULT 'Ativa' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL
);
