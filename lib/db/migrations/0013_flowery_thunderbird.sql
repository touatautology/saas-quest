CREATE TABLE "tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"icon" varchar(50),
	"category" varchar(50),
	"external_url" varchar(500),
	"internal_path" varchar(200),
	"unlock_conditions" jsonb,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tools_slug_unique" UNIQUE("slug")
);
