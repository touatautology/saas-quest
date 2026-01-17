CREATE TABLE "quests" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"category" varchar(50) NOT NULL,
	"prerequisite_quest_id" integer,
	"verification_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_quest_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"quest_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'locked' NOT NULL,
	"completed_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "user_quest_progress" ADD CONSTRAINT "user_quest_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_quest_progress" ADD CONSTRAINT "user_quest_progress_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;