ALTER TABLE "quest_documents" ADD COLUMN "book_id" integer;--> statement-breakpoint
ALTER TABLE "quest_documents" ADD COLUMN "chapter_id" integer;--> statement-breakpoint
ALTER TABLE "quest_documents" ADD CONSTRAINT "quest_documents_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_documents" ADD CONSTRAINT "quest_documents_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;