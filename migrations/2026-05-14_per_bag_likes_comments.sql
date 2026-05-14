-- Per-bag likes & comments migration
-- Run this in Supabase SQL Editor (Project > SQL > New query)
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT.

-- ============================================================
-- 1) bag_likes: one row per (bag_user_id, bag_id, liker_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS bag_likes (
  bag_user_id UUID        NOT NULL,
  bag_id      TEXT        NOT NULL DEFAULT '',
  liker_id    UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bag_user_id, bag_id, liker_id)
);

CREATE INDEX IF NOT EXISTS bag_likes_bag_idx   ON bag_likes (bag_user_id, bag_id);
CREATE INDEX IF NOT EXISTS bag_likes_liker_idx ON bag_likes (liker_id);

ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bag_likes_select_all" ON bag_likes;
CREATE POLICY "bag_likes_select_all"
  ON bag_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "bag_likes_insert_own" ON bag_likes;
CREATE POLICY "bag_likes_insert_own"
  ON bag_likes FOR INSERT WITH CHECK (auth.uid() = liker_id);

DROP POLICY IF EXISTS "bag_likes_delete_own" ON bag_likes;
CREATE POLICY "bag_likes_delete_own"
  ON bag_likes FOR DELETE USING (auth.uid() = liker_id);

-- Backfill from the legacy bags.liked_by[] column (only if it still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'bags' AND column_name = 'liked_by'
  ) THEN
    EXECUTE $sql$
      INSERT INTO bag_likes (bag_user_id, bag_id, liker_id)
      SELECT b.user_id, '', UNNEST(b.liked_by)
        FROM bags b
       WHERE b.liked_by IS NOT NULL
         AND array_length(b.liked_by, 1) > 0
      ON CONFLICT DO NOTHING
    $sql$;
  END IF;
END $$;

-- ============================================================
-- 2) comments: add bag_id column (legacy rows default to '')
-- ============================================================
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS bag_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS comments_bag_idx ON comments (bag_user_id, bag_id);

-- ============================================================
-- 3) Aggregation views (read-only, used by client for counts)
-- ============================================================
CREATE OR REPLACE VIEW bag_like_stats AS
  SELECT bag_user_id, bag_id, COUNT(*)::int AS like_count
    FROM bag_likes
   GROUP BY bag_user_id, bag_id;

CREATE OR REPLACE VIEW bag_comment_stats AS
  SELECT bag_user_id, bag_id, COUNT(*)::int AS comment_count
    FROM comments
   GROUP BY bag_user_id, bag_id;

GRANT SELECT ON bag_like_stats    TO anon, authenticated;
GRANT SELECT ON bag_comment_stats TO anon, authenticated;

-- ============================================================
-- 4) Drop the legacy RPCs and columns once the new code is live.
--    Uncomment when you're ready to fully cut over.
-- ============================================================
-- DROP FUNCTION IF EXISTS toggle_like(UUID, UUID);
-- DROP FUNCTION IF EXISTS increment_comment_count(UUID);
-- ALTER TABLE bags DROP COLUMN IF EXISTS like_count;
-- ALTER TABLE bags DROP COLUMN IF EXISTS liked_by;
-- ALTER TABLE bags DROP COLUMN IF EXISTS comment_count;
