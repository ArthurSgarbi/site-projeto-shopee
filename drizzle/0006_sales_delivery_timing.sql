ALTER TABLE `deliveries` ADD `shipped_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `deliveries` ADD `delivered_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `product_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `destination` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `carrier` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `estimate` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_generated` integer DEFAULT false NOT NULL;
