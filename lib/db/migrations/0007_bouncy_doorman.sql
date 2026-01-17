CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "chapter_id" integer;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;