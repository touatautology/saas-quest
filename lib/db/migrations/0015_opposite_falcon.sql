CREATE TABLE "setting_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"category" varchar(50),
	"value_type" varchar(20) NOT NULL,
	"is_encrypted" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "setting_definitions_key_unique" UNIQUE("key")
);
