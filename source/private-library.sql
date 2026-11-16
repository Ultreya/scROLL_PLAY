-- Apply only to the app's private Supabase project. No personal songs belong in GitHub.
create table if not exists public.scroll_songs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,160}$'),
  name text not null check (char_length(name) between 1 and 200),
  artist text not null default '', genre text not null default 'Not listed',
  era text not null default '', decade text not null default 'Not listed',
  notes jsonb not null check (jsonb_typeof(notes) = 'array' and jsonb_array_length(notes) between 1 and 200000),
  note_count integer generated always as (jsonb_array_length(notes)) stored,
  hand_split integer not null default 0, score boolean not null default false,
  source text not null default 'upload' check (source in ('upload','shared')),
  shared_id text, played_at bigint not null default 0,
  original_path text, original_type text,
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
alter table public.scroll_songs enable row level security;
alter table public.scroll_songs force row level security;
revoke all on public.scroll_songs from anon;
grant select,insert,update,delete on public.scroll_songs to authenticated;
drop policy if exists own_songs_select on public.scroll_songs;
create policy own_songs_select on public.scroll_songs for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists own_songs_insert on public.scroll_songs;
create policy own_songs_insert on public.scroll_songs for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists own_songs_update on public.scroll_songs;
create policy own_songs_update on public.scroll_songs for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists own_songs_delete on public.scroll_songs;
create policy own_songs_delete on public.scroll_songs for delete to authenticated using ((select auth.uid())=user_id);
create index if not exists scroll_songs_recent on public.scroll_songs(user_id,played_at desc);
insert into storage.buckets(id,name,public,file_size_limit) values ('scroll-play-originals','scroll-play-originals',false,52428800) on conflict(id) do update set public=false;
drop policy if exists own_originals_select on storage.objects;
create policy own_originals_select on storage.objects for select to authenticated using (bucket_id='scroll-play-originals' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists own_originals_insert on storage.objects;
create policy own_originals_insert on storage.objects for insert to authenticated with check (bucket_id='scroll-play-originals' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists own_originals_update on storage.objects;
create policy own_originals_update on storage.objects for update to authenticated using (bucket_id='scroll-play-originals' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='scroll-play-originals' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists own_originals_delete on storage.objects;
create policy own_originals_delete on storage.objects for delete to authenticated using (bucket_id='scroll-play-originals' and (storage.foldername(name))[1]=(select auth.uid())::text);
