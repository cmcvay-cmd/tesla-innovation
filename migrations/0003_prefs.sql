-- Shop details, per-model stakes, and profile photos.

alter table profiles add column if not exists avatar text not null default '';

alter table reservations add column if not exists buyer_name text not null default '';
alter table reservations add column if not exists phone text not null default '';
alter table reservations add column if not exists contact_email text not null default '';
alter table reservations add column if not exists city text not null default '';
alter table reservations add column if not exists pay_method text not null default 'cash';
alter table reservations add column if not exists term_months integer;

create table if not exists model_stakes (
  id serial primary key,
  user_id text not null,
  model_id text not null references models (id),
  amount_cents integer not null,
  apr_bps integer not null,
  horizon_months integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists model_stakes_user_idx on model_stakes (user_id);
