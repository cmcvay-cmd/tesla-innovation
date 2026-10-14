-- Seen status and typing presence for chat.

alter table messages add column if not exists seen_at timestamptz;

create table if not exists typing (
  user_id text primary key,
  thread_user_id text not null,
  updated_at timestamptz not null default now()
);
