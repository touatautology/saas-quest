-- 既存データをJSONB形式（{en: '...'} ）に変換しながらカラム型を変更

-- quests テーブル
ALTER TABLE "quests"
  ALTER COLUMN "title" TYPE jsonb USING jsonb_build_object('en', "title");

ALTER TABLE "quests"
  ALTER COLUMN "description" TYPE jsonb USING
    CASE
      WHEN "description" IS NOT NULL THEN jsonb_build_object('en', "description")
      ELSE NULL
    END;

-- quest_documents テーブル
ALTER TABLE "quest_documents"
  ALTER COLUMN "title" TYPE jsonb USING jsonb_build_object('en', "title");

ALTER TABLE "quest_documents"
  ALTER COLUMN "content" TYPE jsonb USING jsonb_build_object('en', "content");
