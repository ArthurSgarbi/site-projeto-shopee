ALTER TABLE `products` ADD `weekly_ad_spend_cents` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `products` ADD `weekly_ad_revenue_cents` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
PRAGMA optimize;
