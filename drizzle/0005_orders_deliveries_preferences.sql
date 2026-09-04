CREATE TABLE `admin_preferences` (
	`admin_id` integer PRIMARY KEY NOT NULL,
	`sidebar_order` text NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracking_code` text,
	`carrier` text NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`destination` text NOT NULL,
	`estimate` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_number`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deliveries_tracking_code_unique` ON `deliveries` (`tracking_code`);--> statement-breakpoint
CREATE INDEX `idx_deliveries_order_id` ON `deliveries` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`customer` text NOT NULL,
	`date` text NOT NULL,
	`total_cents` integer NOT NULL,
	`items` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);
