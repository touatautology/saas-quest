CREATE TABLE "rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb,
	"type" varchar(20) NOT NULL,
	"value" integer DEFAULT 0,
	"icon_url" varchar(500),
	"condition_type" varchar(30) NOT NULL,
	"condition_config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rewards_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_currency" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"coins" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_currency_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reward_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_currency" ADD CONSTRAINT "user_currency_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;