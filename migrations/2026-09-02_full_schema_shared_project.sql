-- Bag Creator — full schema, reconstructed from the client code for the move
-- into the shared Supabase project (cagyuhuzvannojeqkmun) after the original
-- dedicated project was retired. Fresh start: no data migrated.
--
-- Unlike the other tenants of the shared project (which are service-role
-- only), Bag Creator talks to the database directly from the browser with
-- the publishable key + Supabase Auth, so every table here carries real
-- RLS policies.

create table if not exists bags (
  user_id uuid primary key,
  display_name text,
  prefs jsonb not null default '{}'::jsonb,
  bag jsonb,
  settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table bags enable row level security;

drop policy if exists bags_select_public_or_own on bags;
create policy bags_select_public_or_own
  on bags for select
  using ((prefs ->> 'public')::boolean is true or (select auth.uid()) = user_id);

drop policy if exists bags_insert_own on bags;
create policy bags_insert_own
  on bags for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists bags_update_own on bags;
create policy bags_update_own
  on bags for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  bag_user_id uuid not null,
  bag_id text not null default '',
  author_id uuid not null,
  author_name text,
  text text not null,
  parent_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists comments_bag_idx on comments (bag_user_id, bag_id);

alter table comments enable row level security;

drop policy if exists comments_select_all on comments;
create policy comments_select_all
  on comments for select using (true);

drop policy if exists comments_insert_own on comments;
create policy comments_insert_own
  on comments for insert to authenticated
  with check ((select auth.uid()) = author_id);

create table if not exists bag_likes (
  bag_user_id uuid not null,
  bag_id text not null default '',
  liker_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (bag_user_id, bag_id, liker_id)
);

create index if not exists bag_likes_bag_idx on bag_likes (bag_user_id, bag_id);
create index if not exists bag_likes_liker_idx on bag_likes (liker_id);

alter table bag_likes enable row level security;

drop policy if exists bag_likes_select_all on bag_likes;
create policy bag_likes_select_all
  on bag_likes for select using (true);

drop policy if exists bag_likes_insert_own on bag_likes;
create policy bag_likes_insert_own
  on bag_likes for insert to authenticated
  with check ((select auth.uid()) = liker_id);

drop policy if exists bag_likes_delete_own on bag_likes;
create policy bag_likes_delete_own
  on bag_likes for delete to authenticated
  using ((select auth.uid()) = liker_id);

-- Aggregation views (security_invoker so they respect the base-table RLS;
-- both base tables are select-all anyway).
create or replace view bag_like_stats with (security_invoker = true) as
  select bag_user_id, bag_id, count(*)::int as like_count
    from bag_likes
   group by bag_user_id, bag_id;

create or replace view bag_comment_stats with (security_invoker = true) as
  select bag_user_id, bag_id, count(*)::int as comment_count
    from comments
   group by bag_user_id, bag_id;

grant select on bag_like_stats to anon, authenticated;
grant select on bag_comment_stats to anon, authenticated;
